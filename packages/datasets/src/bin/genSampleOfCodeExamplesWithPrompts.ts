/**
  @fileoverview Generate random sample of code examples with prompts
 */
import fs from "fs";
import path from "path";
import { AstExtractedCodeblock } from "../codeExampleDataset/AstExtractedCodeBlock.js";
import "dotenv/config";
import sampleSize from "lodash.samplesize";
import yaml from "yaml";
import { appendLlmMetadata } from "../codeExampleDataset/appendLlmMetadata.js";
import { PersistedPage } from "mongodb-rag-core";
import { openAiClient, model } from "../openAi.js";

async function main(): Promise<void> {
  const basePath = path.resolve("data");
  const codeExamplesPath = path.resolve(
    basePath,
    "docs-chatbot.code-examples.json"
  );
  const pagesPath = path.resolve(
    basePath,
    "docs-chatbot-2024-17-04.pages.json"
  );
  // get random sample
  const codeExamples = sampleSize(
    JSON.parse(
      fs.readFileSync(codeExamplesPath, "utf-8")
    ) as AstExtractedCodeblock[],
    100
  );

  const pages = JSON.parse(
    fs.readFileSync(pagesPath, "utf-8")
  ) as PersistedPage[];
  const codeBlocksWithPrompts = await appendLlmMetadata({
    pages,
    codeExamples,
    openAiClient,
    model,
  });
  fs.writeFileSync(
    path.resolve(
      basePath,
      `docs-chatbot.code-examples-with-prompts-${Date.now()}.yaml`
    ),
    yaml.stringify(codeBlocksWithPrompts)
  );
}
main();
