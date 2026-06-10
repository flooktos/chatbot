import { checkGuardrail } from "./guardrails.js";
import { createSessionStore } from "./context.js";
import { findBestIntent, findFollowUpIntent } from "./matcher.js";

export const FALLBACK_RESPONSE =
  "ขออภัย ระบบยังไม่มีข้อมูลสำหรับคำถามนี้ครับ\nมีเรื่องอื่นที่ต้องการสอบถามเพิ่มเติมไหมครับ";

export function createChatbot({
  knowledgeBase,
  guardrails,
  logger = async () => {},
  sessionStore = createSessionStore()
}) {
  return {
    sessionStore,

    async reply({ session_id, message }) {
      const guardrailResult = checkGuardrail(message, guardrails);

      if (guardrailResult.blocked) {
        const response = buildResponse({
          intent: null,
          response: guardrails.response,
          type: "guardrail",
          confidence: 1
        });
        await log(logger, session_id, message, response);
        return response;
      }

      const session = sessionStore.get(session_id);
      const followUpIntent = findFollowUpIntent(message, knowledgeBase, session?.last_intent);

      if (followUpIntent) {
        sessionStore.setLastIntent(session_id, followUpIntent.intent_id);
        const response = buildResponse({
          intent: followUpIntent.intent_id,
          response: followUpIntent.response,
          type: "answer",
          confidence: 0.88
        });
        await log(logger, session_id, message, response);
        return response;
      }

      const match = findBestIntent(message, knowledgeBase);

      if (match.intent) {
        sessionStore.setLastIntent(session_id, match.intent.intent_id);
        const response = buildResponse({
          intent: match.intent.intent_id,
          response: match.intent.response,
          type: "answer",
          confidence: match.confidence
        });
        await log(logger, session_id, message, response);
        return response;
      }

      const response = buildResponse({
        intent: null,
        response: FALLBACK_RESPONSE,
        type: "fallback",
        confidence: match.confidence
      });
      await log(logger, session_id, message, response);
      return response;
    }
  };
}

function buildResponse({ intent, response, type, confidence }) {
  return {
    intent,
    response,
    type,
    confidence_score: Number(confidence.toFixed(2))
  };
}

async function log(logger, sessionId, message, response) {
  await logger({
    session_id: sessionId,
    user_question: message,
    matched_intent: response.intent,
    response_type: response.type,
    confidence_score: response.confidence_score
  });
}
