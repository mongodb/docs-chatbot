import { ObjectId } from "mongodb-rag-core/mongodb";
import { generateNaturalLanguageQueries } from "./generateNaturalLanguageQueries";
import {
  DatabaseUserNode,
  DatabaseInfoNode,
  DatabaseUseCaseSchema,
} from "./nodeTypes";
import {
  sampleMovieDbInfo,
  sampleDatabaseUsers,
  sampleUseCases,
} from "./sampleData";
import PromisePool from "@supercharge/promise-pool";

describe("generateNaturalLanguageQueries", () => {
  jest.setTimeout(300000); // Increase timeout for OpenAI API calls

  it("should generate natural language queries for a database use case", async () => {
    // Create a parent node with the database info
    const databaseInfoNode: DatabaseInfoNode = {
      _id: new ObjectId(),
      parent: null,
      data: sampleMovieDbInfo,
      updated: new Date(),
    };

    // Get a sample user and their use cases
    const sampleUser = sampleDatabaseUsers[1]; // Daniel Garcia
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
    await PromisePool.for(useCaseNodes).process(async (useCase) => {
      const nlQueries = await generateNaturalLanguageQueries(useCase);
      console.log(
        `Natural language queries for ${userNode.data.name} use case: ${useCase.data.title}`
      );
      console.log(
        JSON.stringify(
          nlQueries.map((nlQuery) => nlQuery.data),
          null,
          2
        )
      );
    });
  });
});
