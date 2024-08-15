export const INGEST_DEVCENTER_ENV_VARS = {
  DEVCENTER_CONNECTION_URI: "",
};

export const INGEST_MDBU_ENV_VARS = {
  UNIVERSITY_DATA_API_KEY: "",
};

export const INGEST_ENV_VARS = {
  MONGODB_CONNECTION_URI: "",
  ...INGEST_DEVCENTER_ENV_VARS,
  ...INGEST_MDBU_ENV_VARS,
};
