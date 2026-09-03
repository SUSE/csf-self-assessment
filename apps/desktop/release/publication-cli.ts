import { fileURLToPath } from 'node:url';

import { z } from 'zod';

import { fail } from './cli-fail.js';
import {
  CommitShaSchema,
  GitHubRepositorySchema,
  ReleaseTagSchema,
} from './contract.js';
import {
  createGhRunner,
  createVerifiedDraft,
  publishVerifiedDraft,
} from './publication.js';

const DraftArgumentsSchema = z.tuple([
  z.literal('draft'),
  z.string().min(1),
  z.string().min(1),
  GitHubRepositorySchema,
  ReleaseTagSchema,
  CommitShaSchema,
]);
const PublishArgumentsSchema = z.tuple([
  z.literal('publish'),
  z.string().min(1),
  GitHubRepositorySchema,
  ReleaseTagSchema,
  CommitShaSchema,
]);
const ArgumentsSchema = z.union([
  DraftArgumentsSchema,
  PublishArgumentsSchema,
]);
const USAGE =
  'Usage: publication-cli.ts draft <candidate-directory> <notes-file> <repository> <tag> <commit-sha> | publish <candidate-directory> <repository> <tag> <commit-sha>\n';

async function main(): Promise<void> {
  const parsed = ArgumentsSchema.safeParse(process.argv.slice(2));
  if (!parsed.success) {
    process.stderr.write(USAGE);
    process.exitCode = 1;
    return;
  }
  const workingDirectory = fileURLToPath(new URL('../../../', import.meta.url));
  const run = createGhRunner({
    executable: 'gh',
    workingDirectory,
    environment: process.env,
  });

  if (parsed.data[0] === 'draft') {
    const [, candidateDirectory, notesFile, repository, expectedTag, expectedCommit] =
      parsed.data;
    await createVerifiedDraft(
      {
        candidateDirectory,
        notesFile,
        repository,
        expectedTag,
        expectedCommit,
      },
      run,
    );
    return;
  }

  const [, candidateDirectory, repository, expectedTag, expectedCommit] =
    parsed.data;
  await publishVerifiedDraft(
    {
      candidateDirectory,
      repository,
      expectedTag,
      expectedCommit,
    },
    run,
  );
}

void main().catch(fail);
