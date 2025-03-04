import xml2js from "xml2js";

export type InitialWebSource = {
  /**
   The name of the web source.
   */
  name: string;

  /**
   An array of URLs associated with the web source.
   */
  urls: string[];

  /**
   An optional array of directory URLs associated with the web source.
   All URLs in the directory are part of the web source.
   */
  directoryUrls?: string[];

  /**
   Optional additional metadata determined by the web source.
   */
  staticMetadata?: Record<string, string>;
};

export const initialWebSources: InitialWebSource[] = [
  {
    name: "company",
    urls: [
      "https://www.mongodb.com/company",
      "https://www.mongodb.com/company/careers",
      "https://www.mongodb.com/company/leadership-principles",
      "https://www.mongodb.com/company/our-story",
      "https://www.mongodb.com/company/values",
    ],
    staticMetadata: {
      type: "Company",
    },
  },
  {
    name: "services",
    urls: [
      "https://www.mongodb.com/services/consulting",
      "https://www.mongodb.com/services/consulting/ai-accelerator",
      "https://www.mongodb.com/services/consulting/ai-applications-program",
      "https://www.mongodb.com/services/consulting/flex-consulting",
      "https://www.mongodb.com/services/consulting/major-version-upgrade",
      "https://www.mongodb.com/services/consulting/relational-migration-methodology",
      "https://www.mongodb.com/services/training",
    ],
    staticMetadata: {
      type: "Services",
    },
  },
  {
    name: "products",
    urls: [
      "https://www.mongodb.com/products",
      "https://www.mongodb.com/products/capabilities/security",
      "https://www.mongodb.com/products/capabilities/security/encryption",
      "https://www.mongodb.com/products/integrations/hashicorp-terraform",
      "https://www.mongodb.com/products/integrations/kubernetes/atlas-kubernetes-operator",
      "https://www.mongodb.com/products/platform/atlas-charts",
      "https://www.mongodb.com/products/platform/atlas-cloud-providers/aws",
      "https://www.mongodb.com/products/platform/atlas-cloud-providers/azure",
      "https://www.mongodb.com/products/platform/atlas-cloud-providers/google-cloud",
      "https://www.mongodb.com/products/platform/atlas-database",
      "https://www.mongodb.com/products/platform/atlas-for-government",
      "https://www.mongodb.com/products/platform/atlas-online-archive",
      "https://www.mongodb.com/products/platform/atlas-search",
      "https://www.mongodb.com/products/platform/atlas-stream-processing",
      "https://www.mongodb.com/products/platform/atlas-vector-search",
      "https://www.mongodb.com/products/platform/atlas-vector-search/features",
      "https://www.mongodb.com/products/platform/atlas-vector-search/getting-started",
      "https://www.mongodb.com/products/platform/cloud-backup",
      "https://www.mongodb.com/products/platform/trust",
      "https://www.mongodb.com/products/self-managed/community-edition",
      "https://www.mongodb.com/products/self-managed/enterprise-advanced",
      "https://www.mongodb.com/products/tools",
      "https://www.mongodb.com/products/tools/atlas-cli",
      "https://www.mongodb.com/products/tools/compass",
      "https://www.mongodb.com/products/tools/intellij",
      "https://www.mongodb.com/products/tools/relational-migrator",
      "https://www.mongodb.com/products/tools/vs-code",
      "https://www.mongodb.com/products/updates/version-release",
    ],
    staticMetadata: {
      type: "Products",
    },
  },
  {
    name: "solutions",
    directoryUrls: [
      "https://www.mongodb.com/solutions/customer-case-studies",
      "https://www.mongodb.com/solutions/solutions-library",
    ],
    urls: [
      "https://www.mongodb.com/solutions/developer-data-platform",
      "https://www.mongodb.com/solutions/industries",
      "https://www.mongodb.com/solutions/industries/financial-services",
      "https://www.mongodb.com/solutions/industries/healthcare",
      "https://www.mongodb.com/solutions/industries/insurance",
      "https://www.mongodb.com/solutions/industries/manufacturing",
      "https://www.mongodb.com/solutions/industries/media-and-entertainment",
      "https://www.mongodb.com/solutions/industries/public-sector",
      "https://www.mongodb.com/solutions/industries/retail",
      "https://www.mongodb.com/solutions/industries/telecommunications",
      "https://www.mongodb.com/solutions/startups",
      "https://www.mongodb.com/solutions/use-cases",
      "https://www.mongodb.com/solutions/use-cases/artificial-intelligence",
      "https://www.mongodb.com/solutions/use-cases/gaming",
      "https://www.mongodb.com/solutions/use-cases/payments",
      "https://www.mongodb.com/solutions/use-cases/serverless",

    ],
    staticMetadata: {
      type: "Solutions",
    },
  },
  {
    name: "resources",
    urls: [
      "https://www.mongodb.com/resources/basics/ai-hallucinations",
      "https://www.mongodb.com/resources/basics/ai-in-finance",
      "https://www.mongodb.com/resources/basics/ai-stack",
      "https://www.mongodb.com/resources/basics/ann-search",
      "https://www.mongodb.com/resources/basics/artificial-intelligence/ai-agents",
      "https://www.mongodb.com/resources/basics/artificial-intelligence/ai-stack/",
      "https://www.mongodb.com/resources/basics/artificial-intelligence/generative-ai-use-cases",
      "https://www.mongodb.com/resources/basics/artificial-intelligence/machine-learning-healthcare",
      "https://www.mongodb.com/resources/basics/artificial-intelligence/retrieval-augmented-generation",
      "https://www.mongodb.com/resources/basics/cloud-explained/business-intelligence-bi-tools",
      "https://www.mongodb.com/resources/basics/cloud-explained/iaas-infrastructure-as-a-service",
      "https://www.mongodb.com/resources/basics/cloud-explained/iot-architecture/",
      "https://www.mongodb.com/resources/basics/cognitive-search",
      "https://www.mongodb.com/resources/basics/data-engineering/",
      "https://www.mongodb.com/resources/basics/databases/acid-transactions/",
      "https://www.mongodb.com/resources/basics/databases/cloud-databases/cloud-migration",
      "https://www.mongodb.com/resources/basics/databases/cloud-databases/free-cloud-database",
      "https://www.mongodb.com/resources/basics/databases/cloud-databases/free-cloud-database/",
      "https://www.mongodb.com/resources/basics/databases/database-hosting/",
      "https://www.mongodb.com/resources/basics/databases/in-memory-database/",
      "https://www.mongodb.com/resources/basics/databases/key-value-database/",
      "https://www.mongodb.com/resources/basics/databases/middleware",
      "https://www.mongodb.com/resources/basics/databases/nosql-explained/",
      "https://www.mongodb.com/resources/basics/databases/nosql-explained/nosql-vs-sql/",
      "https://www.mongodb.com/resources/basics/databases/what-is-an-object-oriented-database/",
      "https://www.mongodb.com/resources/basics/disaster-recovery",
      "https://www.mongodb.com/resources/basics/foundation-models",
      "https://www.mongodb.com/resources/basics/full-stack-development/",
      "https://www.mongodb.com/resources/basics/fuzzy-match/",
      "https://www.mongodb.com/resources/basics/hierarchical-navigable-small-world",
      "https://www.mongodb.com/resources/basics/implementing-an-operational-data-layer",
      "https://www.mongodb.com/resources/basics/json-and-bson/",
      "https://www.mongodb.com/resources/basics/langchain",
      "https://www.mongodb.com/resources/basics/named-entity-recognition",
      "https://www.mongodb.com/resources/basics/observability",
      "https://www.mongodb.com/resources/basics/predictive-ai",
      "https://www.mongodb.com/resources/basics/prompt-engineering",
      "https://www.mongodb.com/resources/basics/quantum-machine-learning",
      "https://www.mongodb.com/resources/basics/real-time-payments",
      "https://www.mongodb.com/resources/basics/reinforcement-learning",
      "https://www.mongodb.com/resources/basics/role-based-access-control",
      "https://www.mongodb.com/resources/basics/self-supervised-learning",
      "https://www.mongodb.com/resources/basics/system-of-insight",
      "https://www.mongodb.com/resources/basics/unified-modeling-language",
      "https://www.mongodb.com/resources/basics/unstructured-data/tools",
      "https://www.mongodb.com/resources/basics/vector-embeddings",
      "https://www.mongodb.com/resources/basics/vector-index",
      "https://www.mongodb.com/resources/basics/vector-search",
      "https://www.mongodb.com/resources/basics/vector-stores/",
      "https://www.mongodb.com/resources/basics/what-is-stream-processing",
      "https://www.mongodb.com/resources/compare/mongodb-atlas-search-vs-elastic-elasticsearch",
      "https://www.mongodb.com/resources/compare/mongodb-oracle",
      "https://www.mongodb.com/resources/compare/mongodb-postgresql",
      "https://www.mongodb.com/resources/compare/mongodb-postgresql/dsl-migrating-postgres-to-mongodb",
      "https://www.mongodb.com/resources/products/capabilities/stored-procedures",
      "https://www.mongodb.com/resources/products/compatibilities/kubernetes",
      "https://www.mongodb.com/resources/products/fundamentals/why-use-mongodb",
      "https://www.mongodb.com/resources/solutions/use-cases/energy-modernization-with-mongodb",
      "https://www.mongodb.com/resources/solutions/use-cases/generative-ai-predictive-maintenance-applications",
      "https://www.mongodb.com/resources/solutions/use-cases/mysql-to-mongodb",
    ],
    staticMetadata: {
      type: "Resources",
    },
  },
  {
    name: "web-misc",
    urls: [
      "https://learn.mongodb.com",
      "https://support.mongodb.com/",
      "https://www.mongodb.com",
      "https://www.mongodb.com/atlas",
      "https://www.mongodb.com/leadership",
      "https://www.mongodb.com/legal/acceptable-use-policy",
      "https://www.mongodb.com/legal/licensing/server-side-public-license",
      "https://www.mongodb.com/legal/privacy-policy",
      "https://www.mongodb.com/legal/terms-of-use",
      "https://www.mongodb.com/pricing",
      "https://www.mongodb.com/try/download/community",
      "https://www.mongodb.com/try/download/compass",
      "https://www.mongodb.com/why-use-mongodb",
    ],
  },
];

