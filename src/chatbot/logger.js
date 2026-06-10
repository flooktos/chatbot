import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

export function createConversationLogger(logPath) {
  return async function logConversation(event) {
    await mkdir(dirname(logPath), { recursive: true });
    const record = {
      timestamp: new Date().toISOString(),
      session_id: event.session_id,
      user_question: event.user_question,
      matched_intent: event.matched_intent,
      response_type: event.response_type,
      confidence_score: Number(event.confidence_score || 0)
    };

    await appendFile(logPath, `${JSON.stringify(record)}\n`, "utf8");
  };
}
