import {
  createConfiguredAction,
  withConfig,
  withConfigOptions,
} from "../withConfig";
import { createCommand } from "../createCommand";
import { makeRunLogger, type RunLogger } from "../runlogger";
import path from "path";
import { PromisePool } from "@supercharge/promise-pool";
import { makeSummarizer, Summary } from "../chat/makeSummarizer";
import { assertEnvVars } from "mongodb-rag-core";
import { asBulletPoints, loadPromptExamplePairFromFile } from "../chat/utils";
import { createRunId } from "../runId";
import { makeGeneratePrompts } from "../chat/makeGeneratePrompts";
import { makeGenerateResponse } from "../chat/makeGenerateResponse";
import { GENERATOR_LLM_ENV_VARS } from "../ArtifactGeneratorEnvVars";
import { promises as fs } from "fs";
import { z } from "zod";

const { GENERATOR_LLM_MAX_CONCURRENCY, OPENAI_CHAT_COMPLETION_DEPLOYMENT } =
  assertEnvVars({
    ...GENERATOR_LLM_ENV_VARS,
    OPENAI_CHAT_COMPLETION_DEPLOYMENT: "",
  });

let logger: RunLogger;

export interface JiraComment {
  id: string;
  body: string;
  author: {
    emailAddress: string;
    displayName: string;
  };
  created: string;
  updated: string;
}

export interface FormattedJiraIssue {
  key: string;
  projectName: string;
  summary: string;
  status: string;
  created: string;
  updated: string;
  description: string;
  comments: JiraComment[];
}

export type FormattedJiraIssueWithSummary = {
  issue: FormattedJiraIssue;
  summary: Summary;
};

type GenerateJiraPromptResponseCommandArgs = {
  runId?: string;
  llmMaxConcurrency: number;
  maxInputLength?: number;
  issuesFilePath?: string;
  issue?: string | string[];
};

const issueKeysSchema = z.array(z.string());
type IssueKeys = z.infer<typeof issueKeysSchema>;

export default createCommand<GenerateJiraPromptResponseCommandArgs>({
  command: "generateJiraPromptResponse",
  builder(args) {
    return withConfigOptions(args)
      .option("runId", {
        type: "string",
        demandOption: false,
        description:
          "A unique name for the run. This controls where outputs artifacts and logs are stored.",
      })
      .option("llmMaxConcurrency", {
        type: "number",
        demandOption: false,
        default: z.coerce
          .number()
          .default(10)
          .parse(GENERATOR_LLM_MAX_CONCURRENCY),
        description:
          "The maximum number of concurrent requests to the LLM API. Defaults to 10. Can be specified in the config file as GENERATOR_LLM_MAX_CONCURRENCY.",
      })
      .option("maxInputLength", {
        type: "number",
        demandOption: false,
        description:
          "The maximum number of issues to process in this run. Any additional issues are skipped.",
      })
      .option("issuesFilePath", {
        type: "string",
        demandOption: false,
        description:
          "Path to a JSON file containing an array of issue key strings to process.",
      })
      .option("issue", {
        type: "string",
        demandOption: false,
        description: "A single issue key to process.",
      });
  },
  async handler(args) {
    const runId = args.runId ?? createRunId();
    logger = makeRunLogger({
      topic: "GenerateJiraPromptResponse",
      runId,
    });
    logger.logInfo(`Run ID: ${runId}`);
    logger.logInfo(`Running command with args: ${JSON.stringify(args)}`);
    try {
      const result = await withConfig(action, args);
      logger.logInfo(`Success`);
      return result;
    } finally {
      await logger.flushArtifacts();
      await logger.flushLogs();
    }
  },
  describe:
    "Generate prompt-response pairs that crytallize knowledge from raw jira issues.",
});

