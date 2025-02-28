import { DatabaseConnection } from "../DatabaseConnection";
import {
  MakeMongoDbDatabaseConnectionParams,
  makeMongoDbDatabaseConnection,
} from "../MongoDbDatabaseConnection";
import { strict as assert } from "assert";
import {
  TransformedContentStore,
  TransformedContent,
} from "./TransformedContent";
import { Filter, OptionalUnlessRequiredId } from "mongodb";
import { pageIdentity } from "./pageIdentity";

export type MakeMongoDbTransformedContentStoreParams =
  MakeMongoDbDatabaseConnectionParams & {
    /**
      The name of the collection in the database that stores {@link TransformedContent} documents.
      @default "transformed_content"
     */
    collectionName: string;
  };

export type MongoDbTransformedContentStore<TC extends TransformedContent> =
  TransformedContentStore<TC> &
    DatabaseConnection & {
      metadata: {
        databaseName: string;
        collectionName: string;
      };
    };

export function makeMongoDbTransformedContentStore<
  TC extends TransformedContent
>({
  connectionUri,
  databaseName,
  collectionName = "transformed_content",
}: MakeMongoDbTransformedContentStoreParams): MongoDbTransformedContentStore<TC> {
  const { mongoClient, db, drop, close } = makeMongoDbDatabaseConnection({
    connectionUri,
    databaseName,
  });
  const transformedContentCollection = db.collection<TC>(collectionName);

  return {
    drop,
    close,
    metadata: {
      databaseName,
      collectionName,
    },
    async loadContent(args) {
      const page = args?.page;
      return await transformedContentCollection
        .find(page ? (pageIdentity(page) as Filter<TC>) : {})
        .project<TC>({ _id: 0 })
        .toArray();
    },

    async deleteContent({ page, dataSources, inverseDataSources = false }) {
      const deleteResult = await transformedContentCollection.deleteMany({
        ...(page ? pageIdentity(page) : undefined),
        ...(dataSources
          ? {
              sourceName: {
                [inverseDataSources ? "$nin" : "$in"]: dataSources,
              },
            }
          : undefined),
      } as Filter<TC>);
      if (!deleteResult.acknowledged) {
        throw new Error("Deletion not acknowledged!");
      }
    },

    async updateContent({ page, transformedContent }) {
      assert(transformedContent.length !== 0);
      transformedContent.forEach((transformedContent) => {
        assert(
          transformedContent.sourceName === page.sourceName &&
            transformedContent.url === page.url,
          `TransformedContent source/url (${transformedContent.sourceName} / ${transformedContent.url}) must match give page source/url (${page.sourceName} / ${page.url})!`
        );
      });
      await mongoClient.withSession(async (session) => {
        await session.withTransaction(async () => {
          // First delete all transformed content for the given page
          const deleteResult = await transformedContentCollection.deleteMany(
            pageIdentity(page) as Filter<TC>,
            { session }
          );
          if (!deleteResult.acknowledged) {
            throw new Error("Deletion not acknowledged!");
          }

          // Insert the transformed content for the page
          const insertResult = await transformedContentCollection.insertMany(
            [...transformedContent] as OptionalUnlessRequiredId<TC>[],
            {
              session,
            }
          );

          if (!insertResult.acknowledged) {
            throw new Error("EmbeddedContent insertion not acknowledged!");
          }
          const { insertedCount } = insertResult;
          if (insertedCount !== transformedContent.length) {
            throw new Error(
              `Expected ${transformedContent.length} inserted, got ${insertedCount}`
            );
          }
        });
      });
    },
    async init() {
      await transformedContentCollection.createIndex({ sourceName: 1 });
      await transformedContentCollection.createIndex({ url: 1 });
    },
  };
}
