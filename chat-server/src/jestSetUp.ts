import { logger } from "chat-core";
import { meetsChatQualityStandards } from "./llmQualitativeTests/meetsChatQualityStandardsJestExtension";

// silence logger for tests
logger.transports.forEach((t) => (t.silent = true));
console.log("hello");
expect.extend({
  async toMeetChatQualityStandard(
    received: string,
    expectedOutputDescription: string
  ) {
    return meetsChatQualityStandards(received, expectedOutputDescription);
  },
});
