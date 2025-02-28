import { MongoDbPageStore, PersistedPage } from "mongodb-rag-core";

type PageDatasetEntry = Pick<
  PersistedPage,
  "url" | "body" | "metadata" | "title" | "sourceName" | "updated" | "format"
>;

export interface LoadPagesDatasetParams {
  pageStore: MongoDbPageStore;
  /**
    Regular expression to filter pages by `Page.dataSource`
   */
  dataSourceRegex: RegExp;
  /**
    Set of urls to exclude from the dataset
   */
  forbiddenUrls: string[];
}

export async function loadPagesDataset({
  pageStore,
  dataSourceRegex,
  forbiddenUrls,
}: LoadPagesDatasetParams): Promise<PageDatasetEntry[]> {
  return pageStore.aggregatePages<PageDatasetEntry>([
    {
      $match: {
        sourceName: dataSourceRegex,
        url: { $nin: forbiddenUrls },
        action: { $ne: "deleted" },
      },
    },
    {
      $project: {
        url: 1,
        body: 1,
        title: 1,
        format: 1,
        metadata: 1,
        sourceName: 1,
        updated: 1,
      },
    },
  ]);
}
