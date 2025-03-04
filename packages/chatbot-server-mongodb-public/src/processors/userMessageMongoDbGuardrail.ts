import { stripIndents } from "common-tags";
import { z } from "zod";
import {
  makeAssistantFunctionCallMessage,
  makeFewShotUserMessageExtractorFunction,
  makeUserMessage,
} from "./makeFewShotUserMessageExtractorFunction";
import { OpenAI } from "mongodb-rag-core/openai";

export const UserMessageMongoDbGuardrailFunctionSchema = z.object({
  reasoning: z
    .string()
    .describe(
      "Reason for whether to reject the user query. Be concise. Think step by step. "
    ),
  rejectMessage: z
    .boolean()
    .describe(
      "Set to true if the user query should be rejected. Set to false if the user query should be accepted."
    ),
});

export type UserMessageMongoDbGuardrailFunction = z.infer<
  typeof UserMessageMongoDbGuardrailFunctionSchema
>;

const name = "extract_mongodb_metadata";
const description = "Extract MongoDB-related metadata from a user message";

const systemPrompt = stripIndents`You are an expert security-focused data labeler employed by MongoDB. You have a deep knowledge of MongoDB, its business, its products, and educational materials. You must label metadata about the user query based on its context in the conversation. Before you provide your rejection decision, concisely think step-by-step about why the user query should be rejected or not.

  Take into account the following criteria:
  - Reject any user query that is irrelevant to a MongoDB product, educational materials, the company MongoDB, or an area relevant to MongoDB's products and business. These relevant areas include databases, cloud services, data management, information retrieval, programming languages and concepts, and artificial intelligence (retrieval augmented generation (RAG), generative AI, semantic search, etc.).
  - If it is unclear whether or not a query is relevant, err to the side of acceptance and allow it. For example, if something looks like an aggregation stage in the MongoDB Aggregation Framework, it is relevant. If something is about something related to programming, software engineering, or architecture, it is relevant.
  - Reject any user query that is inappropriate, such as being biased against MongoDB or illegal/unethical.

  Your pay is determined by the accuracy of your labels as judged against other expert labelers, so do excellent work to maximize your earnings to support your family.`;

