/**
  @fileoverview Generate more code examples with prompts for additional drivers
 */
import fs from "fs";
import path from "path";
import { AstExtractedCodeblock } from "../codeExampleDataset/AstExtractedCodeBlock.js";
import "dotenv/config";
import yaml from "yaml";
import { appendLlmMetadata } from "../codeExampleDataset/appendLlmMetadata.js";
import { PersistedPage } from "mongodb-rag-core";
import { model, openAiClient } from "../openAi.js";

async function main(): Promise<void> {
  const basePath = path.resolve("data");
  const codeExamplesPath = path.resolve(
    basePath,
    "docs-chatbot.code-examples-with-headings-1716233758052.json"
  );
  const pagesPath = path.resolve(
    basePath,
    "docs-devcenter-content-snapshot.2024-05-20.json"
  );
  const newDataSources = [
    "snooty-c",
    "snooty-scala",
    "snooty-java-rs",
    "snooty-pymongo",
    "snooty-pymongo-arrow",
    "snooty-laravel",
  ];

  const codeExamples = (
    JSON.parse(
      fs.readFileSync(codeExamplesPath, "utf-8")
    ) as AstExtractedCodeblock[]
  ).filter((example) => {
    return (
      // naive heuristic to filter out examples that are too short
      example.code.length > 50 &&
      // get additional data sources
      (example.metadata.sourceName === "snooty-c" ||
        example.metadata.sourceName === "snooty-scala" ||
        example.metadata.sourceName === "snooty-java-rs" ||
        example.metadata.sourceName === "snooty-pymongo" ||
        example.metadata.sourceName === "snooty-pymongo-arrow" ||
        example.metadata.sourceName === "snooty-laravel")
    );
  });
  for (const source of newDataSources) {
    console.log(
      `For ${source}, there are ${
        codeExamples.filter((example) => example.metadata.sourceName === source)
          .length
      } code examples`
    );
  }
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
