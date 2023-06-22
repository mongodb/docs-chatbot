import { MongoClient } from "mongodb";
import { DataSource } from "./DataSource";
import { Page } from "./updatePages";

// This type is based on what's in the DevCenter search_content_prod collection
export type DevCenterEntry = {
  name: string;
  description: string;
  content: string;
  calculated_slug: string;
};

export const makeDevCenterDataSource = async ({
  name,
  connectionUri,
  databaseName,
  collectionName,
}: {
  name: string;
  connectionUri: string;
  databaseName: string;
  collectionName: string;
}): Promise<DataSource> => {
  return {
    name,
    async fetchPages() {
      const client = await new MongoClient(connectionUri).connect();
      try {
        const db = client.db(databaseName);
        const collection = db.collection<DevCenterEntry>(collectionName);
        const documents = collection.find();

        const pages: Page[] = [];
        for await (const document of documents) {
          pages.push({
            body: document.content,
            format: "md",
            sourceName: name,
            tags: [], // TODO
            url: document.calculated_slug, // TODO: should these have the baseurl baked in?
          });
        }
        return pages;
      } finally {
        await client.close();
      }
    },
  };
};
