import express, {
  Express,
  ErrorRequestHandler,
  RequestHandler,
  NextFunction,
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import cors from "cors";
import "dotenv/config";
import {
  ConversationsRouterParams,
  makeConversationsRouter,
} from "./routes/conversations/conversationsRouter";
import { ObjectId } from "mongodb";
import { getRequestId, logRequest, sendErrorResponse } from "./utils";
import { MakeOpenAiChatLlmParams } from "./services/openAiChatLlm";
export type LlmConfig = MakeOpenAiChatLlmParams;
import { CorsOptions } from "cors";

export interface AppConfig {
  conversationsRouterConfig: ConversationsRouterParams;
  maxRequestTimeoutMs?: number;
  corsOptions?: CorsOptions;
}

// General error handler; called at usage of next() in routes
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const reqId = getRequestId(req);
  const httpStatus = err.status || 500;
  const errorMessage = err.message || "Internal Server Error";

  if (!res.headersSent) {
    return sendErrorResponse({
      reqId,
      res,
      httpStatus,
      errorMessage,
    });
  } else {
    logRequest({
      reqId,
      type: "error",
      message: JSON.stringify(err),
    });
  }
};

const reqHandler: RequestHandler = (req, _res, next) => {
  const reqId = new ObjectId().toString();
  // Custom header specifically for a request ID. This ID will be used to track
  // logs related to the same request
  req.headers["req-id"] = reqId;
  const message = `Request for: ${req.url}`;
  logRequest({ reqId, message });
  next();
};

export const makeHandleTimeoutMiddleware = (apiTimeout: number) => {
  return (req: ExpressRequest, res: ExpressResponse, next: NextFunction) => {
    // Set the server response timeout for all HTTP responses
    res.setTimeout(apiTimeout, () => {
      return sendErrorResponse({
        reqId: req.headers["req-id"] as string,
        res,
        httpStatus: 504,
        errorMessage: "Response timeout",
      });
    });
    next();
  };
};

export const API_V1_PREFIX = "/api/v1";
export const CONVERSATIONS_API_V1_PREFIX = `${API_V1_PREFIX}/conversations`;

export const DEFAULT_MAX_REQUEST_TIMEOUT_MS = 60000;
export const makeApp = async ({
  maxRequestTimeoutMs = DEFAULT_MAX_REQUEST_TIMEOUT_MS,
  conversationsRouterConfig,
  corsOptions,
}: AppConfig): Promise<Express> => {
  const app = express();
  app.use(makeHandleTimeoutMiddleware(maxRequestTimeoutMs));
  app.set("trust proxy", true);
  app.use(cors(corsOptions));
  app.use(express.json());
  app.use(reqHandler);
  const { NODE_ENV } = process.env;
  if (
    NODE_ENV === "development" ||
    NODE_ENV === "staging" ||
    NODE_ENV === "qa"
  ) {
    app.use(express.static("static"));
  }
  app.use(
    CONVERSATIONS_API_V1_PREFIX,
    makeConversationsRouter(conversationsRouterConfig)
  );
  app.get("/health", (_req, res) => {
    const data = {
      uptime: process.uptime(),
      message: "Ok",
      date: new Date(),
    };

    res.status(200).send(data);
  });
  app.all("*", (req, res, _next) => {
    return sendErrorResponse({
      reqId: getRequestId(req),
      res,
      httpStatus: 404,
      errorMessage: "Not Found",
    });
  });
  app.use(errorHandler);

  return app;
};
