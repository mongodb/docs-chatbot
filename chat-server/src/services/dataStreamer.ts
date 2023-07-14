import { Response } from "express";
import { OpenAiStreamingResponse } from "./llm";
import { logger } from "chat-core";

function escapeNewlines(str: string): string {
  return str.replaceAll(`\n`, `\\n`);
}

interface ServerSentEventDispatcher<Data extends object | string> {
  connect(): void;
  disconnect(): void;
  sendData(data: Data): void;
  sendEvent(eventType: string, data: Data): void;
}

type ServerSentEventData = object | string;

function makeServerSentEventDispatcher<
  D extends ServerSentEventData = ServerSentEventData
>(res: Response): ServerSentEventDispatcher<D> {
  return {
    connect() {
      // Define SSE headers and flush them to the client to establish a connection
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Connection", "keep-alive");
      res.flushHeaders();
    },
    disconnect() {
      res.end();
    },
    sendData(data) {
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    },
    sendEvent(eventType, data) {
      res.write(`event: ${eventType}\n`);
      res.write(`data: ${JSON.stringify(data)}\n\n`);
    },
  };
}

interface StreamParams {
  stream: OpenAiStreamingResponse;
  furtherReading?: string;
}

type ChatbotStreamEvent =
  | { type: "delta"; data: string }
  | { type: "finished"; data: string };

export interface DataStreamer {
  connected: boolean;
  connect(res: Response): void;
  disconnect(): void;
  streamData(data: ChatbotStreamEvent): void;
  stream(params: StreamParams): Promise<string>;
}

export function makeDataStreamer(): DataStreamer {
  let _connected = false;
  let _sse: ServerSentEventDispatcher<ChatbotStreamEvent> | undefined;

  return {
    get connected() {
      return _connected;
    },
    connect(res) {
      if (this.connected) {
        throw new Error("Tried to connect SSE, but it was already connected.");
      }
      _sse = makeServerSentEventDispatcher<ChatbotStreamEvent>(res);
      // If the client closes the connection, stop sending events
      res.on("close", () => {
        if (this.connected) {
          this.disconnect();
        }
      });
      _sse.connect();
      _connected = true;
    },

    disconnect() {
      if (!this.connected) {
        throw new Error(
          "Tried to disconnect SSE, but it was already disconnected."
        );
      }
      _sse?.disconnect();
      _sse = undefined;
      // _res = undefined;
      _connected = false;
    },

    streamData(data: ChatbotStreamEvent) {
      if (!this.connected) {
        throw new Error(
          `Tried to stream data, but there's no SSE connection. Call DataStreamer.connect() first.`
        );
      }
      _sse?.sendData(data);
    },

    async stream({ stream }: StreamParams) {
      let streamedData = "";
      for await (const event of stream) {
        // The event could contain many choices, but we only want the first one
        const choice = event.choices[0];
        if (choice.delta) {
          const content = escapeNewlines(choice.delta.content ?? "");
          this.streamData({
            type: "delta",
            data: content,
          });
          streamedData += content;
        } else if (choice.message) {
          logger.warn(
            `Unexpected message in stream: no delta. Message: ${JSON.stringify(
              choice.message
            )}`
          );
        }
      }
      return streamedData;
    },
  };
}
