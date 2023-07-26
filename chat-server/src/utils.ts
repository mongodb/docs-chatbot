import {
  Request as ExpressRequest,
  Response as ExpressResponse,
} from "express";
import { logger } from "chat-core";
import { stripIndent } from "common-tags";

/**
 * Checks for req-id Request Header. Returns an empty string if the header is not
 * a truthy string.
 *
 * @param req
 * @returns
 */
export const getRequestId = (req: ExpressRequest) => {
  const reqId = req.header("req-id");
  if (!reqId) {
    return "";
  }
  return reqId;
};

export interface LogRequestParams {
  reqId: string;
  message: string;
  type?: "info" | "error";
}

export const logRequest = ({
  reqId,
  message,
  type = "info",
}: LogRequestParams) => {
  logger[type]({ reqId, message });
};

export interface ErrorResponseParams {
  reqId: string;
  res: ExpressResponse;
  httpStatus: number;
  errorMessage: string;
  errorDetails?: string;
}

export const sendErrorResponse = ({
  reqId,
  res,
  httpStatus,
  errorMessage,
  errorDetails,
}: ErrorResponseParams) => {
  logRequest({
    reqId,
    type: "error",
    message: stripIndent`Responding with ${httpStatus} status and error message: ${errorMessage}.
    ${errorDetails ? `Error details: ${errorDetails}` : ""}`,
  });
  return res.status(httpStatus).json({ error: errorMessage });
};
