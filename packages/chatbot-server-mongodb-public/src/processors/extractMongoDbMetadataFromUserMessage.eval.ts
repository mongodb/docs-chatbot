import OpenAI from "openai";
import {
  extractMongoDbMetadataFromUserMessage,
  ExtractMongoDbMetadataFunction,
} from "./extractMongoDbMetadataFromUserMessage";
import { strict as assert } from "assert";
import { Eval } from "braintrust";
import { Scorer } from "autoevals";
type ExtractMongoDbMetadataEvalCaseTag =
  | "atlas"
  | "atlas_search"
  | "atlas_vector_search"
  | "change_streams"
  | "indexes"
  | "driver"
  | "pymongo"
  | "python";
interface ExtractMongoDbMetadataEvalCase {
  name: string;
  input: string;
  expected: ExtractMongoDbMetadataFunction;
  tags?: ExtractMongoDbMetadataEvalCaseTag[];
}

const evalCases: ExtractMongoDbMetadataEvalCase[] = [
  {
    name: "should identify MongoDB Atlas Search",
    input: "Does atlas search support copy to fields",
    expected: {
      mongoDbProduct: "Atlas Search",
    } as ExtractMongoDbMetadataFunction,
    tags: ["atlas", "atlas_search"],
  },
  {
    name: "should identify aggregation stage",
    input: "$merge",
    expected: {
      mongoDbProduct: "Aggregation Framework",
    } as ExtractMongoDbMetadataFunction,
  },
  {
    name: "should know pymongo is python driver",
    input: "pymongo insert data",
    expected: {
      programmingLanguage: "python",
      mongoDbProduct: "Driver",
    } as ExtractMongoDbMetadataFunction,
    tags: ["pymongo", "driver", "python"],
  },
  {
    name: "should identify MongoDB Atlas",
    input: "how to create a new cluster atlas",
    expected: {
      mongoDbProduct: "MongoDB Atlas",
    } as ExtractMongoDbMetadataFunction,
    tags: ["atlas"],
  },
  {
    name: "should know atlas billing",
    input: "how do I see my bill in atlas",
    expected: {
      mongoDbProduct: "MongoDB Atlas",
    } as ExtractMongoDbMetadataFunction,
    tags: ["atlas"],
  },
  {
    name: "should be aware of vector search product",
    input: "how to use vector search",
    expected: {
      mongoDbProduct: "Atlas Vector Search",
    } as ExtractMongoDbMetadataFunction,
    tags: ["atlas", "atlas_vector_search"],
  },
  {
    name: "should know change streams",
    input:
      "how to open a change stream watch on a database and filter the stream",
    expected: {
      mongoDbProduct: "MongoDB",
      programmingLanguage: "javascript",
    } as ExtractMongoDbMetadataFunction,
    tags: ["change_streams"],
  },
  {
    name: "",
    input:
      "How do I choose the order of fields when creating a compound index?",
    expected: {
      mongoDbProduct: "MongoDB",
      programmingLanguage: "javascript",
    } as ExtractMongoDbMetadataFunction,
    tags: ["indexes"],
  },
];
const ProductNameCorrect: Scorer<
  Awaited<ReturnType<typeof extractMongoDbMetadataFromUserMessage>>,
  unknown
> = (args) => {
  return {
    name: "ProductNameCorrect",
    score: args.expected?.mongoDbProduct === args.output.mongoDbProduct ? 1 : 0,
  };
};
const ProgrammingLanguageCorrect: Scorer<
  Awaited<ReturnType<typeof extractMongoDbMetadataFromUserMessage>>,
  unknown
> = (args) => {
  return {
    name: "ProgrammingLanguageCorrect",
    score:
      args.expected?.programmingLanguage === args.output.programmingLanguage
        ? 1
        : 0,
  };
};
const openAiClient = new OpenAI({ apiKey: process.env.OPENAI_OPENAI_API_KEY });
const model = "gpt-4o-mini";
assert(model, "OPENAI_CHAT_COMPLETION_DEPLOYMENT must be set");
Eval("extract-mongodb-metadata", {
  data: evalCases,
  experimentName: model,
  metadata: {
    description:
      "Evaluates whether the MongoDB user message guardrail is working correctly.",
    model,
  },
  maxConcurrency: 3,
  timeout: 20000,
  async task(input) {
    try {
      return await extractMongoDbMetadataFromUserMessage({
        openAiClient,
        model,
        userMessageText: input,
      });
    } catch (error) {
      console.log(`Error evaluating input: ${input}`);
      console.log(error);
      throw error;
    }
  },
  scores: [ProductNameCorrect, ProgrammingLanguageCorrect],
});
