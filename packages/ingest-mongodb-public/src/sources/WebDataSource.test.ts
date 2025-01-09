import * as Puppeteer from "puppeteer";
import { makePuppeteer, scrapePage } from "./WebDataSource";
import fs from "fs";
jest.setTimeout(60000);

const testPages = [
  {
    name: "company",
    url: "https://www.mongodb.com/company",
  },
  {
    name: "version",
    url: "https://www.mongodb.com/products/updates/version-release",
  },
  {
    name: "enterprise-advanced",
    url: "https://www.mongodb.com/products/self-managed/enterprise-advanced",
  },
  {
    name: "leadership",
    url: "https://www.mongodb.com/leadership",
  },
  {
    name: "customer-case-studies-landing",
    url: "https://www.mongodb.com/solutions/customer-case-studies",
  },
  {
    name: "customer-case-study-novo-nordisk",
    url: "https://www.mongodb.com/solutions/customer-case-studies/novo-nordisk",
  },
  {
    name: "no-sql-explained",
    url: "https://www.mongodb.com/resources/basics/databases/nosql-explained/",
  },
  {
    name: "database-architecture",
    url: "https://www.mongodb.com/resources/basics/databases/database-architecture/",
  },
  {
    name: "solutions-library-landing",
    url: "https://www.mongodb.com/solutions/solutions-library/",
  },
  {
    name: "solutions-library-ai-powered-call-centers",
    url: "https://www.mongodb.com/solutions/solutions-library/ai-powered-call-centers",
  },
];
describe("scrapePage", () => {
  let puppeteerPage: Puppeteer.Page;
  let browser: Puppeteer.Browser;
  beforeAll(async () => {
    const { page: p, browser: b } = await makePuppeteer();
    puppeteerPage = p;
    browser = b;
  });
  afterAll(async () => {
    await browser.close();
  });
  test.each(testPages)("$# $name", async ({ url, name }) => {
    const page = await scrapePage({
      url: url,
      puppeteerPage,
    });
    console.log("title:", page.title);
    fs.writeFileSync(`${name}.md`, page.body);
  });
});
