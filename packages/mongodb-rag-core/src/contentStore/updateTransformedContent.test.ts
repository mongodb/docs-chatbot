import { text } from "express";
import { MONGO_MEMORY_REPLICA_SET_URI } from "../test/constants";
import { makeMongoDbTransformedContentStore } from "./MongoDbTransformedContentStore";
import { Page, PersistedPage } from "./Page";
import { TransformedContent } from "./TransformedContent";
import {
  TransformPage,
  updateTransformedContent,
} from "./updateTransformedContent";

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

const pages: PersistedPage[] = [
  {
    ...examplePage,
    updated: new Date(),
    action: "updated",
    url: "https://example.com/test/1",
  },
  {
    ...examplePage,
    updated: new Date(),
    action: "created",
    url: "https://example.com/test/2",
  },
  {
    ...examplePage,
    updated: new Date(),
    action: "deleted",
    url: "https://example.com/test/3",
  },
];

const exampleTransformed: TransformedContent[] = [
  {
    sourceName: "test",
    text: "FOOBAR!! this is a test page. testy test test test test test test test test. more tokens!",
    url: "https://example.com/test",
    updated: new Date(),
  },
];

const transformPage: TransformPage<TransformedContent> = async (p) => {
  return [
    {
      sourceName: p.sourceName,
      text: "FOOBAR!! " + p.body,
      url: p.url,
      updated: new Date(),
    },
  ];
};

describe("updateTransformedContent", () => {
  const databaseName = "test_" + Date.now();
  const transformedContentStore = makeMongoDbTransformedContentStore({
    connectionUri: MONGO_MEMORY_REPLICA_SET_URI,
    databaseName,
    collectionName: "transformed_content",
  });

  afterEach(async () => {
    await transformedContentStore.drop();
  });
  afterAll(async () => {
    await transformedContentStore.close();
  });

  it("updates transformed content for page if content doesn't exist", async () => {
    await updateTransformedContent({
      pages,
      transformedContentStore,
      transformPage,
    });

    expect(
      (await transformedContentStore.loadContent()).length
    ).toBeGreaterThanOrEqual(1);
  });

  it("deletes embedded content for deleted page", async () => {
    // Add content that is then 'deleted'
    await updateTransformedContent({
      pages: pages
        .filter((page) => page.action === "deleted")
        .map((p) => ({ ...p, action: "created" })),
      transformedContentStore,
      transformPage,
    });
    // Note that the content is
    await updateTransformedContent({
      pages: pages.filter((page) => page.action === "deleted"),
      transformedContentStore,
      transformPage,
    });
    const transformedContent = await transformedContentStore.loadContent({
      page: examplePage,
    });
    // Transformed content for page was deleted
    expect(transformedContent).toHaveLength(0);
  });

  it("deletes content when transformPage returns an empty array", async () => {
    // Populate content
    await updateTransformedContent({
      pages,
      transformedContentStore,
      transformPage,
    });

    // Make sure content populated
    expect(
      (await transformedContentStore.loadContent()).length
    ).toBeGreaterThanOrEqual(1);

    // Now proceed to check deletion...
    const transformPageEmpty: TransformPage<TransformedContent> = jest.fn(
      async () => {
        // Nothing to see here...
        return [];
      }
    );
    await updateTransformedContent({
      pages,
      transformedContentStore,
      transformPage: transformPageEmpty,
    });

    expect(transformPageEmpty).toHaveBeenCalled();
    // Content should be delete b/c transformPage returned empty array
    expect(await transformedContentStore.loadContent()).toHaveLength(0);
  });

  it("updates page if transform algorithm changes", async () => {
    // Add transformed content
    await updateTransformedContent({
      transformedContentStore,
      pages,
      transformPage,
    });

    // Load transformed content
    const transformedContent = await transformedContentStore.loadContent({
      page: pages[0],
    });
    const transformAlgoHash = transformedContent[0].transformAlgoHash;

    expect(transformedContent).toHaveLength(1);
    expect(transformAlgoHash).toEqual(expect.any(String));

    const newTransformPage: TransformPage<TransformedContent> = async (p) => {
      return [
        {
          sourceName: p.sourceName,
          text: "FIZZBUZZ!! " + p.body,
          url: p.url,
          updated: new Date(),
        },
      ];
    };

    await updateTransformedContent({
      transformedContentStore,
      pages,
      transformPage: newTransformPage,
    });
    const transformedContent2 = await transformedContentStore.loadContent({
      page: pages[0],
    });
    expect(transformedContent2).toHaveLength(1);
    expect(transformedContent2[0].transformAlgoHash).toEqual(
      expect.any(String)
    );
    expect(transformedContent2[0].transformAlgoHash).not.toBe(
      transformAlgoHash
    );
  });

  it("processes pages concurrently", async () => {
    const startTimes: number[] = [];
    const endTimes: number[] = [];
    const transformPage = async () => {
      startTimes.push(Date.now());
      await new Promise((resolve) => setTimeout(resolve, 100));
      endTimes.push(Date.now());
      return exampleTransformed;
    };
    await updateTransformedContent({
      transformedContentStore,
      pages,
      transformPage,
      concurrencyOptions: { processPages: pages.length },
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
