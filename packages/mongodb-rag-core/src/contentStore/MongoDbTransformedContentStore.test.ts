import { strict as assert } from "assert";
import "dotenv/config";
import { PersistedPage } from "./Page";
import {
  MongoDbTransformedContentStore,
  makeMongoDbTransformedContentStore,
} from "./MongoDbTransformedContentStore";
import { MongoClient } from "mongodb";
import { TransformedContent } from "./TransformedContent";
import { MONGO_MEMORY_REPLICA_SET_URI } from "../test/constants";

jest.setTimeout(30000);

describe("MongoDbTransformedContentStore", () => {
  let store: MongoDbTransformedContentStore<TransformedContent> | undefined;
  const page: PersistedPage = {
    action: "created",
    body: "foo",
    format: "md",
    sourceName: "source1",
    metadata: {
      tags: [],
    },
    updated: new Date(),
    url: "/x/y/z",
  };
  const anotherPage: PersistedPage = {
    action: "created",
    body: "bar",
    format: "md",
    sourceName: "another-source",
    metadata: {
      tags: [],
    },
    updated: new Date(),
    url: "/a/b/c",
  };
  const pages = [page, anotherPage];
  const uri = MONGO_MEMORY_REPLICA_SET_URI;

  const databaseName = "test-tranform-database";
  const collectionName = "test-collection";

  beforeAll(async () => {
    store = makeMongoDbTransformedContentStore({
      connectionUri: uri,
      databaseName: "test-tranform-database",
      collectionName: "test-collection",
    });
  });
  let content;
  beforeEach(async () => {
    for (const page of pages) {
      content = await store?.loadContent({ page });
      await store?.updateContent({
        page,
        transformedContent: [
          {
            sourceName: page.sourceName,
            text: page.body,
            url: page.url,
            updated: new Date(),
          },
        ],
      });
    }
  });

  afterEach(async () => {
    await store?.drop();
  });
  afterAll(async () => {
    await store?.close();
  });

  it("has an overridable default collection name", async () => {
    assert(store);

    expect(store.metadata.collectionName).toBe(collectionName);

    const storeWithCustomCollectionName =
      await makeMongoDbTransformedContentStore({
        connectionUri: MONGO_MEMORY_REPLICA_SET_URI,
        databaseName,
        collectionName,
      });

    expect(storeWithCustomCollectionName.metadata.collectionName).toBe(
      collectionName
    );
  });

  it("loads content belonging to the page provided", async () => {
    assert(store);
    const pageContent = await store.loadContent({ page });
    const anotherPageContent = await store.loadContent({
      page: anotherPage,
    });
    expect(pageContent[0].sourceName).toBe(page.sourceName);
    expect(anotherPageContent[0].sourceName).toBe(anotherPage.sourceName);
  });

  it("loads all content if no page is provided", async () => {
    assert(store);
    const allContent = await store.loadContent();
    expect(allContent.length).toBe(2);
  });

  it("does NOT load content for some other page", async () => {
    assert(store);
    expect(
      await store.loadContent({
        page: { ...page, sourceName: "source3" },
      })
    ).toStrictEqual([]);
    expect(
      await store.loadContent({
        page: { ...page, url: page.url + "/" },
      })
    ).toStrictEqual([]);
  });

  it("replaces existing content belonging to the page provided with the new content array provided", async () => {
    assert(store);
    const originalPageContent = await store.loadContent({ page });
    assert(originalPageContent.length === 1);

    const newContent = [{ ...originalPageContent[0], text: "new text" }];
    await store.updateContent({
      page,
      transformedContent: newContent,
    });

    const pageContent = await store.loadContent({ page });
    expect(pageContent.length).toBe(1);
    expect(pageContent[0].text).toBe("new text");
  });
  it("deletes content for a page", async () => {
    assert(store);

    await store.deleteContent({ page });

    expect(await store.loadContent({ page })).toStrictEqual([]);
    // Won't delete another page's content
    expect((await store.loadContent({ page: anotherPage })).length).toBe(1);
  });
  it("deletes content for data sources specified", async () => {
    assert(store);

    await store.deleteContent({ dataSources: [page.sourceName] });

    expect(await store.loadContent({ page })).toStrictEqual([]);
    // Won't delete content of another data source
    const remainingContent = await store.loadContent({
      page: anotherPage,
    });
    expect(remainingContent.length).toBe(1);
    expect(remainingContent[0].sourceName).toBe(anotherPage.sourceName);
  });
  it("deletes content for all data sources NOT specified", async () => {
    assert(store);

    await store.deleteContent({
      dataSources: [page.sourceName],
      inverseDataSources: true,
    });

    expect(await store.loadContent({ page: anotherPage })).toStrictEqual([]);
    // Won't delete content for provided data source
    const remainingContent = await store.loadContent({
      page,
    });
    expect(remainingContent.length).toBe(1);
    expect(remainingContent[0].sourceName).toBe(page.sourceName);
  });

  it("creates indexes", async () => {
    assert(store);
    await store.init();
    const mongoClient = new MongoClient(MONGO_MEMORY_REPLICA_SET_URI);
    const coll = mongoClient
      ?.db(store.metadata.databaseName)
      .collection(store.metadata.collectionName);
    try {
      const indexes = await coll?.listIndexes().toArray();
      expect(indexes?.some((el) => el.name === "_id_")).toBe(true);
      expect(indexes?.some((el) => el.name === "sourceName_1")).toBe(true);
      expect(indexes?.some((el) => el.name === "url_1")).toBe(true);
    } finally {
      await mongoClient.close();
    }
  });
});
