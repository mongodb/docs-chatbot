import "dotenv/config";
import {
  assertEnvVars,
  CORE_CHATBOT_APP_ENV_VARS,
  logger,
  makeMongoDbPageStore,
  makeMongoDbTransformedContentStore,
  PersistedPage,
  updateTransformedContent,
} from "mongodb-rag-core";
import {
  forbiddenUrls,
  publicDatasetSourceName,
} from "../../mongoDbDatasetConstants";
import { uploadDatasetToHuggingFace } from "../../uploadDatasetToHuggingFace";
import { HUGGINGFACE, HUGGINGFACE_DOCS_CODE_EXAMPLES } from "../../EnvVars";
import path from "path";
import { makeTranformPageToAnnotatedCodeExamples } from "../../codeExampleDataset/transformPageToAnnotatedCodeExamples";
import { model, openAiClient } from "../../openAi";
import { CodeExampleDatasetEntry } from "../../codeExampleDataset/createCodeExampleDatasetEntry";
import { Filter } from "mongodb-rag-core/mongodb";

async function uploadCodeExampleDatasetToHuggingFace() {
  logger.info("Staring upload code example dataset to Hugging Face script");

  const {
    HUGGINGFACE_ACCESS_TOKEN,
    HUGGINGFACE_DOCS_CODE_EXAMPLES_REPO,
    MONGODB_CONNECTION_URI,
    MONGODB_DATABASE_NAME,
  } = assertEnvVars({
    ...HUGGINGFACE,
    ...CORE_CHATBOT_APP_ENV_VARS,
    ...HUGGINGFACE_DOCS_CODE_EXAMPLES,
  });

  const pageStore = makeMongoDbPageStore({
    connectionUri: MONGODB_CONNECTION_URI,
    databaseName: MONGODB_DATABASE_NAME,
  });

  const transformedContentStore =
    makeMongoDbTransformedContentStore<CodeExampleDatasetEntry>({
      connectionUri: MONGODB_CONNECTION_URI,
      databaseName: MONGODB_DATABASE_NAME,
      collectionName: "code_examples",
    });

  const MAX_PAGE_TRANSFORM_CONCURRENCY = 8;

  const transformPage = await makeTranformPageToAnnotatedCodeExamples(
    openAiClient,
    model,
    MAX_PAGE_TRANSFORM_CONCURRENCY
  );
  try {
    const pages = await pageStore.loadPages({
      query: makeLoadPagesFilter(
        publicDatasetSourceName,
        Array.from(forbiddenUrls)
      ),
    });
    logger.info(`Loaded pages from MongoDB. Loaded ${pages.length} pages.`);

    // Only transforms content when page was updated after the last transformed content update
    await updateTransformedContent({
      pages,
      transformedContentStore,
      transformPage,
    });
    logger.info(`Updated transformed content in MongoDB`);

    // Get entire code example dataset
    const fullCodeExampleDataset = await transformedContentStore.loadContent();
    logger.info(
      `Loaded code example dataset from MongoDB. Loaded ${fullCodeExampleDataset.length} code examples.`
    );

    const currentDate = new Date().toISOString();
    // Date formatted as yyyy-mm-dd
    const yyyyMmDd = currentDate.split("T")[0];

    const fileBaseName = "public-code-examples";

    logger.info(
      `Uploading dataset to Hugging Face repo '${HUGGINGFACE_DOCS_CODE_EXAMPLES_REPO}'`
    );

    const res = await uploadDatasetToHuggingFace({
      huggingFace: {
        repoName: HUGGINGFACE_DOCS_CODE_EXAMPLES_REPO,
        accessToken: HUGGINGFACE_ACCESS_TOKEN,
      },
      commit: {
        title: `Dataset upload ${yyyyMmDd}`,
        description: `Public MongoDB code example dataset upload ${currentDate}`,
      },
      data: [
        {
          path: path.format({
            name: fileBaseName,
            ext: ".json",
          }),
          content: new Blob([JSON.stringify(fullCodeExampleDataset)]),
        },
      ],
    });
    logger.info(
      `Uploaded dataset to Hugging Face repo '${HUGGINGFACE_DOCS_CODE_EXAMPLES_REPO}'`
    );
    logger.info(res);
  } finally {
    await Promise.allSettled([
      pageStore.close(),
      transformedContentStore.close(),
    ]);
    logger.info("Closed MongoDB connection(s)");
  }
}
uploadCodeExampleDatasetToHuggingFace();

function makeLoadPagesFilter(
  publicDatasetSourceName: RegExp,
  forbiddenUrls: string[]
): Filter<PersistedPage> {
  return {
    sourceName: publicDatasetSourceName,
    url: { $nin: forbiddenUrls },
    action: { $ne: "deleted" },
  };
}
