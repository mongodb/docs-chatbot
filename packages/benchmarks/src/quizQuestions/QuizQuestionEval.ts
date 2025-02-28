import {
  Eval,
  EvalCase,
  EvalScorer,
  EvalTask,
} from "mongodb-rag-core/braintrust";
import { OpenAI } from "mongodb-rag-core/openai";
import { QuizQuestionData } from "./QuizQuestionData";
import { strict as assert } from "assert";
import {
  makeHelmQuizQuestionPrompt,
  MakeHelmQuizQuestionPromptParams,
} from "./makeHelmQuizQuestionPrompt";

export type QuizQuestionEvalCaseInput = Pick<
  QuizQuestionData,
  "questionText" | "answers" | "questionType"
>;

export type QuizQuestionTag = string;

export type QuizQuestionMetadata = Pick<
  QuizQuestionData,
  "contentTitle" | "explanation" | "title"
>;

export interface QuizQuestionEvalCase
  extends EvalCase<
    QuizQuestionEvalCaseInput,
    QuizQuestionTaskExpected,
    QuizQuestionMetadata
  > {
  tags?: QuizQuestionTag[];
}

export type QuizQuestionTaskOutput = string;

export type QuizQuestionTaskExpected = string;

export type QuizQuestionEvalTask = EvalTask<
  QuizQuestionEvalCaseInput,
  QuizQuestionTaskOutput
>;

interface MakeQuizQuestionTaskParams {
  openaiClient: OpenAI;
  llmOptions: QuizQuestionLlmOptions;
  model: string;
  promptOptions: QuizQuestionPromptOptions;
}

function makeQuizQuestionTask({
  openaiClient,
  model,
  llmOptions,
  promptOptions,
}: MakeQuizQuestionTaskParams): QuizQuestionEvalTask {
  return async function (input) {
    const promptMessages = makeHelmQuizQuestionPrompt({
      quizQuestion: input,
      ...promptOptions,
    }) satisfies OpenAI.Chat.Completions.ChatCompletionMessageParam[];
    const res = await openaiClient.chat.completions.create({
      model,
      messages: promptMessages,
      stream: false,
      ...llmOptions,
      temperature: 0,
    });
    const { content } = res.choices[0].message;
    assert(content, "No content found in response");
    return content;
  };
}

export type QuizQuestionEvalScorer = EvalScorer<
  QuizQuestionEvalCaseInput,
  QuizQuestionTaskOutput,
  QuizQuestionTaskExpected,
  void
>;

export const CorrectQuizAnswer: QuizQuestionEvalScorer = function (args) {
  const score =
    normalizeAnswer(args.expected) === normalizeAnswer(args.output) ? 1 : 0;
  return {
    name: `CorrectQuizAnswer`,
    score,
  };
};

function normalizeAnswer(answer: string) {
  return answer
    .split(",")
    .map((el) => el.trim())
    .join(",")
    .toUpperCase();
}

type QuizQuestionLlmOptions = Pick<
  OpenAI.ChatCompletionCreateParams,
  "max_tokens"
>;

type QuizQuestionPromptOptions = Omit<
  MakeHelmQuizQuestionPromptParams,
  "quizQuestion"
>;

export interface MakeQuizQuestionEvalParams {
  data: QuizQuestionEvalCase[];
  projectName: string;
  openaiClient: OpenAI;
  experimentName: string;
  llmOptions?: QuizQuestionLlmOptions;
  promptOptions: QuizQuestionPromptOptions;
  additionalMetadata?: Record<string, unknown>;
  model: string;
  maxConcurrency?: number;
}

export function runQuizQuestionEval({
  data,
  projectName,
  openaiClient,
  experimentName,
  additionalMetadata,
  llmOptions = { max_tokens: 100 },
  promptOptions,
  model,
  maxConcurrency,
}: MakeQuizQuestionEvalParams) {
  return Eval<
    QuizQuestionEvalCaseInput,
    QuizQuestionTaskOutput,
    QuizQuestionTaskExpected
  >(projectName, {
    data,
    experimentName,
    maxConcurrency,
    metadata: {
      model,
      llmOptions,
      ...additionalMetadata,
    },
    task: makeQuizQuestionTask({
      openaiClient,
      llmOptions,
      model,
      promptOptions,
    }),
    scores: [CorrectQuizAnswer],
  });
}
