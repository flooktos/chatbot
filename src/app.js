import express from "express";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createChatbot } from "./chatbot/engine.js";
import { createConversationLogger, createBlobLogger } from "./chatbot/logger.js";
import { getFallbackAnalysis } from "./analytics.js";
import { readJsonFile } from "./loadData.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, "..");

let APP_VERSION = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "";

if (!APP_VERSION) {
  try {
    APP_VERSION = execSync("git rev-parse --short HEAD", { encoding: "utf-8" }).trim();
  } catch {
    APP_VERSION = "unknown";
  }
}

export async function createApp(options = {}) {
  const knowledgeBase =
    options.knowledgeBase || (await readJsonFile(join(rootDir, "data", "knowledge-base.json")));
  const guardrails =
    options.guardrails || (await readJsonFile(join(rootDir, "data", "guardrails.json")));
  const products =
    options.products || (await readJsonFile(join(rootDir, "data", "products.json")));
  const mergedKnowledgeBase = mergeProductIntents(knowledgeBase, products);
  const logger = options.logger || (process.env.VERCEL && process.env.BLOB_READ_WRITE_TOKEN
    ? createBlobLogger("conversations")
    : createConversationLogger(getLogPath()));
  const chatbot = options.chatbot || createChatbot({ knowledgeBase: mergedKnowledgeBase, guardrails, logger });

  const app = express();

  app.use(express.json());
  app.use(express.static(join(rootDir, "public")));

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", version: APP_VERSION });
  });

  app.post("/chat", async (request, response, next) => {
    try {
      const result = await handleChatRequestBody(request.body, chatbot);
      response.status(result.status).json(result.body);
    } catch (error) {
      next(error);
    }
  });

  app.get("/suggestions", (request, response) => {
    response.set("Cache-Control", "no-cache, no-store, must-revalidate");
    response.set("Pragma", "no-cache");
    const { session_id } = request.query;
    const suggestions = getSuggestions(session_id, chatbot, mergedKnowledgeBase);
    response.json({ suggestions });
  });

  app.get("/api/dashboard/fallback-analysis", async (_request, response, next) => {
    try {
      const result = await getFallbackAnalysis(getLogPath(), "conversations");
      response.set("Cache-Control", "no-cache, must-revalidate");
      response.json(result);
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

function getLogPath() {
  if (process.env.VERCEL) {
    return join(tmpdir(), "faq-chatbot-conversations.jsonl");
  }

  return join(rootDir, "logs", "conversations.jsonl");
}

function mergeProductIntents(knowledgeBase, products) {
  const productIntents = (products.products || []).flatMap((product) => {
    if (product.status !== "active") return [];
    return (product.intents || []).map((intent) => ({
      intent_id: intent.intent_id,
      category: product.category,
      status: product.status,
      version: intent.version || product.version,
      updated_by: "product_kb",
      updated_date: product.updated_date,
      training_phrases: intent.training_phrases,
      follow_up_phrases: intent.follow_up_phrases || [],
      context_after: intent.context_after || [],
      response: intent.response,
      product_id: product.product_id,
      product_name_th: product.product_name_th,
      product_name_en: product.product_name_en
    }));
  });

  return {
    ...knowledgeBase,
    intents: [...knowledgeBase.intents, ...productIntents]
  };
}

const DEFAULT_SUGGESTIONS = [
  "สมัครยังไง",
  "ใช้เอกสารอะไรบ้าง",
  "มีผลิตภัณฑ์อะไรบ้าง",
  "ชำระเงินช่องทางไหนได้บ้าง"
];

function getSuggestions(sessionId, chatbot, knowledgeBase, maxCount = 4) {
  if (!sessionId) {
    return DEFAULT_SUGGESTIONS;
  }

  const session = chatbot.sessionStore.get(sessionId);
  const lastIntentId = session?.last_intent;

  if (!lastIntentId) {
    return DEFAULT_SUGGESTIONS;
  }

  const intents = knowledgeBase.intents || [];
  const followUpIntents = intents.filter(
    intent => intent.context_after?.includes(lastIntentId)
  );

  const phrases = [];

  for (const intent of followUpIntents) {
    for (const phrase of (intent.follow_up_phrases || [])) {
      if (!phrases.includes(phrase) && phrases.length < maxCount) {
        phrases.push(phrase);
      }
    }
  }

  if (phrases.length < maxCount) {
    for (const intent of followUpIntents) {
      for (const phrase of (intent.training_phrases || [])) {
        if (!phrases.includes(phrase) && phrases.length < maxCount) {
          phrases.push(phrase);
        }
      }
    }
  }

  return phrases.length > 0 ? phrases : DEFAULT_SUGGESTIONS;
}

const defaultApp = await createApp();

export default defaultApp;
