import {
  updateEmbeddedContent,
  updateEmbeddedContentForPage,
} from "./updateEmbeddedContent";
import {
  makeMongoDbEmbeddedContentStore,
  makeMongoDbPageStore,
  MongoDbEmbeddedContentStore,
  MongoDbPageStore,
  persistPages,
  updatePages,
} from ".";
import { makeMockPageStore } from "../test/MockPageStore";
import * as chunkPageModule from "../chunk/chunkPage";
import {
  EmbeddedContentStore,
  EmbeddedContent,
  GetSourcesMatchParams,
} from "./EmbeddedContent";
import { Embedder } from "../embed";
import { Page, PersistedPage } from ".";
import { strict as assert } from "assert";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { DataSource } from "../dataSources";
import { MongoClient } from "mongodb";

export const makeMockEmbeddedContentStore = (): EmbeddedContentStore => {
  const content: Map<string /* page url */, EmbeddedContent[]> = new Map();
  return {
    async deleteEmbeddedContent({ page }) {
      if (page) {
        content.set(page.url, []);
      }
    },
    async findNearestNeighbors() {
      return [];
    },
    async loadEmbeddedContent({ page }) {
      return content.get(page.url) ?? [];
    },
    async updateEmbeddedContent({ embeddedContent, page }) {
      content.set(page.url, [...embeddedContent]);
    },
    metadata: {
      embeddingName: "test",
    },
    async getDataSources(matchQuery: GetSourcesMatchParams): Promise<string[]> {
      return [];
    },
  };
};

const examplePage: Page = {
  title: "Example",
  body: "this is a test page. testy test test test test test test test test. more tokens!",
  format: "md",
  sourceName: "test",
  metadata: {
    tags: [],
  },
  url: "https://example.com/test",
};

const embedder = {
  async embed() {
    return { embedding: [1, 2, 3] };
  },
};

