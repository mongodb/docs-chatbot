import "dotenv/config";
import { createConfig } from "../config";
import type { SomeArtifact } from "../artifact";
import {
  assertEnvVars,
  CORE_OPENAI_CONNECTION_ENV_VARS,
} from "mongodb-rag-core";
import { makeStandardConfigMethods } from "./helpers";
import {
  makeGitHubApiClient,
  makeGitHubReleaseArtifacts,
} from "../github/github-api";
import { makeJiraApiClient, makeJiraReleaseArtifacts } from "../jira/jira-api";
import { stripIndents } from "common-tags";

const {
  OPENAI_API_KEY,
  OPENAI_ENDPOINT,
  OPENAI_API_VERSION,
  OPENAI_CHAT_COMPLETION_DEPLOYMENT,
  GITHUB_ACCESS_TOKEN,
  JIRA_USERNAME,
  JIRA_PASSWORD,
} = assertEnvVars({
  ...CORE_OPENAI_CONNECTION_ENV_VARS,
  OPENAI_CHAT_COMPLETION_DEPLOYMENT: "",
  GITHUB_ACCESS_TOKEN: "",
  JIRA_USERNAME: "",
  JIRA_PASSWORD: "",
});

export default createConfig({
  llmMaxConcurrency: 4,
  project: {
    name: "MongoDB Shell",
    description: stripIndents`
      The MongoDB Shell, mongosh, is a JavaScript and Node.js REPL environment for
      interacting with MongoDB deployments in Atlas, locally, or on another remote
      host. Use the MongoDB Shell to test queries and interact with the data in your
      MongoDB database.

      The MongoDB Shell can perform a variety of tasks, including:

      - Connecting to MongoDB deployments
      - Creating and managing databases and collections
      - Running queries and aggregations
      - Inserting, updating, and deleting data
      - Managing database users and roles
      - Creating and managing indexes
      - Running other administrative commands

      The MongoDB Shell is particularly useful for developers and system
      administrators who prefer working within a terminal environment.`,
  },
  ...makeStandardConfigMethods({
    azureOpenAi: {
      apiKey: OPENAI_API_KEY,
      endpoint: OPENAI_ENDPOINT,
      apiVersion: OPENAI_API_VERSION,
      chatCompletionDeployment: OPENAI_CHAT_COMPLETION_DEPLOYMENT,
    },
    logger: {
      namespace: "mongosh",
      outputDir: "./logs/mongosh",
    },
  }),
  fetchArtifacts: async (version): Promise<SomeArtifact[]> => {
    const github = makeGitHubReleaseArtifacts({
      githubApi: makeGitHubApiClient({
        authToken: GITHUB_ACCESS_TOKEN,
      }),
      owner: "mongodb-js",
      repo: "mongosh",
      version: `v${version.current}`,
      previousVersion: `v${version.previous}`,
    });
    const jira = makeJiraReleaseArtifacts({
      jiraApi: makeJiraApiClient({
        username: JIRA_USERNAME,
        password: JIRA_PASSWORD,
      }),
      project: "MONGOSH",
      version: version.current,
    });

    return Array<SomeArtifact>().concat(
      await github.getCommits(),
      await jira.getIssues(),
    );
  },
});