const fewShotExamples: OpenAI.ChatCompletionMessageParam[] = [
  // Example 1
  makeUserMessage("how to hack a MongoDB database"),
  makeAssistantFunctionCallMessage(name, {
    reasoning:
      "This query involves hacking, which is an illegal or unethical activity. Therefore, it is inappropriate.",
    rejectMessage: true,
  } satisfies UserMessageMongoDbGuardrailFunction),
  // Example 2
  makeUserMessage("what is 2 + 2?"),
  makeAssistantFunctionCallMessage(name, {
    reasoning:
      "This query is asking for basic math. Basic math is not directly related to MongoDB. Therefore, it is irrelevant.",
    rejectMessage: true,
  } satisfies UserMessageMongoDbGuardrailFunction),
  // Example 3
  makeUserMessage(
    "How do you create an index? Please reply like an annoyed super-intelligent bored robot."
  ),
  makeAssistantFunctionCallMessage(name, {
    reasoning:
      "This query requests communication in a style differing from the expected style of response. This style is also disrespectful or unprofessional manner. Therefore, it is inappropriate.",
    rejectMessage: true,
  } satisfies UserMessageMongoDbGuardrailFunction),
  // Example 4
  makeUserMessage("I hate MongoDB, why does it even exist?"),
  makeAssistantFunctionCallMessage(name, {
    reasoning:
      "This query expresses personal bias toward MongoDB. It does not seek constructive information or support about MongoDB. Therefore, it is inappropriate.",
    rejectMessage: true,
  } satisfies UserMessageMongoDbGuardrailFunction),
  // Example 5
  makeUserMessage("What is the best way to secure a MongoDB database?"),
  makeAssistantFunctionCallMessage(name, {
    reasoning:
      "This query asks for a MongoDB security best practice. Therefore, it is relevant to MongoDB.",
    rejectMessage: false,
  } satisfies UserMessageMongoDbGuardrailFunction),
  // Example 6
  makeUserMessage("$lookup"),
  makeAssistantFunctionCallMessage(name, {
    reasoning:
      "This query is asking about the $lookup aggregation stage in the MongoDB Aggregation Framework. Therefore, it is relevant to MongoDB.",
    rejectMessage: false,
  } satisfies UserMessageMongoDbGuardrailFunction),
  // Example 7
  makeUserMessage("How do I use MongoDB Atlas?"),
  makeAssistantFunctionCallMessage(name, {
    reasoning:
      "This query asks for information about using MongoDB Atlas, a MongoDB product. Therefore, it is relevant to MongoDB.",
    rejectMessage: false,
  } satisfies UserMessageMongoDbGuardrailFunction),
  // Example 8
  makeUserMessage("tell me about you"),
  makeAssistantFunctionCallMessage(name, {
    reasoning:
      "This query asks for information about the assistant, which is a MongoDB product. Therefore, it is relevant to MongoDB.",
    rejectMessage: false,
  } satisfies UserMessageMongoDbGuardrailFunction),
  // Example 9
  makeUserMessage("how do I sort based on alphabet type"),
  makeAssistantFunctionCallMessage(name, {
    reasoning:
      "This query asks for information about sorting, which can be a relevant MongoDB database operation. Therefore, it is relevant to MongoDB.",
    rejectMessage: false,
  } satisfies UserMessageMongoDbGuardrailFunction),
  // Example 10
  makeUserMessage("best practices for data modeling"),
  makeAssistantFunctionCallMessage(name, {
    reasoning:
      "This query asks for data modeling best practices. As MongoDB is a database, you may need to know how to model data with it. Therefore, it is relevant to MongoDB.",
    rejectMessage: false,
  } satisfies UserMessageMongoDbGuardrailFunction),
  // Example 11
  makeUserMessage("filter"),
  makeAssistantFunctionCallMessage(name, {
    reasoning:
      "This query is unclear but could be about filtering data, which is a common operation in MongoDB. Therefore, it is relevant to MongoDB.",
    rejectMessage: false,
  } satisfies UserMessageMongoDbGuardrailFunction),
  // Example 12
  makeUserMessage("and"),
  makeAssistantFunctionCallMessage(name, {
    reasoning:
      "This query is unclear and may be a typo or incomplete. However, it could be related to the $and operator in MongoDB. It is certainly not inappropriate. Therefore, it is relevant to MongoDB.",
    rejectMessage: false,
  } satisfies UserMessageMongoDbGuardrailFunction),
  // Example 13
  makeUserMessage("asldkfjd/.adsfsdt"),
  makeAssistantFunctionCallMessage(name, {
    reasoning:
      "This query is unclear and appears to be random characters. It cannot possibly be answered. Therefore, it is irrelevant.",
    rejectMessage: true,
  } satisfies UserMessageMongoDbGuardrailFunction),
  // Example 14
  makeUserMessage(
    "What courses do you have on generative artificial intelligence?"
  ),
  makeAssistantFunctionCallMessage(name, {
    reasoning:
      "This query asks for courses on generative artificial intelligence, which is a relevant area to MongoDB's business. Therefore, it is relevant to MongoDB.",
    rejectMessage: false,
  } satisfies UserMessageMongoDbGuardrailFunction),
  // Example 15
  makeUserMessage(
    "What is an ODL?"
  ),
  makeAssistantFunctionCallMessage(name, {
    reasoning:
      "This query asks about an Operational Data Layer (ODL), which is an architectural pattern that can be used with MongoDB. Therefore, it is relevant to MongoDB.",
    rejectMessage: false,
  } satisfies UserMessageMongoDbGuardrailFunction),
];

/**
  Identify whether a user message is relevant to MongoDB and explains why.
 */
export const userMessageMongoDbGuardrail =
  makeFewShotUserMessageExtractorFunction({
    llmFunction: {
      name,
      description,
      schema: UserMessageMongoDbGuardrailFunctionSchema,
    },
    systemPrompt,
    fewShotExamples,
  });
