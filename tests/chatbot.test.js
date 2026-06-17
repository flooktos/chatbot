import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createChatbot, FALLBACK_RESPONSE } from "../src/chatbot/engine.js";

const knowledgeBase = JSON.parse(await readFile(new URL("../data/knowledge-base.json", import.meta.url), "utf8"));
const guardrails = JSON.parse(await readFile(new URL("../data/guardrails.json", import.meta.url), "utf8"));

function createTestBot() {
  return createChatbot({
    knowledgeBase,
    guardrails,
    logger: async () => {}
  });
}

test("exact Thai training phrase matches the correct intent", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "unit-exact",
    message: "สมัครยังไง"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "register_service");
  assert.match(response.response, /สมัครใช้บริการ/);
});

test("similar Thai phrase maps to the expected intent", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "unit-similar",
    message: "อยากสมัครใช้บริการครับ"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "register_service");
});

test("unknown question returns fallback", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "unit-fallback",
    message: "วันนี้ฝนจะตกไหม"
  });

  assert.equal(response.type, "fallback");
  assert.equal(response.intent, null);
  assert.equal(response.response, FALLBACK_RESPONSE);
});

test("blocked word returns guardrail before matching", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "unit-guardrail",
    message: "สมัครยังไง โง่"
  });

  assert.equal(response.type, "guardrail");
  assert.equal(response.intent, null);
  assert.equal(response.response, guardrails.response);
});

test("guardrail does not block Thai words that only share a prefix", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "unit-guardrail-prefix",
    message: "ต้องใช้เอกสารอะไรบ้าง"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "required_documents");
});

test("follow-up phrase can use previous session context", async () => {
  const bot = createTestBot();

  await bot.reply({
    session_id: "unit-follow-up",
    message: "สมัครยังไง"
  });

  const response = await bot.reply({
    session_id: "unit-follow-up",
    message: "ต้องเตรียมอะไร"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "required_documents");
});

test("new intent: loan_service matches correctly", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "unit-loan",
    message: "มีสินเชื่ออะไรบ้าง"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "loan_service");
});

test("new intent: promotion matches correctly", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "unit-promo",
    message: "มีโปรโมชั่นอะไรบ้าง"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "promotion");
});

test("new intent: interest_rate as follow-up to loan_service", async () => {
  const bot = createTestBot();

  await bot.reply({
    session_id: "unit-rate",
    message: "มีสินเชื่ออะไรบ้าง"
  });

  const response = await bot.reply({
    session_id: "unit-rate",
    message: "ดอกเบี้ยเท่าไหร่"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "interest_rate");
});

test("new intent: payment_method matches correctly", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "unit-payment",
    message: "ชำระเงินยังไง"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "payment_method");
});

test("new intent: change_plan as follow-up to register_service", async () => {
  const bot = createTestBot();

  await bot.reply({
    session_id: "unit-change",
    message: "สมัครยังไง"
  });

  const response = await bot.reply({
    session_id: "unit-change",
    message: "เปลี่ยนแผนอะไรได้บ้าง"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "change_plan");
});

test("fallback does not reset previous context", async () => {
  const bot = createTestBot();

  await bot.reply({
    session_id: "unit-context",
    message: "สมัครยังไง"
  });

  const fallback = await bot.reply({
    session_id: "unit-context",
    message: "ถามเรื่องนอกระบบ"
  });

  assert.equal(fallback.type, "fallback");

  const followUp = await bot.reply({
    session_id: "unit-context",
    message: "ต้องเตรียมอะไร"
  });

  assert.equal(followUp.type, "answer");
  assert.equal(followUp.intent, "required_documents");
});
