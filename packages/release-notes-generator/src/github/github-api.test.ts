import "dotenv/config";
import { makeGitHubReleaseArtifacts } from "./github-api";

import { GitCommitArtifact } from "./artifacts";

describe("makeGitHubReleaseArtifacts", () => {
  it("returns a handle that can fetch commits and diffs", async () => {
    const gitHubReleaseArtifacts = makeGitHubReleaseArtifacts({
      githubApi,
      owner: "mongodb",
      repo: "chatbot",
      version: "mongodb-chatbot-ui-v0.4.0",
      previousVersion: "mongodb-chatbot-ui-v0.3.1",
    });
    const commits = await gitHubReleaseArtifacts.getCommits();
    expect(commits.length).toBeGreaterThan(0);
    expect(commits[0].type).toEqual("git-commit");
    const firstCommit = commits[0] as GitCommitArtifact;
    expect(firstCommit.data.files.length).toBeGreaterThan(0);

    const diffs = await gitHubReleaseArtifacts.getDiffs();
    expect(diffs.length).toBeGreaterThan(0);
  });
});
