import yaml from "yaml";
import path from "path";
import fs from "fs";
import {
  AstExtractedCodeblock,
  AugmentedAstExtractedCodeblock,
} from "../codeExampleDataset/AstExtractedCodeBlock.js";
async function main() {
  const basePath = path.resolve("data");
  const withPromptsBasePathsYaml: string[] = [
    path.resolve(
      basePath,
      "docs-chatbot.code-examples-with-prompts-all-drivers-2.yaml"
    ),
    path.resolve(
      basePath,
      "docs-chatbot.code-examples-with-prompts-atlas-search.yaml"
    ),
  ];
  const properTitlesExamplesPathJson = path.resolve(
    basePath,
    "docs-chatbot.code-examples-with-headings.json"
  );
  const withPrompts = withPromptsBasePathsYaml.map(
    (path) =>
      yaml.parse(
        fs.readFileSync(path, "utf-8")
      ) as AugmentedAstExtractedCodeblock[]
  );
  const codeExamples = JSON.parse(
    fs.readFileSync(properTitlesExamplesPathJson, "utf-8")
  ) as AstExtractedCodeblock[];
  for (let i = 0; i < withPrompts.length; i++) {
    const promptFile = withPrompts[i];
    for (const prompt of promptFile) {
      const codeExample = codeExamples.find(
        (example) =>
          example?.metadata?.mdastNode?.position?.start.offset ===
          prompt?.metadata?.mdastNode?.position?.start.offset
      );
      if (codeExample) {
        prompt.metadata.parentHeadings = codeExample.metadata.parentHeadings;
      }
    }
    fs.writeFileSync(
      path.resolve(
        basePath,
        path
          .basename(withPromptsBasePathsYaml[i])
          .replace(".yaml", "-FIXED.yaml")
      ),
      yaml.stringify(promptFile)
    );
  }
}
main();
