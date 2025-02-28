import "dotenv/config";
import { EvalCase, Eval, EvalScorer } from "mongodb-rag-core/braintrust";
import {
  CodeExampleClassification,
  makeClassifyCodeExampleDocsTeam,
} from "./classifyCodeExampleDocsTeam.js";
import {
  assertEnvVars,
  Classification,
  CORE_OPENAI_CHAT_COMPLETION_ENV_VARS,
} from "mongodb-rag-core";
import { AzureOpenAI } from "mongodb-rag-core/openai";

const {
  OPENAI_API_KEY,
  OPENAI_API_VERSION,
  OPENAI_CHAT_COMPLETION_DEPLOYMENT,
  OPENAI_ENDPOINT,
} = assertEnvVars(CORE_OPENAI_CHAT_COMPLETION_ENV_VARS);

type ClassifyCodeExampleEvalCaseInput = {
  text: string;
};

type ClassifyCodeExampleEvalCaseOutput = Classification;

type ClassifyCodeExampleEvalCaseExpected = CodeExampleClassification;

type ClassifyCodeExampleEvalCase = EvalCase<
  ClassifyCodeExampleEvalCaseInput,
  ClassifyCodeExampleEvalCaseExpected,
  Record<string, unknown> | undefined
>;

// TODO: add eval cases
const evalCases = [
  {
    input: {
      text: `\`\`\`ruby
puts "Hello, World!"
\`\`\``,
    },
    expected: "unknown",
  },
] satisfies ClassifyCodeExampleEvalCase[];

const isCorrectClassification: EvalScorer<
  ClassifyCodeExampleEvalCaseInput,
  ClassifyCodeExampleEvalCaseOutput,
  ClassifyCodeExampleEvalCaseExpected
> = function ({ output, expected }) {
  return {
    name: "CorrectClassification",
    score: output.type === expected ? 1 : 0,
  };
};

const classifyCodeExample = makeClassifyCodeExampleDocsTeam({
  model: OPENAI_CHAT_COMPLETION_DEPLOYMENT,
  openAiClient: new AzureOpenAI({
    endpoint: OPENAI_ENDPOINT,
    apiKey: OPENAI_API_KEY,
    apiVersion: OPENAI_API_VERSION,
  }),
});

Eval("classify-code-example-docs-team", {
  maxConcurrency: 10,
  experimentName: "classify-code-example",
  data: evalCases,
  async task(input) {
    const { text } = input;

    const { classification } = await classifyCodeExample({ input: text });

    return classification;
  },
  scores: [isCorrectClassification],
});
