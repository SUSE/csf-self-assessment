export type DetectedFileType = 'workbook' | 'workbook-assessment' | 'assessment' | 'unknown';
export type SchemaVersion = '1.0' | '2.0' | 'unknown';

export type SniffResult = {
  fileType: DetectedFileType;
  version: SchemaVersion;
  hasLegacyGrain: boolean;
};

export type MigrationStats = {
  detectedType: DetectedFileType;
  fromVersion: SchemaVersion;
  toVersion: '2.0';
  questionsMigrated: number;
  clashesUpdated: number;
};

export type MigrationSuccess = {
  ok: true;
  migrated: unknown;
  stats: MigrationStats;
};

export type MigrationFailure = {
  ok: false;
  error: string;
};

export type MigrationResult = MigrationSuccess | MigrationFailure;
