import fs from "fs";
import path from "path";
import yaml from "yaml";
import { AugmentedAstExtractedCodeblock } from "../codeExampleDataset/AstExtractedCodeBlock.js";
function main() {
  const basePath = path.resolve("data");
  const pathIn = path.resolve(
    basePath,
    "docs-chatbot.code-examples-with-prompts-all-1713802102876.yaml"
  );
  const examples = yaml.parse(
    fs.readFileSync(pathIn, "utf-8")
  ) as AugmentedAstExtractedCodeblock[];
  const usableExamples = examples.filter(
    (example) =>
      example.metadata.sourceName.includes("snooty") &&
      ![
        "unknown",
        "error_message",
        "execution_output",
        "example_data",
      ].includes(example.classification)
  );
  console.log("Num usable examples:", usableExamples.length);
}
main();
