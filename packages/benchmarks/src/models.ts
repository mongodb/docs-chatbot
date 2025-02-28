export type ModelDeveloper =
  | "OpenAI"
  | "Anthropic"
  | "Meta"
  | "Google"
  | "Mistral"
  | "Amazon";

export type ModelProvider = "braintrust" | "azure_openai" | "gcp_vertex_ai";

export interface ModelConfig {
  /**
    Human-friendly name of model. Used for reporting/analysis.
   */
  label: string;

  /**
    Name of model deployment. Used to call model.
   */
  deployment: string;

  /**
    Where model is hosted. Used to call model.
   */
  provider: ModelProvider;

  /**
    Developer of the model. Used for reporting/analysis.
   */
  developer: ModelDeveloper;

  /**
    Max number of requests to model to execute concurrently.
    Useful to set here because of rate limits on some models.
   */
  maxConcurrency?: number;

  /**
    Amount of miliseconds to wait before calling the execution task.
    Useful to set for models with low rate limits to slow down execution.
   */
  sleepBeforeMs?: number;

  /**
    Arbitrary metadata about the model. Used for reporting/analysis.
   */
  metadata?: Record<string, unknown>;

  /**
    Whether the model is officially authorized by MongoDB.
   */
  authorized?: boolean;
}

/**
  List of available LLMs.
 */
export const models: ModelConfig[] = [
  {
    label: "gpt-4o",
    deployment: "gpt-4o",
    developer: "OpenAI",
    maxConcurrency: 2,
    provider: "braintrust",
    metadata: {
      modelVersion: "2024-08-06",
      rateLimitTpm: 110000,
    },
    authorized: true,
  },
  {
    label: "gpt-4o-mini",
    deployment: "gpt-4o-mini",
    developer: "OpenAI",
    maxConcurrency: 5,
    provider: "braintrust",
    metadata: {
      modelVersion: "2024-07-18",
      rateLimitTpm: 4070000,
    },
    authorized: true,
  },
  {
    label: "gpt-35-turbo-16k",
    deployment: "gpt-35-turbo-16k",
    developer: "OpenAI",
    maxConcurrency: 1,
    provider: "braintrust",
    metadata: {
      rateLimitTpm: 70000,
      modelVersion: "0613",
    },
    sleepBeforeMs: 5000,
    authorized: true,
  },
  {
    label: "claude-3-sonnet",
    deployment: "us.anthropic.claude-3-sonnet-20240229-v1:0",
    developer: "Anthropic",
    maxConcurrency: 1,
    provider: "braintrust",
    authorized: true,
  },
  {
    label: "claude-3-haiku",
    deployment: "us.anthropic.claude-3-haiku-20240307-v1:0",
    developer: "Anthropic",
    maxConcurrency: 3,
    provider: "braintrust",
    authorized: true,
  },
  {
    label: "claude-35-sonnet",
    deployment: "us.anthropic.claude-3-5-sonnet-20240620-v1:0",
    developer: "Anthropic",
    maxConcurrency: 1,
    provider: "braintrust",
    authorized: true,
  },
  {
    label: "claude-35-sonnet-v2",
    deployment: "us.anthropic.claude-3-5-sonnet-20241022-v2:0",
    developer: "Anthropic",
    maxConcurrency: 1,
    provider: "braintrust",
    authorized: true,
  },
  {
    label: "claude-35-haiku",
    deployment: "us.anthropic.claude-3-5-haiku-20241022-v1:0",
    developer: "Anthropic",
    maxConcurrency: 5,
    provider: "braintrust",
    authorized: true,
  },
  {
    label: "llama-3-70b",
    deployment: "meta.llama3-70b-instruct-v1:0",
    developer: "Meta",
    maxConcurrency: 1,
    provider: "braintrust",
    authorized: true,
  },
  {
    label: "mistral-large-2",
    deployment: "mistral.mistral-large-2402-v1:0",
    developer: "Mistral",
    maxConcurrency: 1,
    provider: "braintrust",
    authorized: true,
  },
  {
    label: "llama-3.1-70b",
    deployment: "us.meta.llama3-1-70b-instruct-v1:0",
    developer: "Meta",
    maxConcurrency: 1,
    provider: "braintrust",
    authorized: true,
  },
  {
    label: "llama-3.2-90b",
    deployment: "us.meta.llama3-2-90b-instruct-v1:0",
    developer: "Meta",
    maxConcurrency: 1,
    provider: "braintrust",
    authorized: true,
  },
  {
    label: "nova-lite-v1:0",
    deployment: "amazon.nova-lite-v1:0",
    developer: "Amazon",
    provider: "braintrust",
    maxConcurrency: 3,
    authorized: true,
  },
  {
    label: "nova-micro-v1:0",
    deployment: "amazon.nova-micro-v1:0",
    developer: "Amazon",
    provider: "braintrust",
    maxConcurrency: 3,
    authorized: true,
  },
  {
    label: "nova-pro-v1:0",
    deployment: "amazon.nova-pro-v1:0",
    developer: "Amazon",
    provider: "braintrust",
    maxConcurrency: 1,
    authorized: true,
  },
  {
    label: "o3-mini",
    deployment: "o3-mini",
    developer: "OpenAI",
    provider: "braintrust",
    authorized: true,
  },
  {
    label: "gemini-1.5-flash-002",
    deployment: "google/gemini-1.5-flash-002",
    developer: "Google",
    maxConcurrency: 3,
    provider: "gcp_vertex_ai",
    authorized: true,
  },
  {
    label: "gemini-2-flash",
    deployment: "models/gemini-2.0-flash-001",
    developer: "Google",
    maxConcurrency: 3,
    provider: "gcp_vertex_ai",
    authorized: true,
  },
  {
    label: "gemini-1.5-pro-002",
    deployment: "google/gemini-1.5-pro-002",
    developer: "Google",
    provider: "gcp_vertex_ai",
    maxConcurrency: 1,
    authorized: true,
  },
  {
    label: "gemini-1.0-pro-002",
    deployment: "google/gemini-1.0-pro-002",
    developer: "Google",
    provider: "gcp_vertex_ai",
    maxConcurrency: 1,
    authorized: true,
  },
] as const;
