import { ObjectId } from "mongodb";
import { Page } from ".";

/**
  The Tranformed content of text stored in the database.
 */
export interface TransformedContent {
  /**
    The URL of the page with the content.
   */
  url: string;

  /**
    The name of the data source the page was loaded from.
   */
  sourceName: string;

  /**
    Chunk of text
   */
  text: string;

  /**
    The date the content was last updated.
   */
  updated: Date;

  /**
    Arbitrary metadata associated with the content. If the content text has
    metadata in Front Matter format, this metadata should match that metadata.
   */
  metadata?: {
    pageTitle?: string;
    tags?: string[];
    [k: string]: unknown;
  };
  /**
    Non-cryptographic hash of the actual chunking function (and its options)
    used to produce this chunk. Used to detect whether the chunk should be
    updated because the function or options have changed.
   */
  transformAlgoHash?: string;
}

export type DeleteTransformedContentArgs = {
  /**
    The page for which to delete content.
    */
  page?: Page;
  /**
    The names of the data sources for which to delete content.
    */
  dataSources?: string[];
  /**
   If true, delete pages that do NOT match the data sources in the query.
   */
  inverseDataSources?: boolean;
};

/**
  Data store of the content.
 */
export type TransformedContentStore<TC extends TransformedContent> = {
  /**
    Load the content for the given page/all pages.
   */
  loadContent(args?: { page: Page }): Promise<TC[]>;

  /**
    Delete all content for the given page and/or data sources.
   */
  deleteContent(args: DeleteTransformedContentArgs): Promise<void>;

  /**
    Replace all content for the given page with the given content.
   */
  updateContent(args: { page: Page; transformedContent: TC[] }): Promise<void>;

  /**
    Close connection to data store.
   */
  close?: () => Promise<void>;

  /**
    Initialize the store.
   */
  init: () => Promise<void>;
};
