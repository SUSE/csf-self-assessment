import type { Seal } from '../../schema';

/** One printable question line, whatever reading selected it. */
export type ReportRowModel = {
  key: string;
  question: string;
  meta: string;
  seal: Seal | null;
  flag: string | null;
};
