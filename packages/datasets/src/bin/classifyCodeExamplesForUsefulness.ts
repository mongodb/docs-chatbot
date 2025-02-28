/**
  @fileoverview Filter the generated code examples + prompts for only those we'll export to partner orgs.
 */
import fs from "fs";
import path from "path";
import { AugmentedAstExtractedCodeblockWithUtility } from "../codeExampleDataset/AstExtractedCodeBlock.js";
import "dotenv/config";
import yaml from "yaml";
import { PromisePool } from "@supercharge/promise-pool";
import { makeClassifyIsUsefulCodeBlockForTraining } from "../codeExampleDataset/classifyIsUsefulCodeBlockForTraining.js";
import { openAiClient, model } from "../openAi.js";
async function main(): Promise<void> {
  const basePath = path.resolve("data");
  const pathOut = path.resolve(
    basePath,
    `docs-chatbot.code-examples-with-prompts-with-utility-filtered-for-export-${Date.now()}.yaml`
  );
  const codeExamplesPath = path.resolve(
    basePath,
    "docs-chatbot.code-examples-with-prompts-filtered-for-export-1716238251192.yaml"
  );

  const classifyIsUsefulCodeBlockForTraining =
    makeClassifyIsUsefulCodeBlockForTraining({
      openAiClient,
      model,
    });

  const codeExamples = yaml.parse(
    fs.readFileSync(codeExamplesPath, "utf-8")
  ) as AugmentedAstExtractedCodeblockWithUtility[];

  const { results: codeExamplesWithUsefulness } =
    await PromisePool.withConcurrency(3)
      .for(codeExamples)
      .handleError((error) => {
        console.error("Failed to process codeblock:", error);
      })
      .onTaskStarted((example) => {
        console.log(`Processing code block: ${example.code.slice(0, 20)}...`);
      })
      .process(async (example) => {
        const usefulness = await classifyIsUsefulCodeBlockForTraining({
          codeExample: example,
        });
        const codeExampleWithUsefulness = {
          ...example,
          ...usefulness,
        } satisfies AugmentedAstExtractedCodeblockWithUtility;
        fs.appendFileSync(pathOut, yaml.stringify([codeExampleWithUsefulness]));
        return codeExampleWithUsefulness;
      });

  console.log(
    `Num useful code examples: ${
      codeExamplesWithUsefulness.filter((ex) => ex.isUseful).length
    }`
  );
  console.log(
    `Num NOT useful code examples: ${
      codeExamplesWithUsefulness.filter((ex) => !ex.isUseful).length
    }`
  );
}
main();
