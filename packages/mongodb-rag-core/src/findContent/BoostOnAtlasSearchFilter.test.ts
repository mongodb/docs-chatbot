import { ObjectId } from "mongodb";
import { makeBoostOnAtlasSearchFilter } from "./BoostOnAtlasSearchFilter";
import { EmbeddedContentStore } from "../contentStore";

describe("makeBoostOnAtlasSearchFilter()", () => {
  const boostManual = makeBoostOnAtlasSearchFilter({
    /**
      Boosts results that have 3 words or less
     */
    async shouldBoostFunc({ text }: { text: string }) {
      return text.split(" ").filter((s) => s !== " ").length <= 3;
    },
    findNearestNeighborsOptions: {
      k: 2,
      filter: {
        text: {
          path: "sourceName",
          query: "snooty-docs",
        },
      },
      minScore: 0.88,
    },
    totalMaxK: 5,
  });

  describe("SearchBooster.shouldBoost()", () => {
    test("Should boost MongoDB manual", async () => {
      const text = "insert one";
      expect(await boostManual.shouldBoost({ text })).toBe(true);
    });
    test("Should not boost MongoDB manual", async () => {
      const text = "blah blah blah length > 3";
      expect(await boostManual.shouldBoost({ text })).toBe(false);
    });
  });
  describe("SearchBooster.boost()", () => {
    const embeddingName = "useless-embedding-model";
    const sharedResult = {
      _id: new ObjectId(),
      url: "https://mongodb.com/docs",
      text: "blah blah blah",
      tokenCount: 100,
      embeddings: {
        [embeddingName]: [0.1, 0.2, 0.3],
      },
      updated: new Date(),
      sourceName: "snooty-docs", // only important value
      score: 0.98,
    };
    const mockBoostedResults = [
      sharedResult,
      {
        _id: new ObjectId(),
        url: "https://mongodb.com/docs",
        text: "lorem ipsum",
        tokenCount: 100,
        embeddings: {
          [embeddingName]: [0.1, 0.2, 0.3],
        },
        updated: new Date(),
        sourceName: "snooty-docs", // only important value
        score: 0.91,
      },
    ];
    const mockStore: EmbeddedContentStore = {
      loadEmbeddedContent: jest.fn(),
      deleteEmbeddedContent: jest.fn(),
      updateEmbeddedContent: jest.fn(),
      async findNearestNeighbors() {
        return mockBoostedResults;
      },
      async getDataSources(matchQuery) {
        return [];
      },
      metadata: {
        embeddingName,
      },
    };
    const existingResults = [
      {
        _id: new ObjectId(),
        url: "https://mongodb.com/docs/",
        text: "foo bar baz",
        tokenCount: 100,
        embeddings: {
          [embeddingName]: [0.1, 0.2, 0.3],
        },
        updated: new Date(),
        sourceName: "not-snooty-docs", // only important value
        score: 0.99,
      },
      sharedResult,
      {
        _id: new ObjectId(),
        url: "https://mongodb.com/docs/",
        text: "four score and seven years ago",
        tokenCount: 100,
        embeddings: {
          [embeddingName]: [0.1, 0.2, 0.3],
        },
        updated: new Date(),
        sourceName: "not-snooty-docs", // only important value
        score: 0.955,
      },
      {
        _id: new ObjectId(),
        url: "https://mongodb.com/docs/",
        text: "one small step for man, one giant leap for mankind",
        tokenCount: 100,
        embeddings: {
          [embeddingName]: [0.1, 0.2, 0.3],
        },
        updated: new Date(),
        sourceName: "not-snooty-docs", // only important value
        score: 0.95,
      },
    ];
    const embedding = [0.1, 0.2, 0.3];
    test("Boosts manual results", async () => {
      const results = await boostManual.boost({
        embedding,
        existingResults,
        store: mockStore,
      });
      expect(results).toHaveLength(5);
      expect(results[0]).toStrictEqual(existingResults[0]);
      expect(results[1]).toStrictEqual(sharedResult);
      expect(results[2]).toStrictEqual(existingResults[2]);
      expect(results[3]).toStrictEqual(existingResults[3]);
      expect(results[4]).toStrictEqual(mockBoostedResults[1]);
    });
  });
});
