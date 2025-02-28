import fs from "fs";
import path from "path";
import yaml from "yaml";
import { AugmentedAstExtractedCodeblockWithUtility } from "../codeExampleDataset/AstExtractedCodeBlock.js";
function main() {
  const LEN = 150;
  const basePath = path.resolve("data");
  const pathIn = path.resolve(
    basePath,
    "docs-chatbot.code-examples-with-prompts-with-utility-filtered-for-export-1723650460861.yaml"
  );
  const examples = yaml.parse(
    fs.readFileSync(pathIn, "utf-8")
  ) as AugmentedAstExtractedCodeblockWithUtility[];
  console.log("Tot num examples:", examples.length);
  const usableExamples = examples.filter(
    (example) => example.code.length >= LEN && example.isUseful
  );
  console.log(`Num examples of length >= ${LEN}:`, usableExamples.length);
}
main();
