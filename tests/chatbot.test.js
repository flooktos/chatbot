import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createChatbot, FALLBACK_RESPONSE } from "../src/chatbot/engine.js";

const knowledgeBase = JSON.parse(await readFile(new URL("../data/knowledge-base.json", import.meta.url), "utf8"));
const guardrails = JSON.parse(await readFile(new URL("../data/guardrails.json", import.meta.url), "utf8"));
const products = JSON.parse(await readFile(new URL("../data/products.json", import.meta.url), "utf8"));

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

const mergedKnowledgeBase = mergeProductIntents(knowledgeBase, products);

function createTestBot() {
  return createChatbot({
    knowledgeBase: mergedKnowledgeBase,
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

test("product: D-Prompt 11/7 info matches correctly", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "prod-prompt",
    message: "ดีพรอมต์ 11/7 คืออะไร"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "product_d_prompt_info");
  assert.match(response.response, /ดี-พรอมต์ 11\/7/);
});

test("product: D-Supreme Saving 2.30% info matches correctly", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "prod-supreme",
    message: "ดีซูพรีมเซฟวิ่ง 2.30% คืออะไร"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "product_d_supreme_saving_info");
});

test("product: D-Pension 90/1 info matches correctly", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "prod-pension",
    message: "ดีเพนชั่น 90/1 คืออะไร"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "product_d_pension_info");
});

test("product: D-PA info matches correctly", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "prod-pa",
    message: "ดีพีเอคืออะไร"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "product_d_pa_info");
});

test("product: D-Saving 10/3 info matches correctly", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "prod-saving",
    message: "ดีเซฟวิ่ง 10/3 คืออะไร"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "product_d_saving_10_3_info");
});

test("product: follow-up within D-Prompt 11/7 (info then rate)", async () => {
  const bot = createTestBot();

  await bot.reply({
    session_id: "prod-followup-1",
    message: "ดีพรอมต์ 11/7 คืออะไร"
  });

  const response = await bot.reply({
    session_id: "prod-followup-1",
    message: "ผลตอบแทนเท่าไหร่"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "product_d_prompt_rate");
});

test("product: follow-up within D-Supreme Saving (info then payment)", async () => {
  const bot = createTestBot();

  await bot.reply({
    session_id: "prod-followup-2",
    message: "ดีซูพรีมเซฟวิ่ง 2.30% คืออะไร"
  });

  const response = await bot.reply({
    session_id: "prod-followup-2",
    message: "จ่ายครั้งเดียว"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "product_d_supreme_saving_payment");
});

test("product: unknown product-related question returns fallback", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "prod-fallback",
    message: "ผลิตภัณฑ์ที่ไม่รู้จัก XXX-999"
  });

  assert.equal(response.type, "fallback");
  assert.equal(response.intent, null);
});

test("product_catalog: 'มี product อะไรบ้าง' matches product_catalog intent", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "cat-eng",
    message: "มี product อะไรบ้าง"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "product_catalog");
});

test("product_catalog: 'มีผลิตภัณฑ์อะไรบ้าง' matches product_catalog intent", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "cat-thai",
    message: "มีผลิตภัณฑ์อะไรบ้าง"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "product_catalog");
});

test("product_catalog: 'มีประกันอะไรขายบ้าง' matches via synonym expansion", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "cat-synonym",
    message: "มีประกันอะไรขายบ้าง"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "product_catalog");
});

test("product_catalog: 'บริษัทมีผลิตภัณฑ์อะไรบ้าง' matches correctly", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "cat-full",
    message: "บริษัทมีผลิตภัณฑ์อะไรบ้าง"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "product_catalog");
});

test("expansion: 'product' synonym does not break normal Thai matching", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "expansion-ok",
    message: "สมัครยังไง"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "register_service");
});

test("product name only: 'ดี-ซูพรีม เซฟวิ่ง 10/1' matches D-Supreme Saving", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "prod-name-only",
    message: "ดี-ซูพรีม เซฟวิ่ง 10/1"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "product_d_supreme_saving_info");
});

test("product with prefix: 'ขอรายละเอียด ดี-ซูพรีม เซฟวิ่ง 10/1' matches via substring", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "prod-request",
    message: "ขอรายละเอียด ดี-ซูพรีม เซฟวิ่ง 10/1"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "product_d_supreme_saving_info");
});

test("product with prefix: 'รายละเอียด ดี-ซูพรีม เซฟวิ่ง 10/1' matches via substring", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "prod-detail",
    message: "รายละเอียด ดี-ซูพรีม เซฟวิ่ง 10/1"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "product_d_supreme_saving_info");
});

test("product name only: 'ดี-พรอมต์ 11/7' matches D-Prompt 11/7", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "prod-name-prompt",
    message: "ดี-พรอมต์ 11/7"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "product_d_prompt_info");
});

test("product name only: 'ดี-เพนชั่น 90/1' matches D-Pension 90/1", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "prod-name-pension",
    message: "ดี-เพนชั่น 90/1"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "product_d_pension_info");
});

test("product: existing FAQ still works after product merge", async () => {
  const bot = createTestBot();

  const response = await bot.reply({
    session_id: "prod-faq",
    message: "สมัครยังไง"
  });

  assert.equal(response.type, "answer");
  assert.equal(response.intent, "register_service");
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

test("AI: findBestIntentHybrid returns same result as classical for exact matches", async () => {
  const { findBestIntentHybrid } = await import("../src/chatbot/matcher-ai.js");
  const { findBestIntent } = await import("../src/chatbot/matcher.js");

  const hybrid = await findBestIntentHybrid("สมัครยังไง", mergedKnowledgeBase);
  const classical = findBestIntent("สมัครยังไง", mergedKnowledgeBase);

  assert.equal(hybrid.intent?.intent_id, classical.intent?.intent_id);
  assert.ok(hybrid.confidence >= classical.confidence);
});
