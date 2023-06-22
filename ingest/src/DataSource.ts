import { Page } from "./updatePages";

/**
  Represents a source of page data.
 */
export type DataSource = {
  /**
    The unique name among registered data sources.
   */
  name: string;

  /**
    Fetches pages in the data source.
   */
  fetchPages(): Promise<Page[]>;
};
