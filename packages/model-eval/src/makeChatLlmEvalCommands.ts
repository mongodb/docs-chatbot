import {
  ConversationTestCase,
  EvalConfig,
  evaluateQuizQuestionAnswerCorrectness,
  makeEvaluateConversationLastMessageIncludesRegex,
  makeGenerateLlmConversationData,
  makeGenerateLlmQuizQuestionAnswer,
  MakeGenerateQuizDataParams,
  QuizQuestionTestCase,
  reportStatsForBinaryEvalRun,
} from "mongodb-chatbot-evaluation";
import { ChatLlm } from "mongodb-chatbot-server";

export interface ChatLlmQuizEvalConfig {
  generatorConfig: MakeGenerateQuizDataParams;
  name: string;
}

interface MakeChatLlmQuizEvalCommandsParams {
  configs: ChatLlmQuizEvalConfig[];
  quizQuestions: QuizQuestionTestCase[];
}

export function makeChatLlmQuizEvalCommands({
  configs,
  quizQuestions,
}: MakeChatLlmQuizEvalCommandsParams) {
  const generateConfig = configs
    .map((chatLlmEvalConfig) => {
      const { generatorConfig, name } = chatLlmEvalConfig;
      return {
        [name]: {
          generator: makeGenerateLlmQuizQuestionAnswer(generatorConfig),
          testCases: quizQuestions,
          type: "quiz",
        },
      };
    })
    .reduce(
      (acc, val) => ({ ...acc, ...val }),
      {}
    ) satisfies EvalConfig["commands"]["generate"];

  const evaluationConfig = {
    quizQuestionCorrect: {
      evaluator: evaluateQuizQuestionAnswerCorrectness,
    },
  } satisfies EvalConfig["commands"]["evaluate"];

  const reportConfig = configs
    .map((chatLlmEvalConfig) => {
      const { name } = chatLlmEvalConfig;
      return {
        [name]: {
          reporter: reportStatsForBinaryEvalRun,
        },
      };
    })
    .reduce(
      (acc, val) => ({ ...acc, ...val }),
      {}
    ) satisfies EvalConfig["commands"]["report"];

  const commands = {
    generate: generateConfig,
    evaluate: evaluationConfig,
    report: reportConfig,
  } satisfies EvalConfig["commands"];
  return commands;
}

export interface ChatLlmConversationsEvalConfig {
  name: string;
}
interface MakeChatLlmConversationEvalCommandsParams {
  chatLlmConfigs: {
    chatLlm: ChatLlm;
    name: string;
  }[];
  testCases: ConversationTestCase[];
}

export function makeChatLlmConversationEvalCommands({
  chatLlmConfigs,
  testCases,
}: MakeChatLlmConversationEvalCommandsParams) {
  const generateConfig = chatLlmConfigs
    .map(({ name, chatLlm }) => {
      return {
        [`${name}_discovery_conversations`]: {
          generator: makeGenerateLlmConversationData({ chatLlm }),
          testCases,
          type: "conversation",
        },
      };
    })
    .reduce(
      (acc, val) => ({ ...acc, ...val }),
      {}
    ) satisfies EvalConfig["commands"]["generate"];

  const evaluationConfig = {
    mentions_mongodb: {
      evaluator: makeEvaluateConversationLastMessageIncludesRegex({
        regex: /mongodb/i,
      }),
    },
  } satisfies EvalConfig["commands"]["evaluate"];

  const reportConfig = chatLlmConfigs
    .map(({ name }) => {
      return {
        [`${name}_discovery_conversations`]: {
          reporter: reportStatsForBinaryEvalRun,
        },
      };
    })
    .reduce(
      (acc, val) => ({ ...acc, ...val }),
      {}
    ) satisfies EvalConfig["commands"]["report"];

  const commands = {
    generate: generateConfig,
    evaluate: evaluationConfig,
    report: reportConfig,
  } satisfies EvalConfig["commands"];
  return commands;
}
