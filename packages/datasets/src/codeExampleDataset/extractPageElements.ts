/**
  @fileoverview Grab bag of stuff to help with parsing a page.
 */
import { Code, Heading, Node, Text } from "mdast";
import { AstExtractedCodeblock } from "./AstExtractedCodeBlock.js";
import { Parent } from "unist";
import { Page } from "mongodb-rag-core";

// Import ESM modules dynamically
export async function makePageParser() {
  const { default: remarkGfm } = await import("remark-gfm");
  const { default: remarkParse } = await import("remark-parse");
  const { unified } = await import("unified");
  return unified().use(remarkParse).use(remarkGfm);
}

export async function makeExtractCodeBlocksWithHeadings() {
  const { visit, SKIP } = await import("unist-util-visit");

  return function extractCodeBlocksWithHeadings({
    ast,
    page,
  }: {
    ast: Node;
    page: Page;
  }): AstExtractedCodeblock[] {
    const codeBlocks: AstExtractedCodeblock[] = [];
    visit(ast, "code", (node: Code, index: number, parent: Parent) => {
      const programmingLanguage = node.lang ?? null;
      const code = node.value;

      const metadata = {
        pageUrl: page.url,
        sourceName: page.sourceName,
        pageTitle: page.title,
        tags: page.metadata?.tags ?? [],
        mdastNode: node,
        parentHeadings: {} as Record<string, unknown>,
      } satisfies AstExtractedCodeblock["metadata"];

      visit(
        parent,
        "heading",
        (heading: Heading, siblingIndex: number) => {
          if (siblingIndex >= index) {
            return SKIP;
          }
          const currentHeadings = Object.keys(metadata.parentHeadings)
            .map((heading) => parseInt(heading.slice(1)))
            .sort();
          if (
            currentHeadings.includes(heading.depth) ||
            heading.depth >= currentHeadings[currentHeadings.length - 1]
          ) {
            return SKIP;
          }
          let headingText = "";
          visit(heading, "text", (text: Text) => {
            headingText += text.value;
          });
          if ((heading.children[0] as Text)?.value) {
            metadata.parentHeadings[`h${heading.depth}`] = headingText;
          }
          return true;
        },
        // revere order of visiting
        true
      );
      codeBlocks.push({
        code,
        programmingLanguage,
        metadata,
      });
      return true;
    });
    return codeBlocks;
  };
}
