import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { handleChatRequestBody } from "../src/app.js";
import { createChatbot } from "../src/chatbot/engine.js";

const knowledgeBase = JSON.parse(await readFile(new URL("../data/knowledge-base.json", import.meta.url), "utf8"));
const guardrails = JSON.parse(await readFile(new URL("../data/guardrails.json", import.meta.url), "utf8"));

function createTestBot() {
  return createChatbot({
    knowledgeBase,
    guardrails,
    logger: async () => {}
  });
}

test("POST /chat returns answer for a known question", async () => {
  const result = await handleChatRequestBody(
    {
      session_id: "api-answer",
      message: "สมัครยังไง"
    },
    createTestBot()
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.type, "answer");
  assert.equal(result.body.intent, "register_service");
  assert.equal(typeof result.body.response, "string");
});

test("POST /chat validates missing session_id", async () => {
  const result = await handleChatRequestBody(
    {
      message: "สมัครยังไง"
    },
    createTestBot()
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.error, "session_id_required");
});

test("POST /chat validates missing message", async () => {
  const result = await handleChatRequestBody(
    {
      session_id: "api-invalid"
    },
    createTestBot()
  );

  assert.equal(result.status, 400);
  assert.equal(result.body.error, "message_required");
});

test("POST /chat returns guardrail response", async () => {
  const result = await handleChatRequestBody(
    {
      session_id: "api-guardrail",
      message: "บ้า"
    },
    createTestBot()
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.type, "guardrail");
  assert.equal(result.body.response, guardrails.response);
});

test("POST /chat returns fallback response", async () => {
  const result = await handleChatRequestBody(
    {
      session_id: "api-fallback",
      message: "ถามเรื่องอากาศ"
    },
    createTestBot()
  );

  assert.equal(result.status, 200);
  assert.equal(result.body.type, "fallback");
  assert.equal(result.body.intent, null);
});
