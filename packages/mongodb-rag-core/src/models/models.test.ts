/**
  @description Quick test to make sure all the models are functional.
  Useful to test before executing benchmark runs to ensure all models are working.
 */
import { assertEnvVars } from "../assertEnvVars";
import { BRAINTRUST_ENV_VARS, GCP_VERTEX_AI_ENV_VARS } from "../CoreEnvVars";
import { models } from "./models";
import { makeOpenAiClientFactory } from "./makeOpenAiClientFactory";
import { OpenAI } from "openai";
import "dotenv/config";

jest.setTimeout(60000);

// NOTE: due to this issue https://github.com/nodejs/node/issues/39964,
// you must run the tests with a Node version >= 20.0.0

describe.skip("Braintrust models", () => {
  test.each(models.filter((m) => m.provider === "braintrust"))(
    "'$label' model should generate data",
    async (model) => {
      const { BRAINTRUST_API_KEY, BRAINTRUST_ENDPOINT } =
        assertEnvVars(BRAINTRUST_ENV_VARS);
      const openAiClientFactory = makeOpenAiClientFactory({
        braintrust: {
          apiKey: BRAINTRUST_API_KEY,
          endpoint: BRAINTRUST_ENDPOINT,
        },
      });
      const openAiClient = openAiClientFactory.makeOpenAiClient(model);
      await expectModelResponse(openAiClient, model.deployment);
    }
  );
});

describe.skip("GCP Vertex AI models", () => {
  test.each(models.filter((m) => m.provider === "gcp_vertex_ai"))(
    "'$label' model should generate data",
    async (model) => {
      const { GCP_API_KEY, GCP_OPENAI_ENDPOINT } = assertEnvVars(
        GCP_VERTEX_AI_ENV_VARS
      );
      const openAiClientFactory = makeOpenAiClientFactory({
        vertexAi: {
          apiKey: GCP_API_KEY,
          endpoint: GCP_OPENAI_ENDPOINT,
        },
      });
      const openAiClient = openAiClientFactory.makeOpenAiClient(model);
      await expectModelResponse(openAiClient, model.deployment);
    }
  );
});

async function expectModelResponse(client: OpenAI, model: string) {
  const res = await client.chat.completions.create({
    model,
    messages: [
      // Add the time to system message to override any caching behavior.
      {
        role: "system",
        content: `You are a helpful assistant. The time is ${new Date().toISOString()}`,
      },
      { role: "user", content: "Hello, what time is it?" },
    ],
  });

  console.log(`"${model}" response:`, res.choices[0].message.content);
  expect(res.choices[0].message.content).toEqual(expect.any(String));
}
