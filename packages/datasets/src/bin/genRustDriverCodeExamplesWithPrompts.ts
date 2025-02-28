/**
  @fileoverview Generate code examples with prompts for Rust driver
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
  // get rust examples
  const codeExamples = (
    JSON.parse(
      fs.readFileSync(codeExamplesPath, "utf-8")
    ) as AstExtractedCodeblock[]
  )
    .filter((example) => {
      return (
        example.metadata.sourceName === "snooty-rust" &&
        // naive heuristic to filter out examples that are too short
        example.code.length > 50
      );
    })
    .slice(0, 15);
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
      "docs-chatbot.code-examples-with-prompts-rust-driver.yaml"
    ),
    yaml.stringify(codeBlocksWithPrompts)
  );
}
main();
