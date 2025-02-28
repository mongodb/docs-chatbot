/**
  @fileoverview Filter the generated code examples + prompts for only those we'll export to partner orgs.
 */
import fs from "fs";
import path from "path";
import { AugmentedAstExtractedCodeblock } from "../codeExampleDataset/AstExtractedCodeBlock.js";
import "dotenv/config";
import yaml from "yaml";
import { forbiddenUrls } from "../mongoDbDatasetConstants.js";

async function main(): Promise<void> {
  const basePath = path.resolve("data");
  const codeExamplesPath1 = path.resolve(
    basePath,
    "docs-chatbot.code-examples-with-prompts-all-1713802102876.yaml"
  );
  const codeExamplesPath2 = path.resolve(
    basePath,
    "docs-chatbot.code-examples-with-prompts-all-1716234694210.yaml"
  );
  const codeExamples1 = yaml.parse(
    fs.readFileSync(codeExamplesPath1, "utf-8")
  ) as AugmentedAstExtractedCodeblock[];
  const codeExamples2 = yaml.parse(
    fs.readFileSync(codeExamplesPath2, "utf-8")
  ) as AugmentedAstExtractedCodeblock[];
  const codeExamples = codeExamples1.concat(codeExamples2);

  console.log(`Loaded ${codeExamples.length} code examples`);
  const filteredCodeExamples = codeExamples.filter((example) => {
    return (
      // only snooty docs and dev center
      (example.metadata.sourceName.includes("snooty-") ||
        example.metadata.sourceName.includes("devcenter")) &&
      // no forbidden URLs
      !forbiddenUrls.has(example.metadata.pageUrl) &&
      // only usage examples, api references, and cli commands
      (example.classification === "usage_example" ||
        example.classification === "api_reference" ||
        example.classification === "cli_command")
    );
  });
  console.log(`Filtered down to ${filteredCodeExamples.length} code examples`);

  const pathOut = path.resolve(
    basePath,
    `docs-chatbot.code-examples-with-prompts-filtered-for-export-${Date.now()}.yaml`
  );

  fs.appendFileSync(pathOut, yaml.stringify(filteredCodeExamples));
}
main();
