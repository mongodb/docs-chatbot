import { PersistedPage } from "mongodb-rag-core";
import { AstExtractedCodeblock } from "./AstExtractedCodeBlock.js";
import yaml from "yaml";

export const START_SNIPPET = "<TARGET_SNIPPET_START>";
export const END_SNIPPET = "<TARGET_SNIPPET_END>";

/**
  Put the extracted code block within the context of is page with metadata.
 */
export function contextualizeCodeBlock({
  codeblock,
  page,
  maxCharsAfter = 300,
  maxCharsBefore = 500,
}: {
  codeblock: AstExtractedCodeblock;
  page: PersistedPage;
  maxCharsBefore?: number;
  maxCharsAfter?: number;
}): string {
  const codeBlockStartIdx =
    codeblock.metadata.mdastNode?.position?.start?.offset ?? 0;

  const codeBlockEndIdx =
    codeblock.metadata.mdastNode?.position?.end?.offset ?? 0;
  const startIndex =
    codeBlockStartIdx - maxCharsBefore > 0
      ? codeBlockStartIdx - maxCharsBefore
      : 0;
  const endIndex =
    codeBlockEndIdx + maxCharsAfter < page.body.length
      ? codeBlockEndIdx + maxCharsAfter
      : page.body.length - 1;
  const contextBefore = page.body.slice(startIndex, codeBlockStartIdx);
  const contextAfter = page.body.slice(codeBlockEndIdx + 1, endIndex);
  const code = codeblock.code;
  const parentHeadings = page.metadata?.parentHeadings
    ? Object.entries(page.metadata.parentHeadings).map(([key, value]) => ({
        level: key,
        text: value,
      }))
    : null;
  const frontmatter = yaml.stringify({
    parentHeadings,
  });
  const text =
    `---
${frontmatter}
---
` +
    contextBefore +
    START_SNIPPET +
    `\n\`\`\`${codeblock.programmingLanguage ?? ""}\n${code}\n\`\`\`\n` +
    END_SNIPPET +
    contextAfter;
  return text;
}
