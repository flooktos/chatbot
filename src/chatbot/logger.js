import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import { randomUUID } from "node:crypto";

export function createConversationLogger(logPath) {
  return async function logConversation(event) {
    await mkdir(dirname(logPath), { recursive: true });
    const record = buildRecord(event);
    await appendFile(logPath, `${JSON.stringify(record)}\n`, "utf8");
  };
}

export function createBlobLogger(blobPrefix) {
  return async function logConversation(event) {
    const { put } = await import("@vercel/blob");
    const record = buildRecord(event);
    const date = record.timestamp.slice(0, 10);
    const path = `${blobPrefix}/${date}/${randomUUID()}.json`;
    await put(path, JSON.stringify(record), {
      access: "public",
      addRandomSuffix: false
    });
  };
}

function buildRecord(event) {
  return {
    timestamp: new Date().toISOString(),
    session_id: event.session_id,
    user_question: event.user_question,
    matched_intent: event.matched_intent,
    response_type: event.response_type,
    confidence_score: Number(event.confidence_score || 0)
  };
}