export async function getUrlsFromSitemap(
  sitemapURL: string
): Promise<string[]> {
  const response = await fetch(sitemapURL);
  const sitemap = await response.text();
  const parser = new xml2js.Parser();
  const parsedXML = await parser.parseStringPromise(sitemap);
  return parsedXML.urlset.url.map((url: { loc: string[] }) => url.loc[0]);
}

export type WebSource = {
  name: string;
  urls: string[];
  staticMetadata?: Record<string, string>;
};

type PrepareWebSourcesParams = {
  initialWebSources: InitialWebSource[];
  sitemapUrls: string[];
};

/**
 Processes initial web sources
 For web sources that have directories listed, all URLs within the directory are added to the web source urls list.
 The sitemapUrls are used to find the URLs in the directory.
 */
export const prepareWebSources = async ({
  initialWebSources,
  sitemapUrls,
}: PrepareWebSourcesParams): Promise<WebSource[]> => {
  const webSources: WebSource[] = [];
  for (const initialWebSource of initialWebSources) {
    const { name, staticMetadata } = initialWebSource;
    let urls = initialWebSource.urls || [];
    if (initialWebSource.directoryUrls?.length) {
      for (const directoryUrl of initialWebSource.directoryUrls) {
        urls = [
          ...urls,
          ...sitemapUrls.filter((url) => url.includes(directoryUrl)),
        ];
      }
    }
    webSources.push({
      name,
      staticMetadata,
      urls,
    });
  }
  return webSources;
};
