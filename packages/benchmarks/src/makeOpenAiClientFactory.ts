import { OpenAI } from "mongodb-rag-core/openai";
import { ModelConfig } from "./models";
import { strict as assert } from "assert";
import { wrapOpenAI } from "mongodb-rag-core/braintrust";
interface BaseModelProviderConfig {
  apiKey: string;
  endpoint: string;
}

interface MakeOpenAiClientFactoryParams {
  azure?: BaseModelProviderConfig & {
    apiVersion: string;
  };
  braintrust?: BaseModelProviderConfig;
  vertexAi?: BaseModelProviderConfig;
}

export function makeOpenAiClientFactory({
  azure,
  braintrust,
  vertexAi,
}: MakeOpenAiClientFactoryParams) {
  return {
    makeOpenAiClient(modelConfig: ModelConfig) {
      let openAiClient: OpenAI;
      if (modelConfig.provider === "braintrust") {
        assert(braintrust, "Braintrust OpenAI config must be provided");
        openAiClient = wrapOpenAI(
          new OpenAI({
            apiKey: braintrust.apiKey,
            baseURL: braintrust.endpoint,
          })
        );
      } else if (modelConfig.provider === "gcp_vertex_ai") {
        assert(vertexAi, "GCP Vertex AI config must be provided");
        openAiClient = wrapOpenAI(
          new OpenAI({
            apiKey: vertexAi.apiKey,
            baseURL: vertexAi.endpoint,
          })
        );
      } else {
        throw new Error(`Unsupported provider: ${modelConfig.provider}`);
      }

      return openAiClient;
    },
  };
}
