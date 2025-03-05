import { models } from "mongodb-rag-core/models";
import "dotenv/config";
import PromisePool from "@supercharge/promise-pool";
import { runQuizQuestionEval } from "./QuizQuestionEval";
import { getQuizQuestionEvalCasesFromBraintrust } from "./getQuizQuestionEvalCasesFromBraintrust";
import { mongoDbQuizQuestionExamples } from "./mongoDbQuizQuestionExamples";
import { openAiClientFactory } from "../openAiClients";

async function main() {
  const DEFAULT_MAX_CONCURRENCY = 15;

  const { RUN_ID } = process.env;

  const projectName = "mongodb-multiple-choice";
  const datasetName = "university-quiz-badge-questions";

  const data = await getQuizQuestionEvalCasesFromBraintrust({
    projectName,
    datasetName,
  });

  // These were the requested models to evaluate
  const modelsToEvaluate = [
    "gpt-4o",
    "claude-35-sonnet-v2",
    "llama-3.1-70b",
    "nova-pro-v1:0",
    "mistral-large-2",
    "gemini-2-flash",
  ];
  const modelExperiments = models.filter((m) =>
    modelsToEvaluate.includes(m.label)
  );

  // Process models in parallel
  await PromisePool.for(modelExperiments)
    .withConcurrency(modelsToEvaluate.length)

    .process(async (modelInfo) => {
      let experimentName = modelInfo.label;
      if (RUN_ID) {
        experimentName += `?runId=${RUN_ID}`;
      }
      console.log(`Running experiment: ${experimentName}`);
      try {
        await runQuizQuestionEval({
          projectName,
          model: modelInfo.deployment,
          openaiClient: openAiClientFactory.makeOpenAiClient(modelInfo),
          experimentName,
          additionalMetadata: {
            ...modelInfo,
          },
          maxConcurrency: modelInfo.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY,
          data,
          promptOptions: {
            subject: "MongoDB",
            quizQuestionExamples: mongoDbQuizQuestionExamples,
          },
        });
      } catch (err) {
        console.error("Error running Braintrust");
        console.error(err);
      }
    });
}
main();
