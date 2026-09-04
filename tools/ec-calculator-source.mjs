// Reads docs/eu-csf/calculator.xlsx with the Node standard library alone — an
// .xlsx is a ZIP of XML, so `node:zlib` and a central-directory walk are enough.
// The product never parses a spreadsheet. this module exists
// only for the one-off conversion in tools/ec-calculator-workbook.mjs, and
// docs/eu-csf/calculator.xlsx is read-only.

import { readFileSync } from 'node:fs';
import { inflateRawSync } from 'node:zlib';

// One imported rung, as the spreadsheet holds it.
// @typedef {{ row: number, text: string, points: number, seal: number, selected: boolean }} SourceRung
// `why` is null when the source's B cell carries no ' - ' / ' – ' separator.
// @typedef {{ id: string, text: string, why: string|null, rungs: SourceRung[] }} SourceQuestion
// @typedef {{ id: string, name: string, description: string, weight: number, questions: SourceQuestion[] }} SourceObjective
// @typedef {{ objectives: SourceObjective[], fictitiousNote: string }} SourceModel

// The eight objective header rows of the single worksheet, in sheet order —
// read off the E1 formula `((D4*E4+D45*E45+…+D231*E231))/1000`.
export const OBJECTIVE_HEADER_ROWS = [4, 45, 76, 102, 133, 169, 195, 231];

// The last row the instrument occupies.
export const LAST_ROW = 254;

// The seven rows that carry a SEAL tag with no readable text (spec §7). Not
// rungs; dropped, and the drop is declared in the imported front sheet.
export const DROPPED_ROWS = [7, 17, 31, 33, 38, 48, 49];

// Locate the end-of-central-directory record, then walk the central directory.
function readZipEntries(buffer) {
  let eocd = -1;
  for (let i = buffer.length - 22; i >= 0; i -= 1) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('not a zip archive: no end-of-central-directory record');

  const count = buffer.readUInt16LE(eocd + 10);
  let offset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();
  for (let i = 0; i < count; i += 1) {
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const nameLen = buffer.readUInt16LE(offset + 28);
    const extraLen = buffer.readUInt16LE(offset + 30);
    const commentLen = buffer.readUInt16LE(offset + 32);
    const localHeaderOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLen);
    entries.set(name, { method, compressedSize, localHeaderOffset });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

function readMember(buffer, entry) {
  const local = entry.localHeaderOffset;
  const nameLen = buffer.readUInt16LE(local + 26);
  const extraLen = buffer.readUInt16LE(local + 28);
  const start = local + 30 + nameLen + extraLen;
  const raw = buffer.subarray(start, start + entry.compressedSize);
  return (entry.method === 8 ? inflateRawSync(raw) : raw).toString('utf8');
}

// `&amp;` must be decoded last, or `&amp;lt;` would decode twice.
function unescapeXml(text) {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
    .replace(/&amp;/g, '&');
}

function readSharedStrings(xml) {
  const strings = [];
  for (const si of xml.match(/<si\b[^>]*>[\s\S]*?<\/si>/g) ?? []) {
    let text = '';
    for (const t of si.match(/<t\b[^>]*?(?:\/>|>([\s\S]*?)<\/t>)/g) ?? []) {
      const inner = /<t\b[^>]*>([\s\S]*?)<\/t>/.exec(t);
      if (inner) text += unescapeXml(inner[1]);
    }
    strings.push(text);
  }
  return strings;
}

// Rows → column letter → cell text, from `xl/worksheets/sheet1.xml`. Absent and
// value-less cells are absent from the inner map. Shared strings resolved.
export function readSheet(xlsxPath) {
  const buffer = readFileSync(xlsxPath);
  const entries = readZipEntries(buffer);
  const shared = entries.has('xl/sharedStrings.xml')
    ? readSharedStrings(readMember(buffer, entries.get('xl/sharedStrings.xml')))
    : [];
  const sheet = readMember(buffer, entries.get('xl/worksheets/sheet1.xml'));

  // @type {Record<number, Record<string, string>>}
  const rows = {};
  for (const rowXml of sheet.match(/<row\b[^>]*>[\s\S]*?<\/row>/g) ?? []) {
    const rowNumber = Number(/<row\b[^>]*?\br="(\d+)"/.exec(rowXml)?.[1]);
    if (!Number.isFinite(rowNumber)) continue;
    // @type {Record<string, string>}
    const cells = {};
    for (const [, attrs, body] of rowXml.matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const ref = /\br="([A-Z]+)\d+"/.exec(attrs)?.[1];
      if (!ref || body === undefined) continue;
      const value = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1];
      if (value === undefined) continue;
      cells[ref] = / t="s"/.test(attrs) ? shared[Number(value)] : unescapeXml(value);
    }
    rows[rowNumber] = cells;
  }
  return rows;
}

function clean(text) {
  return text.replace(/\u00a0/g, ' ').trim();
}

// @returns {SourceModel}
export function extractSource(xlsxPath) {
  const rows = readSheet(xlsxPath);

  const objectives = OBJECTIVE_HEADER_ROWS.map((headerRow, index) => {
    const header = rows[headerRow];
    const name = clean(header.A);
    // @type {SourceObjective}
    const objective = {
      id: name.split(/\s+/)[0],
      name,
      description: clean(header.B ?? ''),
      weight: Math.round(Number(header.D) * 100),
      questions: [],
    };

    const end = OBJECTIVE_HEADER_ROWS[index + 1] ?? LAST_ROW + 1;
    for (let row = headerRow + 1; row < end; row += 1) {
      const cells = rows[row];
      if (!cells || DROPPED_ROWS.includes(row)) continue;

      if (cells.A !== undefined && cells.B !== undefined) {
        const prompt = clean(cells.B);
        const split = / [-–] /.exec(prompt);
        objective.questions.push({
          id: `${objective.id}.${clean(cells.A)}`,
          text: split ? prompt.slice(0, split.index) : prompt,
          why: split ? prompt.slice(split.index + split[0].length) : null,
          rungs: [],
        });
      }

      const question = objective.questions[objective.questions.length - 1];
      if (!question || cells.C === undefined) continue;
      question.rungs.push({
        row,
        text: clean(cells.C).replace(/^\s*\d+\.\s*/, ''),
        points: Number(cells.D),
        seal: Number(cells.F),
        selected: cells.E !== undefined,
      });
    }
    return objective;
  });

  return { objectives, fictitiousNote: clean(rows[OBJECTIVE_HEADER_ROWS[0]].I) };
}