export const action =
  createConfiguredAction<GenerateJiraPromptResponseCommandArgs>(
    async (
      { jiraApi, openAiClient },
      { llmMaxConcurrency, maxInputLength, issuesFilePath, issue }
    ) => {
      logger.logInfo(`Setting up...`);
      if (!jiraApi) {
        throw new Error(
          "jiraApi is required. Make sure to define it in the config."
        );
      }
      if (!openAiClient) {
        throw new Error(
          "openAiClient is required. Make sure to define it in the config."
        );
      }

      // Determine which Jira issues to process
      const issueKeys: string[] = [];
      if (issue) {
        issueKeys.push(
          ...issueKeysSchema.parse(Array.isArray(issue) ? issue : [issue])
        );
      }
      if (issuesFilePath) {
        issueKeys.push(
          ...issueKeysSchema.parse(
            JSON.parse(await fs.readFile(issuesFilePath, "utf-8"))
          )
        );
      }
      if (issueKeys.length === 0) {
        throw new Error("No issues provided.");
      }

      // Fetch Jira issues
      const jiraMaxConcurrency = 12;
      const { results: jiraIssues } = await PromisePool.for(
        issueKeys.slice(0, maxInputLength)
      )
        .withConcurrency(jiraMaxConcurrency)
        .handleError((error, issueKey) => {
          const parsedErrorMessage = JSON.parse(error.message);
          const logErrorMessage =
            parsedErrorMessage?.errorMessages?.[0] ?? "Something went wrong.";
          logger.logError(
            `Error fetching issue: ${issueKey} - ${logErrorMessage}`
          );
        })
        .process(async (issueKey) => {
          return await jiraApi.getIssue(issueKey);
        });
      logger.appendArtifact("jiraIssues.raw.json", JSON.stringify(jiraIssues));

      interface RawJiraIssue {
        key: string;
        fields: {
          project: {
            name: string;
          };
          summary: string;
          status: {
            name: string;
          };
          created: string;
          updated: string;
          description: string;
          comment: {
            comments: JiraComment[];
          };
        };
      }

      const formattedJiraIssues = (jiraIssues as RawJiraIssue[]).map(
        (issue) => {
          return {
            key: issue.key,
            projectName: issue.fields.project.name,
            summary: issue.fields.summary,
            status: issue.fields.status.name,
            created: issue.fields.created,
            updated: issue.fields.updated,
            description: issue.fields.description,
            comments: issue.fields.comment.comments.map((comment) => {
              return {
                id: comment.id,
                body: comment.body,
                author: {
                  emailAddress: comment.author.emailAddress,
                  displayName: comment.author.displayName,
                },
                created: comment.created,
                updated: comment.updated,
              };
            }),
          } satisfies FormattedJiraIssue;
        }
      );

      logger.appendArtifact(
        "jiraIssues.formatted.json",
        JSON.stringify(formattedJiraIssues)
      );

      // Summarize each issue using a promise pool
      const summarizeJiraIssue = makeSummarizer({
        openAi: {
          client: openAiClient,
          deployment: OPENAI_CHAT_COMPLETION_DEPLOYMENT,
        },
        logger,
        directions: asBulletPoints(
          "The task is to summarize the provided Jira issue.",
          "If there is a notable bug or issue being described, include that in the summary.",
          "If there are any notable comments, include those in the summary.",
          "If there are any notable actions that need to be taken to solve, include specific details about those in the summary."
        ),
        examples: await Promise.all([
          loadPromptExamplePairFromFile(
            path.join(
              __dirname,
              "../jiraPromptResponse/examples/WORKPLACE-119.json"
            )
          ),
          loadPromptExamplePairFromFile(
            path.join(
              __dirname,
              "../jiraPromptResponse/examples/ADMIN-10208.json"
            )
          ),
        ]),
      });

      const summariesByIssueKey = new Map<string, Summary>();
      const { errors: summarizeJiraIssueErrors } = await PromisePool.for(
        jiraIssues
      )
        .withConcurrency(llmMaxConcurrency)
        .process(async (issue) => {
          const summary = await summarizeJiraIssue({
            input: JSON.stringify(issue),
          });
          console.log("summarized issue", issue.key, summary);
          summariesByIssueKey.set(issue.key, summary);
        });
      for (const error of summarizeJiraIssueErrors) {
        logger.logError(`Error summarizing issue: ${error.item}`);
        console.log("Error summarizing issue", error.raw);
      }

      logger.appendArtifact(
        "summaries.json",
        JSON.stringify(Object.fromEntries(summariesByIssueKey))
      );

      // Append summaries to formatted issues
      const formattedIssuesWithSummaries = formattedJiraIssues.map((issue) => {
        const summary = summariesByIssueKey.get(issue.key);
        if (!summary) {
          throw new Error(`No summary found for issue ${issue.key}`);
        }
        return {
          issue,
          summary,
        };
      }) satisfies FormattedJiraIssueWithSummary[];
      logger.appendArtifact(
        "jiraIssues.formattedWithSummaries.json",
        JSON.stringify(formattedIssuesWithSummaries)
      );

      // // Generate a list of N questions/prompts for each issue
      const promptsByIssueKey = new Map<string, string[]>();
      const generatePrompts = makeGeneratePrompts({
        openAi: {
          client: openAiClient,
          deployment: OPENAI_CHAT_COMPLETION_DEPLOYMENT,
        },
        logger,
        directions: asBulletPoints(
          "Assume the prompter is not familiar with or looking for the provided Jira issue specifically.",
          "Assume the prompter is looking for a specific piece of information about the topic or bug discussed in the Jira issue.",
          "The prompt should be a question that can be answered with the information in the Jira issue but not about the issue itself.",
          "If the Jira issue is for a specific language, framework, platform, driver, etc., indicate that in the prompt.",
          "Do not reference hypothetical or speculative information."
        ),
      });
      const { errors: generatePromptsErrors } = await PromisePool.for(
        formattedIssuesWithSummaries
      )
        .withConcurrency(llmMaxConcurrency)
        .process(async ({ issue, summary }) => {
          const { prompts } = await generatePrompts({ issue, summary });
          console.log("generated prompts for issue", issue.key, summary);
          promptsByIssueKey.set(issue.key, prompts);
        });
      for (const error of generatePromptsErrors) {
        logger.logError(`Error generating prompts: ${error.item}`);
      }
      const generatedPrompts: [issueKey: string, prompt: string][] = [
        ...promptsByIssueKey.entries(),
      ].flatMap(([issueKey, prompts]) => {
        return prompts.map((prompt) => [issueKey, prompt] as [string, string]);
      });
      logger.appendArtifact(
        "generatedPrompts.json",
        JSON.stringify(generatedPrompts)
      );

      // Have the LLM generate a response to each prompt with the formatted/summarized issue as context
      const responsesByIssueKey = new Map<
        string,
        [prompt: string, response: string][]
      >();

      const generateResponse = makeGenerateResponse({
        openAi: {
          client: openAiClient,
          deployment: OPENAI_CHAT_COMPLETION_DEPLOYMENT,
        },
        logger,
        directions: asBulletPoints(
          "The response should be as accurate as possible based on the information in the Jira issue.",
          "You may use your knowledge of the topic to provide a more detailed response. However, avoid answering the main request with information that is not in the Jira issue.",
          "Do not make strong claims about MongoDB's product plans or future releases.",
          "Do not directly refer to the product backlog or project management tools.",
          "Do not reference the names of specific people or teams. If you must refer to a person, use a generic term like 'MongoDB employee', 'community member', 'developer', or 'engineer'."
        ),
      });

      const prompts = generatedPrompts.map(([issueKey, prompt]) => {
        const summary = summariesByIssueKey.get(issueKey);
        if (!summary) {
          throw new Error(`No summary found for key ${issueKey}`);
        }
        const issue = formattedJiraIssues.find(
          (issue) => issue.key === issueKey
        );
        if (!issue) {
          throw new Error(`No issue data found for key ${issueKey}`);
        }
        return {
          summary,
          issue,
          prompt,
        };
      });
      let numGeneratedResponses = 0;
      const { errors: generateResponsesErrors } = await PromisePool.for(prompts)
        .withConcurrency(llmMaxConcurrency)
        .process(async ({ summary, issue, prompt }, i) => {
          const { response } = await generateResponse({
            summary,
            issue,
            prompt,
          });
          console.log(
            `generated response ${++numGeneratedResponses}/${prompts.length}`
          );
          if (!responsesByIssueKey.has(issue.key)) {
            responsesByIssueKey.set(issue.key, []);
          }
          responsesByIssueKey.get(issue.key)?.push([prompt, response]);
        });
      for (const error of generateResponsesErrors) {
        const { issue } = error.item;
        logger.logError(
          `Error generating responses for ${issue.key}: ${JSON.stringify(
            error
          )}`
        );
      }
      const generatedResponses = [...responsesByIssueKey.entries()].flatMap(
        ([issueKey, responses]) => {
          return responses.map(([prompt, response]) => ({
            issueKey,
            prompt,
            response,
          }));
        }
      );

      logger.appendArtifact(
        "generatedResponses.json",
        JSON.stringify(generatedResponses)
      );
    }
  );
