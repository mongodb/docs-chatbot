import "dotenv/config";
import { z } from "zod";
import { makeGenerateChildrenWithOpenAi } from "../generateChildren";
import { AzureOpenAI } from "mongodb-rag-core/openai";
import {
  DatabaseInfoNode,
  DatabaseUser,
  DatabaseUserNode,
  DatabaseUserSchema,
} from "./nodeTypes";

export const systemPrompt = `You are an experienced database administrator and organizational psychologist who specializes in modeling realistic user personas for enterprise systems. Given the database context, create diverse users who might interact with applications built on this database. Take into account specific user personas, jobs, roles, and backgrounds of the industry for a given database.
- Be sure to include industry-specifics to enrich the quality of the dataset.
Also include general jobs that would still be relevant for the database, with the balance toward industry-specific roles.
- Each user should have varying roles, expertise levels, and backgrounds that make sense for the database's domain.
- You can include both internal and external users, depending on the context.

Focus on creating realistic and diverse personas that would actually use this type of database. 

Create around 20 users.`;

export const generateDatabaseUsers = makeGenerateChildrenWithOpenAi<
  DatabaseInfoNode,
  DatabaseUserNode
>({
  makePromptMessages: async (parent) => [
    {
      role: "system",
      content: systemPrompt,
    },
    {
      role: "user",
      content: `Generate users for database with the following info:
${JSON.stringify(parent.data, null, 2)}`,
    },
  ],
  openAiClient: new AzureOpenAI({
    apiKey: process.env.OPENAI_API_KEY!,
    endpoint: process.env.OPENAI_ENDPOINT!,
    apiVersion: process.env.OPENAI_API_VERSION!,
  }),
  clientConfig: {
    model: "gpt-4o",
    temperature: 0.5,
    seed: 42,
  },
  response: {
    schema: z.array(DatabaseUserSchema),
    name: "generate_database_users",
    description: "Generate a list of realistic database users",
  },
});
