import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createChatbot } from "./chatbot/engine.js";
import { createConversationLogger } from "./chatbot/logger.js";
import { readJsonFile } from "./loadData.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

export async function createApp(options = {}) {
  const knowledgeBase =
    options.knowledgeBase || (await readJsonFile(join(rootDir, "data", "knowledge-base.json")));
  const guardrails =
    options.guardrails || (await readJsonFile(join(rootDir, "data", "guardrails.json")));
  const logger =
    options.logger || createConversationLogger(join(rootDir, "logs", "conversations.jsonl"));
  const chatbot = options.chatbot || createChatbot({ knowledgeBase, guardrails, logger });

  const app = express();

  app.use(express.json());
  app.use(express.static(join(rootDir, "public")));

  app.get("/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  app.post("/chat", async (request, response, next) => {
    try {
      const result = await handleChatRequestBody(request.body, chatbot);
      response.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  });

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({ error: "internal_server_error" });
  });

  return app;
}

export async function handleChatRequestBody(body, chatbot) {
  const validationError = validateChatRequest(body);

  if (validationError) {
    return {
      status: 400,
      body: { error: validationError }
    };
  }

  return {
    status: 200,
    body: await chatbot.reply(body)
  };
}

function validateChatRequest(body) {
  if (!body || typeof body !== "object") {
    return "request_body_required";
  }

  if (typeof body.session_id !== "string" || body.session_id.trim().length === 0) {
    return "session_id_required";
  }

  if (typeof body.message !== "string" || body.message.trim().length === 0) {
    return "message_required";
  }

  return null;
}
