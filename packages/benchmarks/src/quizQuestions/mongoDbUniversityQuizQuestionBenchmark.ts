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

  const projectName = "university-quiz-benchmark";
  const datasetName = "university-quiz-questions";

  const data = await getQuizQuestionEvalCasesFromBraintrust({
    projectName,
    datasetName,
  });

  const modelExperiments = models.filter((m) => m.authorized === true);

  // Process models in parallel
  await PromisePool.for(modelExperiments)
    .withConcurrency(3)

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
