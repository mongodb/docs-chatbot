import fs from "fs";
import * as Path from "path";
import { rstToSnootyAst } from "./rstToSnootyAst";
import { snootyAstToMd } from "./snootyAstToMd";
import { SnootyNode } from "./SnootyDataSource";

describe("rstToSnootyAst", () => {
  it("matches real Snooty AST", () => {
    const sampleRealSnootyAst = JSON.parse(
      fs.readFileSync(
        Path.resolve(__dirname, "./test_data/samplePageWithCodeExamples.json"),
        "utf-8"
      )
    ).data.ast;

    const sampleRst = fs.readFileSync(
      Path.resolve(__dirname, "./test_data/samplePageWithCodeExamples.rst"),
      "utf-8"
    );

    const testAst = rstToSnootyAst(sampleRst);

    const mdFromHack = snootyAstToMd(testAst);
    const mdFromReal = snootyAstToMd(sampleRealSnootyAst);

    const stripSlightlyDifferentWhitespace = (s: string) => {
      return s
        .split("\n")
        .map((s) => {
          return s.replaceAll(/ *$/g, ""); // From end of line
        })
        .filter((s) => s !== "")
        .join("\n");
    };

    expect(stripSlightlyDifferentWhitespace(mdFromHack)).toStrictEqual(
      stripSlightlyDifferentWhitespace(mdFromReal)
    );
  });
});

const printTree = (node: SnootyNode, level = 0): string => {
  const indent = Array(level * 2)
    .fill(0)
    .map(() => " ")
    .join("");
  if (node.children === undefined) {
    return `${indent}- ${node.type} (${JSON.stringify(node)})`;
  }
  return `${indent}- ${node.type} (${JSON.stringify({
    ...node,
    children: undefined,
  })})\n${node.children
    .map((child) => printTree(child, level + 1))
    .join("\n")}`;
};
