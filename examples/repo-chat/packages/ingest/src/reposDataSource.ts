import {
  MakeMdOnGithubDataSourceParams,
  makeMdOnGithubDataSource,
} from "mongodb-rag-core/dataSources";

const repoUrl = "https://github.com/mongodb/chatbot/";
/**
  Can structure pulling from repos like this.

  Note that to clone from a private repo, you must first be authenticated into
  a Github account that has access to the repo. Refer to GH documentation for doing this.
 */
const mongodbChatbotFrameworkDocsConfig: MakeMdOnGithubDataSourceParams = {
  name: "mongodb-rag-framework",
  repoUrl,
  repoLoaderOptions: {
    branch: "main",
  },
  filter: (path) => path.endsWith(".md") && !path.endsWith("README.md"),
  pathToPageUrl(pathInRepo) {
    return `${repoUrl}${pathInRepo}`;
  },
  extractTitle: (pageContent, frontmatter) =>
    (frontmatter?.title as string) ?? extractFirstH1(pageContent),
};

// Helper function
function extractFirstH1(markdownText: string) {
  const lines = markdownText.split("\n");

  for (const line of lines) {
    if (line.startsWith("# ")) {
      // Remove '# ' and any leading or trailing whitespace
      return line.substring(2).trim();
    }
  }
  return null;
}
/**
  Note that you can also fetch repos dynamically since the constructor is just an async function that returns a `DataSource` instance.
  So for example, you could use the GH Octokit SDK to fetch a repo dynamically. Something like:

  ```typescript
  import { Octokit } from "@octokit/rest";

  // Can structure pulling from repos like this.
  // Note that to clone from a private repo, you must first be authenticated into
  // a Github account that has access to the repo. Refer to GH documentation for doing this.

  async function listOrganizationRepos(orgName: string) {
    // Create a new Octokit instance - it will use GITHUB_TOKEN env var by default
    const octokit = new Octokit();

    try {
      const repos = await octokit.paginate(octokit.rest.repos.listForOrg, {
        org: orgName,
        type: 'all', // Include both public and private repos you have access to
        per_page: 100,
      });

      return repos.map(repo => ({
        name: repo.name,
        url: repo.clone_url,
        isPrivate: repo.private,
        description: repo.description,
        defaultBranch: repo.default_branch,
      }));
    } catch (error) {
      console.error(`Error fetching repos for organization ${orgName}:`, error);
      throw error;
    }
  }

  ```

*/
export const mongoDbChatbotFrameworkDocsDataSourceConstructor = async () =>
  await makeMdOnGithubDataSource(mongodbChatbotFrameworkDocsConfig);
