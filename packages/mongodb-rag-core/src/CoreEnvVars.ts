export const CORE_OPENAI_CONNECTION_ENV_VARS = {
  OPENAI_ENDPOINT: "",
  OPENAI_API_KEY: "",
  OPENAI_API_VERSION: "",
};

export const CORE_OPENAI_RETRIEVAL_ENV_VARS = {
  ...CORE_OPENAI_CONNECTION_ENV_VARS,
  OPENAI_RETRIEVAL_EMBEDDING_DEPLOYMENT: "",
  VECTOR_SEARCH_INDEX_NAME: "",
  FTS_INDEX_NAME: "",
};

export const CORE_OPENAI_VERIFIED_ANSWERS_ENV_VARS = {
  ...CORE_OPENAI_CONNECTION_ENV_VARS,
  OPENAI_VERIFIED_ANSWER_EMBEDDING_DEPLOYMENT: "",
};
export const CORE_OPENAI_CHAT_COMPLETION_ENV_VARS = {
  ...CORE_OPENAI_CONNECTION_ENV_VARS,
  OPENAI_CHAT_COMPLETION_DEPLOYMENT: "",
  OPENAI_CHAT_COMPLETION_MODEL_VERSION: "",
};

export const CORE_OPENAI_ENV_VARS = {
  ...CORE_OPENAI_RETRIEVAL_ENV_VARS,
  ...CORE_OPENAI_VERIFIED_ANSWERS_ENV_VARS,
  ...CORE_OPENAI_CHAT_COMPLETION_ENV_VARS,
};

export const CORE_CHATBOT_APP_ENV_VARS = {
  MONGODB_CONNECTION_URI: "",
  MONGODB_DATABASE_NAME: "",
};

export const CORE_ENV_VARS = {
  ...CORE_OPENAI_ENV_VARS,
  ...CORE_CHATBOT_APP_ENV_VARS,
};
