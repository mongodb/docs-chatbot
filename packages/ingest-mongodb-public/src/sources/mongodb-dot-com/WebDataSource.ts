import { logger, Page } from "mongodb-rag-core";
import { DataSource } from "mongodb-rag-core/dataSources";
import * as cheerio from "cheerio";
import { Page as PuppeteerPage, Browser } from "puppeteer";
import TurndownService from "turndown";
import * as turndownPluginGfm from "turndown-plugin-gfm";
import { WebSource } from "./webSources";

interface WebDataSourceParams extends WebSource {
  makePuppeteer: () => Promise<{ page: PuppeteerPage; browser: Browser }>;
}

export function makeWebDataSource({
  name,
  urls,
  staticMetadata,
  makePuppeteer,
}: WebDataSourceParams): DataSource {
  return {
    name,
    async fetchPages() {
      const { page: puppeteerPage, browser } = await makePuppeteer();
      const pages: Page[] = [];
      const errors: string[] = [];
      for await (const url of urls) {
        const { content, error } = await scrapePage({
          url,
          puppeteerPage,
        });
        if (content) {
          pages.push({
            url,
            format: "md",
            sourceName: name,
            ...content,
            metadata: { ...content.metadata, ...staticMetadata },
          });
        }
        if (error) {
          errors.push(error);
        }
      }
      logger.error(errors);
      await browser.close();
      return pages;
    },
  };
}

function makeTurndownService({
  baseUrl,
  includeImages,
  includeLinks,
}: {
  baseUrl: string;
  includeImages?: boolean;
  includeLinks?: boolean;
}) {
  // Turndown with correct options
  const turndownService = new TurndownService({
    codeBlockStyle: "fenced",
    headingStyle: "atx",
    bulletListMarker: "-",
  });
  turndownService.use(turndownPluginGfm.gfm);

  // Trim whitespace in Markdown links
  turndownService.addRule("trimLinkText", {
    filter: ["a"], // Matches anchor tags
    replacement: (content, node) => {
      const element = node as Element;
      const trimmedContent = content.trim();
      if (!includeLinks) {
        return trimmedContent;
      }
      let href = element.getAttribute("href");
      if (!href) {
        return content.trim(); // No href, return trimmed content
      }
      if (href.startsWith("/")) {
        href = `${baseUrl.replace(/\/$/, "")}${href}`;
      }

      // Trim whitespace at the beginning and end of the content and construct the Markdown link
      return `[${trimmedContent}](${href.trim()})`;
    },
  });

  // Remove images from Markdown
  if (!includeImages) {
    turndownService.addRule("removeImages", {
      filter: ["img"],
      replacement: () => {
        return ""; // Return an empty string to remove the image
      },
    });
  }
  return turndownService;
}

const mongoDbDotcomTurndownService = makeTurndownService({
  baseUrl: "https://mongodb.com",
});

/**
  Get relevant metadata from the page
 */
function getMetaTags($: cheerio.CheerioAPI): Record<string, string> {
  const metaTags: Record<string, string> = {};

  const meta = $("meta");
  meta.each((_, element) => {
    const $element = $(element);
    const key = $element.attr("name") || $element.attr("property");
    const content = $element.attr("content");

    // Handles open graph tags
    if (key?.startsWith("og:") && content) {
      if (key === "og:site_name") {
        metaTags.siteTitle = content;
      } else if (key === "og:type") {
        metaTags.contentType = content;
      } else if (key === "og:description") {
        metaTags.description = content;
      }
    }
  });

  return metaTags;
}

function removeHtmlElements($: cheerio.CheerioAPI) {
  $("script").remove(); // remove all scripts
  $("style").remove();
  $("header").remove(); // Remove header
  $("#onetrust-consent-sdk").remove(); // Remove privacy + consent stuff
  $(".resource-grid").remove(); // remove resource grids which aren't rendered well to Markdown
  $(".z-\\[9999\\]").remove(); // Remove banner
  $(".pencil-banner-no-underline").remove(); // Remove banner
  $(".CodeMirror-linenumber").remove(); // Remove number line from code blocks
  $("footer").remove(); // Remove footer
  $("nav").remove(); // Remove nav
  return $.html();
}

function getTitle(
  $body: cheerio.CheerioAPI,
  $head: cheerio.CheerioAPI
): string | undefined {
  const bodyTitle = $body("h1").first().text();
  if (bodyTitle.length > 0) {
    return bodyTitle;
  }
  const headTitle = $head("title").first().text();
  if (headTitle.length > 0) {
    return headTitle;
  }
}

async function getContent(
  page: PuppeteerPage
): Promise<Pick<Page, "body" | "metadata" | "title">> {
  const { bodyInnerHtml, headInnerHtml } = await page.evaluate(() => ({
    bodyInnerHtml: document.body.innerHTML,
    headInnerHtml: document.head.innerHTML,
  }));
  const $head = cheerio.load(headInnerHtml);
  const $body = cheerio.load(bodyInnerHtml);

  // Note: must extract metadata before cleaning HTML b/c it's soon removed
  const metadata = getMetaTags($head);

  const cleanedHtml = removeHtmlElements($body);

  const markdown = mongoDbDotcomTurndownService.turndown(cleanedHtml);

  const title = getTitle($body, $head);

  return {
    body: markdown,
    metadata,
    title,
  };
}

type PageContent = Pick<Page, "body" | "metadata" | "title">;

async function scrapePage({
  puppeteerPage,
  url,
}: {
  puppeteerPage: PuppeteerPage;
  url: string;
}): Promise<{ content: PageContent | null; error: string | null }> {
  // TODO: when productionizing, don't re-instantiate the browser on every call
  let content: PageContent | null = null;
  let error: string | null = null;
  try {
    const response = await puppeteerPage.goto(url, {
      waitUntil: "networkidle0",
    });
    if (response?.status() === 404) {
      throw new Error(`404`);
    }
    content = await getContent(puppeteerPage);
  } catch (err) {
    error = `failed to open the page: ${url} with the error: ${err}`;
  }
  return { content, error };
}
