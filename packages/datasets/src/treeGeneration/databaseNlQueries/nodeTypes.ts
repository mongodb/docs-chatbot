import { z } from "zod";
import { GenerationNode, WithParentNode } from "../GenerationNode";

export const DatabaseInfoSchema = z.object({
  name: z.string().describe("Name of the database"),
  description: z.string().describe("Brief description of the database"),
  latestDate: z.date().describe("Latest date in the database"),
  collections: z.array(
    z.object({
      name: z.string(),
      description: z.string(),
      schema: z.any(),
      examples: z.array(z.any()),
      indexes: z
        .array(
          z.object({
            description: z.string().optional(),
            name: z.string(),
            key: z.any(),
          })
        )
        .describe("Indexes on the collection."),
    })
  ),
});

export type DatabaseInfo = z.infer<typeof DatabaseInfoSchema>;

export type DatabaseInfoNode = WithParentNode<
  GenerationNode<DatabaseInfo>,
  null
>;

export const DatabaseUserSchema = z.object({
  name: z.string().describe("Full name of the database user"),
  jobTitle: z.string().describe("Current professional role or position"),
  description: z.string().describe("Brief bio or background of the user"),
  department: z
    .string()
    .describe("Organizational department or team the user belongs to"),
  expertise: z
    .array(z.string())
    .describe("List of technical skills or domain knowledge areas"),
  yearsOfExperience: z
    .number()
    .describe("Total years of relevant professional experience"),
});

export type DatabaseUser = z.infer<typeof DatabaseUserSchema>;

export type DatabaseUserNode = WithParentNode<
  GenerationNode<DatabaseUser>,
  DatabaseInfoNode
>;

// Define the schema for a database use case
export const DatabaseUseCaseSchema = z.object({
  title: z.string().describe("Short title describing the use case"),
  description: z
    .string()
    .describe(
      "Detailed description of what information the user needs and why"
    ),
  frequency: z
    .enum(["daily", "weekly", "monthly", "occasionally"])
    .describe("How often the user needs this information"),
  complexity: z
    .enum(["simple", "moderate", "complex"])
    .describe("Complexity level of the information need"),
  dataNeeded: z
    .array(z.string())
    .describe("Types of data or information required for this use case"),
});

export type DatabaseUseCase = z.infer<typeof DatabaseUseCaseSchema>;

export type UseCaseNode = WithParentNode<
  GenerationNode<DatabaseUseCase>,
  DatabaseUserNode
>;

export const NaturalLanguageQuerySchema = z.object({
  query: z
    .string()
    .describe("The natural language query text that a user might ask"),
  intent: z.string().describe("The underlying intent or purpose of the query"),
  expectedResults: z
    .string()
    .describe("Description of what results the user expects to see"),
  complexity: z
    .enum(["simple", "moderate", "complex"])
    .describe("Complexity level of the query."),
  variations: z
    .array(z.string())
    .describe("Alternative phrasings of the same query. At most three."),
  context: z
    .string()
    .describe("Additional context that might help understand the query"),
  entities: z
    .array(z.string())
    .describe(
      "Key entities (like movie titles, actor names, etc.) mentioned in the query"
    ),
});

export type NaturalLanguageQuery = z.infer<typeof NaturalLanguageQuerySchema>;

export type DatabaseNlQueryNode = WithParentNode<
  GenerationNode<NaturalLanguageQuery>,
  UseCaseNode
>;

export const DatabaseCodeSchema = z.object({
  queryPlan: z.string().describe("Plan for executing the code"),
  code: z.string().describe("Executable code snippet"),
  language: z.string().describe("Programming language used in the code"),
});

export type DatabaseCode = z.infer<typeof DatabaseCodeSchema>;

export type DatabaseCodeNode = WithParentNode<
  GenerationNode<DatabaseCode>,
  DatabaseNlQueryNode
>;