describe("updateEmbeddedContent", () => {
  it("deletes embedded content for deleted page", async () => {
    const pageStore = makeMockPageStore();

    await persistPages({
      pages: [{ ...examplePage }],
      store: pageStore,
      sourceName: "test",
    });
    let pages = await pageStore.loadPages();
    expect(pages).toHaveLength(1);

    const embeddedContentStore = makeMockEmbeddedContentStore();

    const since = new Date("2000-01-01");

    await updateEmbeddedContent({
      embedder,
      embeddedContentStore,
      pageStore,
      since,
    });

    let embeddedContent = await embeddedContentStore.loadEmbeddedContent({
      page: examplePage,
    });
    expect(embeddedContent).toHaveLength(1);

    await persistPages({
      pages: [],
      store: pageStore,
      sourceName: "test",
    });
    pages = await pageStore.loadPages();
    expect(pages).toHaveLength(1);
    expect(pages[0].action).toBe("deleted");

    await updateEmbeddedContent({
      embedder,
      embeddedContentStore,
      pageStore,
      since,
    });
    embeddedContent = await embeddedContentStore.loadEmbeddedContent({
      page: examplePage,
    });
    // Embedded content for page was deleted
    expect(embeddedContent).toHaveLength(0);
  });
  it("updates page if chunk algorithm changes", async () => {
    const pageStore = makeMockPageStore();

    await persistPages({
      pages: [{ ...examplePage }],
      store: pageStore,
      sourceName: "test",
    });
    const pages = await pageStore.loadPages();
    expect(pages).toHaveLength(1);

    const embeddedContentStore = makeMockEmbeddedContentStore();

    const since = new Date("2000-01-01");

    await updateEmbeddedContent({
      embedder,
      embeddedContentStore,
      pageStore,
      since,
    });

    const embeddedContent = await embeddedContentStore.loadEmbeddedContent({
      page: examplePage,
    });
    expect(embeddedContent).toHaveLength(1);
    expect(embeddedContent[0].chunkAlgoHash).toBe(
      // You might need to update this expectation when the standard chunkPage
      // function changes
      "49d78a1d6b12ee6f433a2156060ed5ebfdefb8a90301f1c2fb04e4524944c5eb"
    );
    await updateEmbeddedContent({
      embedder,
      embeddedContentStore,
      pageStore,
      since,
      chunkOptions: {
        // Changing options impacts the chunkAlgoHash
        chunkOverlap: 2,
      },
    });
    const embeddedContent2 = await embeddedContentStore.loadEmbeddedContent({
      page: examplePage,
    });
    expect(embeddedContent2).toHaveLength(1);
    expect(embeddedContent2[0].chunkAlgoHash).toBe(
      // You might need to update this expectation when the standard chunkPage
      // function changes
      "2cbfe9901657ca15260fe7f58c3132ac1ebd0d610896082ca1aaad0335f2e3f1"
    );
  });

  describe("updateEmbeddedContent handles concurrency", () => {
    const startTimes: number[] = [];
    const endTimes: number[] = [];

    const mockEmbedder: jest.Mocked<Embedder> = {
      embed: jest.fn().mockImplementation(async (param) => {
        const startTime = Date.now();
        startTimes.push(startTime);
        await new Promise((resolve) => setTimeout(resolve, 50));
        const endTime = Date.now();
        endTimes.push(endTime);
        return { embedding: [1, 2, 3] };
      }),
    };

    let chunkPageSpy: jest.SpyInstance;
    beforeEach(() => {
      chunkPageSpy = jest.spyOn(chunkPageModule, "chunkPage");
      chunkPageSpy.mockResolvedValue([
        {
          text: "chunk1",
          url: "",
          sourceName: "",
          tokenCount: 0,
        },
        {
          text: "chunk2",
          url: "",
          sourceName: "",
          tokenCount: 0,
        },
        {
          text: "chunk3",
          url: "",
          sourceName: "",
          tokenCount: 0,
        },
      ]);
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("processes chunks concurrently within a page", async () => {
      const embeddedContentStore = makeMockEmbeddedContentStore();
      const page: PersistedPage = {
        ...examplePage,
        updated: new Date(),
        action: "updated",
      };

      await updateEmbeddedContentForPage({
        embedder: mockEmbedder,
        store: embeddedContentStore,
        page,
        concurrencyOptions: { createChunks: 2 },
        chunkAlgoHash: "testchunkalgohash",
      });

      const embeddedContent = await embeddedContentStore.loadEmbeddedContent({
        page: examplePage,
      });

      expect(embeddedContent).toHaveLength(3);
      const executionPairs = startTimes.map((startTime, i) => ({
        startTime,
        endTime: endTimes[i],
      }));

      // Ensure some overlaps indicating concurrency
      expect(
        executionPairs.some((pair, i, pairs) =>
          pairs.some(
            (otherPair, j) =>
              i !== j &&
              pair.startTime < otherPair.endTime &&
              otherPair.startTime < pair.endTime
          )
        )
      ).toBe(true);
    });
    it("processes pages concurrently", async () => {
      const pageStore = makeMockPageStore();
      const concurrentPages: Page[] = [
        { ...examplePage, url: "https://example.com/test1" },
        { ...examplePage, url: "https://example.com/test2" },
        { ...examplePage, url: "https://example.com/test3" },
      ];

      await persistPages({
        pages: concurrentPages,
        store: pageStore,
        sourceName: "test",
      });

      const embeddedContentStore = makeMockEmbeddedContentStore();

      const since = new Date("2000-01-01");

      await updateEmbeddedContent({
        embedder: mockEmbedder,
        embeddedContentStore,
        pageStore,
        since,
        concurrencyOptions: { processPages: 2, createChunks: 2 },
      });

      const executionPairs = startTimes.map((startTime, i) => ({
        startTime,
        endTime: endTimes[i],
      }));

      // Ensure some overlaps indicating concurrency
      expect(
        executionPairs.some((pair, i, pairs) =>
          pairs.some(
            (otherPair, j) =>
              i !== j &&
              pair.startTime < otherPair.endTime &&
              otherPair.startTime < pair.endTime
          )
        )
      ).toBe(true);
    });
  });
});

// These tests use "mongodb-memory-server", not mockEmbeddedContentStore
describe("updateEmbeddedContent", () => {
  let mongod: MongoMemoryReplSet | undefined;
  let pageStore: MongoDbPageStore;
  let embedStore: MongoDbEmbeddedContentStore;
  let uri: string;
  let databaseName: string;
  let mongoClient: MongoClient;
  let page1Embedding: EmbeddedContent[], page2Embedding: EmbeddedContent[];
  let pages: PersistedPage[] = [];

  const embedder = {
    async embed() {
      return { embedding: [1, 2, 3] };
    },
  };
  const mockDataSources: DataSource[] = [
    {
      name: "source1",
      fetchPages: async () => [
        {
          url: "test1.com",
          format: "html",
          sourceName: "source1",
          body: "hello source 1",
        },
      ],
    },
    {
      name: "source2",
      fetchPages: async () => [
        {
          url: "test2.com",
          format: "html",
          sourceName: "source2",
          body: "hello source 2",
        },
      ],
    },
  ];
  const mockDataSourceNames = mockDataSources.map(
    (dataSource) => dataSource.name
  );
  beforeAll(async () => {
    mongod = await MongoMemoryReplSet.create();
    uri = mongod.getUri();
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
  });
  beforeEach(async () => {
    // setup mongo client, page store, and embedded content store
    databaseName = "test-all-command";
    embedStore = makeMongoDbEmbeddedContentStore({
      connectionUri: uri,
      databaseName,
      searchIndex: { embeddingName: "test-embedding" },
    });
    pageStore = makeMongoDbPageStore({
      connectionUri: uri,
      databaseName,
    });
    // create pages and verify that they have been created
    await updatePages({ sources: mockDataSources, pageStore });
    pages = await pageStore.loadPages();
    assert(pages.length == 2);
    // create embeddings for the pages and verify that they have been created
    await updateEmbeddedContent({
      since: new Date(0),
      embeddedContentStore: embedStore,
      pageStore,
      sourceNames: mockDataSourceNames,
      embedder,
    });
    page1Embedding = await embedStore.loadEmbeddedContent({
      page: pages[0],
    });
    page2Embedding = await embedStore.loadEmbeddedContent({
      page: pages[1],
    });
    assert(page1Embedding.length);
    assert(page2Embedding.length);
  });

  afterEach(async () => {
    await pageStore?.drop();
    await embedStore?.drop();
  });
  afterAll(async () => {
    await pageStore?.close();
    await embedStore?.close();
    await mongoClient?.close();
    await mongod?.stop();
  });

  it("updates embedded content for pages that have been updated after the 'since' date provided", async () => {
    // Modify dates of pages and embedded content for testing
    const sinceDate = new Date("2024-01-01");
    const beforeSinceDate = new Date("2023-01-01");
    const afterSinceDate = new Date("2025-01-01");
    // set pages[0] to be last updated before sinceDate (should not be modified)
    await mongoClient
      .db(databaseName)
      .collection("pages")
      .updateOne({ ...pages[0] }, { $set: { updated: beforeSinceDate } });
    await mongoClient
      .db(databaseName)
      .collection("embedded_content")
      .updateOne(
        { sourceName: mockDataSourceNames[0] },
        { $set: { updated: beforeSinceDate } }
      );
    // set pages[1] to be last updated after sinceDate (should be re-chunked)
    await mongoClient
      .db(databaseName)
      .collection("pages")
      .updateOne({ ...pages[1] }, { $set: { updated: afterSinceDate } });
    await mongoClient
      .db(databaseName)
      .collection("embedded_content")
      .updateOne(
        { sourceName: mockDataSourceNames[1] },
        { $set: { updated: afterSinceDate } }
      );
    const originalPage1Embedding = await embedStore.loadEmbeddedContent({
      page: pages[0],
    });
    const originalPage2Embedding = await embedStore.loadEmbeddedContent({
      page: pages[1],
    });
    await updateEmbeddedContent({
      since: sinceDate,
      embeddedContentStore: embedStore,
      pageStore,
      sourceNames: mockDataSourceNames,
      embedder,
    });
    const updatedPage1Embedding = await embedStore.loadEmbeddedContent({
      page: pages[0],
    });
    const updatedPage2Embedding = await embedStore.loadEmbeddedContent({
      page: pages[1],
    });
    assert(updatedPage1Embedding.length);
    assert(updatedPage2Embedding.length);
    expect(updatedPage1Embedding[0].updated.getTime()).toBe(
      originalPage1Embedding[0].updated.getTime()
    );
    expect(updatedPage2Embedding[0].updated.getTime()).not.toBe(
      originalPage2Embedding[0].updated.getTime()
    );
  });
  it("updates embedded content when page has not changed, but chunk algo has, ignoring since date", async () => {
    // change the chunking algo for the second page, but not the first
    await updateEmbeddedContent({
      since: new Date(),
      embeddedContentStore: embedStore,
      pageStore,
      sourceNames: [mockDataSourceNames[0]],
      embedder,
    });
    await updateEmbeddedContent({
      since: new Date(),
      embeddedContentStore: embedStore,
      pageStore,
      sourceNames: [mockDataSourceNames[1]],
      embedder,
      chunkOptions: { chunkOverlap: 2 },
    });
    const updatedPage1Embedding = await embedStore.loadEmbeddedContent({
      page: pages[0],
    });
    const updatedPage2Embedding = await embedStore.loadEmbeddedContent({
      page: pages[1],
    });
    assert(updatedPage1Embedding.length);
    assert(updatedPage2Embedding.length);
    expect(updatedPage1Embedding[0].chunkAlgoHash).toBe(
      page1Embedding[0].chunkAlgoHash
    );
    expect(updatedPage2Embedding[0].chunkAlgoHash).not.toBe(
      page2Embedding[0].chunkAlgoHash
    );
  });
  it("use a new chunking algo on data sources, some of which have pages that have been updated", async () => {
    // SETUP: Modify dates of pages and embedded content for this test case
    const sinceDate = new Date("2024-01-01");
    const afterSinceDate = new Date("2025-01-01");
    await mongoClient
      .db(databaseName)
      .collection("pages")
      .updateOne({ ...pages[0] }, { $set: { updated: afterSinceDate } });
    await mongoClient
      .db(databaseName)
      .collection("embedded_content")
      .updateOne(
        { sourceName: mockDataSourceNames[0] },
        { $set: { updated: afterSinceDate } }
      );
    const originalPage1Embedding = await embedStore.loadEmbeddedContent({
      page: pages[0],
    });
    // END SETUP
    await updateEmbeddedContent({
      since: sinceDate,
      embeddedContentStore: embedStore,
      pageStore,
      sourceNames: mockDataSourceNames,
      embedder,
      chunkOptions: { chunkOverlap: 2 },
    });
    const updatedPage1Embedding = await embedStore.loadEmbeddedContent({
      page: pages[0],
    });
    const updatedPage2Embedding = await embedStore.loadEmbeddedContent({
      page: pages[1],
    });
    assert(updatedPage1Embedding.length);
    assert(updatedPage2Embedding.length);
    // both pages should be updated
    expect(updatedPage1Embedding[0].chunkAlgoHash).not.toBe(
      originalPage1Embedding[0].chunkAlgoHash
    );
    expect(updatedPage2Embedding[0].chunkAlgoHash).not.toBe(
      page2Embedding[0].chunkAlgoHash
    );
  });
});
