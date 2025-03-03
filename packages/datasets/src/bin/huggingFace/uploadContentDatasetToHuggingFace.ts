import {
  assertEnvVars,
  CORE_CHATBOT_APP_ENV_VARS,
  logger,
  makeMongoDbPageStore,
} from "mongodb-rag-core";
import {
  forbiddenUrls,
  publicDatasetSourceName,
} from "../../mongoDbDatasetConstants";
import { uploadDatasetToHuggingFace } from "../../uploadDatasetToHuggingFace";
import { HUGGINGFACE, HUGGINGFACE_DOCS_CONTENT } from "../../EnvVars";
import path from "path";
import { loadPagesDataset } from "../../pageDataset/loadPageDataset";

async function uploadContentDatasetToHuggingFace() {
  logger.info("Starting upload content dataset to Hugging Face script");

  const {
    HUGGINGFACE_ACCESS_TOKEN,
    HUGGINGFACE_DOCS_CONTENT_REPO,
    MONGODB_CONNECTION_URI,
    MONGODB_DATABASE_NAME,
  } = assertEnvVars({
    ...HUGGINGFACE,
    ...CORE_CHATBOT_APP_ENV_VARS,
    ...HUGGINGFACE_DOCS_CONTENT,
  });

  const pageStore = makeMongoDbPageStore({
    connectionUri: MONGODB_CONNECTION_URI,
    databaseName: MONGODB_DATABASE_NAME,
  });

  try {
    logger.info("Loading pages dataset from MongoDB");
    const dataset = await loadPagesDataset({
      pageStore,
      dataSourceRegex: publicDatasetSourceName,
      forbiddenUrls: Array.from(forbiddenUrls),
    });
    logger.info(
      `Loaded pages dataset from MongoDB. Dataset has ${dataset.length} entries`
    );

    const currentDate = new Date().toISOString();
    // Date formatted as yyyy-mm-dd
    const yyyyMmDd = currentDate.split("T")[0];

    const fileBaseName = "public-content";

    logger.info(
      `Uploading dataset to Hugging Face repo '${HUGGINGFACE_DOCS_CONTENT_REPO}'`
    );

    const res = await uploadDatasetToHuggingFace({
      huggingFace: {
        repoName: HUGGINGFACE_DOCS_CONTENT_REPO,
        accessToken: HUGGINGFACE_ACCESS_TOKEN,
      },
      commit: {
        title: `Dataset upload ${yyyyMmDd}`,
        description: `Public MongoDB content dataset upload ${currentDate}`,
      },
      data: [
        {
          path: path.format({
            name: fileBaseName,
            ext: ".json",
          }),
          content: new Blob([JSON.stringify(dataset)]),
        },
      ],
    });
    logger.info(
      `Uploaded dataset to Hugging Face repo '${HUGGINGFACE_DOCS_CONTENT_REPO}'`
    );
    logger.info(res);
  } finally {
    await pageStore.close();
    logger.info("Closed MongoDB connection");
  }
}
uploadContentDatasetToHuggingFace();
