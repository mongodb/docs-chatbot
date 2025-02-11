import type { SomeArtifact } from "./artifact";
import type {
  Change,
  ClassifiedChange,
  ChangelogClassification,
} from "./change";
import { loggerSchema } from "./logger";
import { z } from "zod";

export const versionRangeSchema = z.object({
  current: z.string(),
  previous: z.string(),
});

export type VersionRange = z.infer<typeof versionRangeSchema>;

export const projectInfoSchema = z.object({
  /**
   The name of the project
   */
  name: z.string(),
  /**
   A description of what the project does and its purpose
   */
  description: z.string(),
});

export type ProjectInfo = z.infer<typeof projectInfoSchema>;

export const configSchema = z.object({
  /**
   Information about the project
   */
  project: projectInfoSchema,
  /**
   A function that fetches artifacts for a release.
   */
  fetchArtifacts: z
    .function()
    .args(versionRangeSchema)
    .returns(z.promise(z.array(z.custom<SomeArtifact>()))),
  /**
   A function that summarizes a given release artifact.
   */
  summarizeArtifact: z
    .function()
    .args(z.custom<SomeArtifact>())
    .returns(z.promise(z.string())),
  /**
   A function that extracts changes from a given release artifact.
   */
  extractChanges: z
    .function()
    .args(z.custom<SomeArtifact>())
    .returns(z.promise(z.array(z.custom<Change>()))),
  /**
   A function that classifies a change.
   */
  classifyChange: z
    .function()
    .args(z.custom<Change>())
    .returns(z.promise(z.custom<ChangelogClassification>())),
  /**
   A function that includes (i.e. returns true) or excludes (returns false) changes
   from the changelog based on their classification or other metadata.
   */
  filterChange: z
    .function()
    .args(z.custom<ClassifiedChange>())
    .returns(z.boolean()),
  /**
   Logger instance for recording progress and debugging information
   */
  logger: loggerSchema.optional(),
});

export type Config = z.infer<typeof configSchema>;

// If you need individual function types, derive them from the schema
export type FetchArtifacts = Config["fetchArtifacts"];
export type SummarizeArtifact = Config["summarizeArtifact"];
export type ExtractChanges = Config["extractChanges"];
export type ClassifyChange = Config["classifyChange"];
export type FilterChange = Config["filterChange"];

export function createConfig(config: Config): Partial<Config> {
  return configSchema.partial().parse(config);
}

export function validateConfig(config: unknown): Config {
  return configSchema.parse(config);
}

export async function loadConfigFile(path: string): Promise<Config> {
  const { default: configModule } = (await import(path)) as { default: Config };
  return validateConfig(configModule);
}
