import { models } from "mongodb-rag-core/models";
import path from "path";
import "dotenv/config";
import PromisePool from "@supercharge/promise-pool";
import {
  getDiscoveryConversationEvalDataFromYamlFile,
  runDiscoveryEval,
} from "./DiscoveryEval";
import { openAiClientFactory } from "../openAiClients";

async function main() {
  const DEFAULT_MAX_CONCURRENCY = 10;

  const { RUN_ID } = process.env;

  const temperatures = [0.0, 0.5, 1.0];
  const maxTokensOut = [100, 500, 1000];
  const iterations = 5;
  const projectName = "discovery-benchmark";
  const modelExperiments = models

    .filter((m) => m.authorized === true)
    .map((modelInfo) => {
      const modelExperiments = [];
      for (const temperature of temperatures) {
        for (const maxTokens of maxTokensOut) {
          modelExperiments.push({
            modelInfo,
            temperature,
            maxTokens,
          });
        }
      }
      return modelExperiments;
    });
  // Process models in parallel
  await PromisePool.for(modelExperiments)
    .withConcurrency(3)
    .process(async (modelInfos) => {
      await PromisePool.for(modelInfos)
        .withConcurrency(1)
        .process(async ({ modelInfo, temperature, maxTokens }) => {
          let experimentName = `${modelInfo.label}?temperature=${temperature}&maxTokens=${maxTokens}&iterations=${iterations}`;
          if (RUN_ID) {
            experimentName += `&runId=${RUN_ID}`;
          }
          console.log(`Running experiment: ${experimentName}`);
          try {
            await runDiscoveryEval({
              projectName,
              model: modelInfo.deployment,
              matchRegExp: /mongodb/i,
              openaiClient: openAiClientFactory.makeOpenAiClient(modelInfo),
              experimentName,
              additionalMetadata: {
                ...modelInfo,
              },
              llmOptions: {
                temperature,
                max_tokens: maxTokens,
              },
              maxConcurrency:
                modelInfo.maxConcurrency ?? DEFAULT_MAX_CONCURRENCY,
              iterations: temperature === 0 ? 1 : iterations,
              data: getDiscoveryConversationEvalDataFromYamlFile(
                path.resolve(__dirname, "..", "..", "datasets", "discovery.yml")
              ),
            });
          } catch (err) {
            console.error("Error running Braintrust");
            console.error(err);
          }
        });
    });
}
main();
