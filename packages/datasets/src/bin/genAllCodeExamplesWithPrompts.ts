/**
  @fileoverview Generate code examples with prompts for ALL drivers
 */
import fs from "fs";
import path from "path";
import { AstExtractedCodeblock } from "../codeExampleDataset/AstExtractedCodeBlock.js";
import "dotenv/config";
import yaml from "yaml";
import { appendLlmMetadata } from "../codeExampleDataset/appendLlmMetadata.js";
import { PersistedPage } from "mongodb-rag-core";
import { openAiClient, model } from "../openAi.js";

async function main(): Promise<void> {
  const basePath = path.resolve("data");
  const codeExamplesPath = path.resolve(
    basePath,
    "docs-chatbot.code-examples-with-headings.json"
  );
  const pagesPath = path.resolve(
    basePath,
    "docs-chatbot-2024-17-04.pages.json"
  );
  const codeExamples = (
    JSON.parse(
      fs.readFileSync(codeExamplesPath, "utf-8")
    ) as AstExtractedCodeblock[]
  ).filter((example) => {
    return (
      // naive heuristic to filter out examples that are too short
      example.code.length > 50
    );
  });
  const pages = JSON.parse(
    fs.readFileSync(pagesPath, "utf-8")
  ) as PersistedPage[];
  const BATCH_SIZE = 5;
  const pathOut = path.resolve(
    basePath,
    `docs-chatbot.code-examples-with-prompts-all-${Date.now()}.yaml`
  );
  for (let i = 0; i < codeExamples.length; i += BATCH_SIZE) {
    const codeBlocksWithPrompts = await appendLlmMetadata({
      pages,
      codeExamples: codeExamples.slice(i, i + BATCH_SIZE),
      batchSize: 5,
      openAiClient,
      model,
    });
    console.log(
      `Appending codeblocks ${i} to ${i + BATCH_SIZE - 1} of ${
        codeExamples.length
      } to file: ${pathOut}`
    );
    fs.appendFileSync(pathOut, yaml.stringify(codeBlocksWithPrompts));
  }
}
main();
