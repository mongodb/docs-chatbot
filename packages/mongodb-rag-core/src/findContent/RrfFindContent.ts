import { MongoDbEmbeddedContentStore, RrfConfig } from "../contentStore";
import { Embedder } from "../embed";
import { HybridSearchConfigParams } from "./HybridSearchConfigParams";

export type MakeRrfFindContentParams = {
  embedder: Embedder;
  store: MongoDbEmbeddedContentStore;
  config: HybridSearchConfigParams & {
    k?: RrfConfig["k"];
  };
};

/**
  Find content using hybrid search  with Atlas Vector Search, FTS, and **reciprocal rank fusion**.
 */
export const makeRrfFindContent = ({
  embedder,
  store,
  config,
}: MakeRrfFindContentParams) => {
  return async ({ query, ftsQuery }: { query: string; ftsQuery?: string }) => {
    const { embedding } = await embedder.embed({
      text: query,
    });

    const content = await store.hybridSearchRrf({
      ...config,
      fts: {
        ...config.fts,
        query: ftsQuery ?? query,
      },
      vectorSearch: {
        ...config.vectorSearch,
        embedding,
        embeddingPath: store.metadata.embeddingPath,
      },
    });
    return { queryEmbedding: embedding, content };
  };
};
