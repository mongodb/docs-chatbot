import { z } from "zod";
import { DatabaseMetadata } from "./getDatabaseMetadata";
import { LlmOptions } from "./LlmOptions";
import { getOpenAiFunctionResponse } from "./getOpenAiFunctionResponse";
import { prettyPrintMongoDbDocument } from "./prettyPrintMongoDbDocument";
import { OpenAI } from "mongodb-rag-core/openai";

const systemPrompt = `You are an expert MongoDB database architect. Your task is to analyze the provided database metadata and generate clear, concise descriptions.

Database Metadata:
- Database contains database name and information about the collections in the database
- Each collection includes:
  - Schema information
  - Truncated sample documents
  - Index definitions

Instructions:
1. Analyze the schema, sample documents, and indexes for each collection
2. Generate a high-level description of the entire database's purpose
3. For each collection, provide a clear description of:
   - What kind of data it stores
   - Its role in the overall database
   - Key relationships with other collections
4. Order collections logically, starting with the most fundamental ones that others depend on.`;

const functionName = "get_high_level_db_descriptions";

/**
  Creates a Zod schema for database descriptions based on the actual collections in the database
 */
function createHighLevelDbDescriptionsSchema(
  databaseMetadata: DatabaseMetadata
) {
  const collectionNames = databaseMetadata.collections.map(
    (metadata) => metadata.collectionName
  );
  // Create a record schema where each key must be one of the collection names
  const collectionDescriptionsSchema = z.array(
    z.object({
      collectionName: z.enum(collectionNames as [string, ...string[]]),
      description: z.string(),
    })
  );

  return z.object({
    databaseDescription: z.string(),
    collectionDescriptions: collectionDescriptionsSchema,
  });
}

/**
  Get high-level descriptions of the database and its collections.
 */
export async function generateHighLevelDbDescriptions(
  databaseMetadata: DatabaseMetadata,
  llmOptions: LlmOptions
) {
  const schema = createHighLevelDbDescriptionsSchema(databaseMetadata);

  const messages = [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: `Database information:
${prettyPrintMongoDbDocument(databaseMetadata)}`,
    },
  ] satisfies OpenAI.ChatCompletionMessageParam[];
  return await getOpenAiFunctionResponse({
    messages,
    llmOptions,
    schema,
    functionName,
    functionDescription:
      "Generate high-level descriptions of the database and its collections based on the provided metadata",
  });
}
