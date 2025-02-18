import { generate } from "./generate";
import type { Change, ClassifiedChange } from "./change";
import type {
  ExtractChanges,
  FetchArtifacts,
  ProjectInfo,
  SummarizeArtifact,
} from "./config";

import config from "./atlas-cli.config";
import { validateConfig } from "./config";
import { stripIndents } from "common-tags";
import { vi } from "vitest";

const mockProjectInfo: ProjectInfo = {
  name: "Release Notes Generator Test Project",
  description: stripIndents`
    This is a test project for the release notes generator.
    It is used to test the release notes generator.
    It is not a real project.
    It is not used in any real way.
  `,
};

const mockConfig = validateConfig({
  project: mockProjectInfo,
  fetchArtifacts: vi
    .fn()
    .mockImplementation((_args: Parameters<FetchArtifacts>[0]) => {
      return Promise.resolve([
        {
          id: "1",
          type: "mock-artifact",
          data: {
            title: "Test",
          },
        },
      ]);
    }),
  summarizeArtifact: vi
    .fn()
    .mockImplementation((_args: Parameters<SummarizeArtifact>[0]) => {
      return Promise.resolve("Mock summary");
    }),
  extractChanges: vi
    .fn()
    .mockImplementation((_args: Parameters<ExtractChanges>[0]) => {
      return Promise.resolve([
        {
          description: "Mock change description",
          sourceIdentifier: "mock-artifact::1",
        },
      ]);
    }),
  classifyChange: vi.fn().mockImplementation((_change: Change) => {
    return Promise.resolve({
      audience: "external" as const,
      scope: "added" as const,
    });
  }),
  filterChange: vi.fn().mockImplementation((_change: ClassifiedChange) => {
    return true;
  }),
});

describe("generateChangelogs", () => {
  it("generates changelogs based on a mock config", async () => {
    const changes = await generate(mockConfig, {
      current: "0.0.1",
      previous: "0.0.0",
    });
    expect(changes).toBeDefined();
    expect(changes.length).toBeGreaterThan(0);
  });
  it("generates changelogs for a real config", async () => {
    const changes = await generate(validateConfig(config), {
      current: "1.22.0",
      previous: "1.21.0",
    });
    expect(changes).toBeDefined();
    expect(changes.length).toBeGreaterThan(0);
  }, 300000);
});
