import { createHash } from "crypto";
import { PromisePool } from "@supercharge/promise-pool";
import { logger } from "../logger";
import { Page } from "./Page";
import {
  TransformedContent,
  TransformedContentStore,
} from "./TransformedContent";

export interface TransformConcurrencyOptions {
  /**
    Number of pages to transform concurrently.
   */
  processPages?: number;
}

export type TransformPage<T extends TransformedContent> = (
  page: Page
) => Promise<T[]>;

/**
  (Re-)transform content for pages and persist the transformedContent in the TransformedContentStore.
 */
export async function updateTransformedContent<TC extends TransformedContent>({
  transformedContentStore,
  pages,
  transformPage,
  concurrencyOptions,
}: {
  transformedContentStore: TransformedContentStore<TC>;
  pages: Page[];
  transformPage: TransformPage<TC>;
  concurrencyOptions?: TransformConcurrencyOptions;
}): Promise<void> {
  await PromisePool.withConcurrency(concurrencyOptions?.processPages ?? 1)
    .for(pages)
    .process(async (page) => {
      await updateTranformedContentForPage({
        store: transformedContentStore,
        page,
        transformPage,
      });
    });
}

const chunkAlgoHashes = new Map<string, string>();

const getHashForFunc = (f: { toString(): string }): string => {
  const data = f.toString();
  const existingHash = chunkAlgoHashes.get(data);
  if (existingHash) {
    return existingHash;
  }
  const hash = createHash("sha256");
  hash.update(data);
  const digest = hash.digest("hex");
  chunkAlgoHashes.set(data, digest);
  return digest;
};

export async function updateTranformedContentForPage<
  TC extends TransformedContent
>({
  page,
  store,
  transformPage,
}: {
  page: Page;
  store: TransformedContentStore<TC>;
  transformPage: TransformPage<TC>;
}): Promise<void> {
  const contentChunks = await transformPage(page);

  if (contentChunks.length === 0) {
    // This could happen if source returned a page with no content
    logger.warn(
      `No content for page ${page.sourceName}:${page.url} - deleting any existing content and continuing`
    );
    await store.deleteContent({ page });
    return;
  }

  const existingContent = await store.loadContent({
    page,
  });

  const transformAlgoHash = getHashForFunc(transformPage);
  const hasContentChunks = contentChunks.length > 0;
  const hasSameNumberOfChunks = contentChunks.length === existingContent.length;
  const hasSameTransformAlgoHash =
    existingContent.at(0)?.transformAlgoHash === transformAlgoHash;

  const doNotUpdate =
    hasContentChunks && hasSameNumberOfChunks && hasSameTransformAlgoHash;
  if (doNotUpdate) {
    logger.info(
      `Transformed content for ${page.sourceName}:${page.url} already updated (${existingContent[0].updated}). Skipping transform.`
    );
    return;
  }

  logger.info(`Adding transformed content for: ${page.url}`);

  const transformedContent = contentChunks.map(
    (chunk) =>
      ({
        ...chunk,
        transformAlgoHash,
      } satisfies TC)
  );

  await store.updateContent({
    page,
    transformedContent,
  });
}
