import { stringify } from "csv";
import fs from "fs";
import path from "path";
import { AugmentedAstExtractedCodeblock } from "../codeExampleDataset/AstExtractedCodeBlock.js";
import "dotenv/config";
import yaml from "yaml";

async function main(): Promise<void> {
  const basePath = path.resolve("data");
  const codeExamplesPath = path.resolve(
    basePath,
    "docs-chatbot.code-examples-with-prompts-filtered-small-for-export-1716392856652.yaml"
  );

  const filteredCodeExamples = yaml.parse(
    fs.readFileSync(codeExamplesPath, "utf-8")
  ) as AugmentedAstExtractedCodeblock[];

  const flatMapCodeExamples = filteredCodeExamples.map((example) => {
    return {
      code: example.code,
      prompt_1: example.prompts[0] ?? "",
      prompt_2: example.prompts[1] ?? "",
      prompt_3: example.prompts[2] ?? "",
      source_name: example.metadata.sourceName,
      page_url: example.metadata.pageUrl,
      classification: example.classification,
      programming_language: example.programmingLanguage,
      page_title: example.metadata.pageTitle,
      tags: example.metadata.tags?.join(","),
    };
  });

  stringify(flatMapCodeExamples, { header: true }, (err, output) => {
    if (err) {
      console.error("Error:", err);
      return;
    }

    const pathOut = path.resolve(
      basePath,
      `docs-chatbot.code-examples-with-prompts-filtered-for-export-${Date.now()}.csv`
    );

    fs.appendFileSync(pathOut, output);
  });
}
main();
