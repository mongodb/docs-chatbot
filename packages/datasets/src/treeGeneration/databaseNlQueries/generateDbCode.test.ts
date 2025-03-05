import { ObjectId } from "mongodb-rag-core/mongodb";
import {
  DatabaseUserNode,
  DatabaseInfoNode,
  DatabaseUseCaseSchema,
} from "./nodeTypes";
import {
  sampleMovieDbInfo,
  sampleDatabaseUsers,
  sampleUseCases,
  sampleNlQueries,
} from "./sampleData";
import PromisePool from "@supercharge/promise-pool";
import { strict as assert } from "assert";
import { generateDbCode } from "./generateDbCode";
import yaml from "yaml";
import path from "path";
import fs from "fs";

describe("generateDbCode", () => {
  jest.setTimeout(300000); // Increase timeout for OpenAI API calls

  it("should generate MQL code for a NL query", async () => {
    // Create a parent node with the database info
    const databaseInfoNode: DatabaseInfoNode = {
      _id: new ObjectId(),
      parent: null,
      data: sampleMovieDbInfo,
      updated: new Date(),
    };

    // Get a sample user and their use cases
    const sampleUser = sampleDatabaseUsers[0]; // Alice Chen
    const userUseCases = sampleUseCases[sampleUser.name];

    // Create a user node with the parent reference
    const userNode: DatabaseUserNode = {
      _id: new ObjectId(),
      parent: databaseInfoNode,
      data: sampleUser,
      updated: new Date(),
    };

    const useCaseNodes = userUseCases.map((useCase) => ({
      _id: new ObjectId(),
      parent: userNode,
      data: DatabaseUseCaseSchema.parse(useCase),
      updated: new Date(),
    }));

    const nlQueryNodes = Object.entries(sampleNlQueries["Alice Chen"]).flatMap(
      ([useCaseTitle, nlQueries]) =>
        nlQueries.map((nlQuery) => ({
          _id: new ObjectId(),
          parent: useCaseNodes.find(
            (useCase) => useCase.data.title === useCaseTitle
          )!,
          data: nlQuery,
          updated: new Date(),
        }))
    );

    assert(
      nlQueryNodes.length ===
        Object.entries(sampleNlQueries["Alice Chen"]).reduce(
          (sum, [_, queries]) => sum + queries.length,
          0
        )
    );
    console.log("Generating", nlQueryNodes.length, "MQL queries");

    const { results, errors } = await PromisePool.for(nlQueryNodes)
      .handleError((err) => {
        console.error(err);
      })
      .process(async (nlQueryNode) => {
        const mqlCode = await generateDbCode(nlQueryNode);

        console.log(
          JSON.stringify(
            mqlCode.map((nlQuery) => nlQuery.data),
            null,
            2
          )
        );
        return mqlCode;
      });
    // Check for any errors during processing
    expect(errors).toHaveLength(0);

    const pathOut = path.resolve(__dirname, "generatedMqlCode.yaml");
    fs.writeFileSync(
      pathOut,
      yaml.stringify(
        results.flat().map((query) => ({
          nlQuery: query.parent.data.query,
          ...query.data,
        }))
      )
    );
    console.log("Saved to", pathOut);
  });
});
