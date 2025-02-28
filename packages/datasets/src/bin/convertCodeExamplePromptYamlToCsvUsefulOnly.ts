import { stringify } from "csv";
import fs from "fs";
import path from "path";
import { AugmentedAstExtractedCodeblockWithUtility } from "../codeExampleDataset/AstExtractedCodeBlock.js";
import "dotenv/config";
import yaml from "yaml";

async function main(): Promise<void> {
  const basePath = path.resolve("data");
  const codeExamplesPath = path.resolve(
    basePath,
    "docs-chatbot.code-examples-with-prompts-with-utility-filtered-for-export-1723650460861.yaml"
  );
  console.log(`Processing examples from ${codeExamplesPath}`);

  const filteredCodeExamples = yaml.parse(
    fs.readFileSync(codeExamplesPath, "utf-8")
  ) as AugmentedAstExtractedCodeblockWithUtility[];

  const MIN_LEN = 150;
  const flatMapCodeExamples = filteredCodeExamples
    .filter(
      (example) =>
        example.isUseful &&
        example.code.length >= MIN_LEN &&
        example.metadata.sourceName !== "devcenter"
    )
    .map((example) => {
      return {
        code: example.code,
        prompt_1: example.prompts[0] ?? "",
        prompt_2: example.prompts[1] ?? "",
        prompt_3: example.prompts[2] ?? "",
        is_useful: example.isUseful,
        usefulness_reasoning: example.usefulnessReasoning,
        source_name: example.metadata.sourceName,
        page_url: example.metadata.pageUrl,
        classification: example.classification,
        programming_language: example.programmingLanguage,
        page_title: example.metadata.pageTitle,
        tags: example.metadata.tags?.join(","),
      };
    });
  console.log(
    `Num useful examples with length >= ${MIN_LEN}:`,
    flatMapCodeExamples.length
  );

  stringify(flatMapCodeExamples, { header: true }, (err, output) => {
    if (err) {
      console.error("Error:", err);
      return;
    }

    const pathOut = path.resolve(
      basePath,
      `docs-chatbot.code-examples-with-prompts-with-utility-filtered-for-export-${Date.now()}.csv`
    );

    fs.appendFileSync(pathOut, output);
  });
}
main();
