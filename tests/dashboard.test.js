import { describe, it } from "node:test";
import assert from "node:assert";
import { computeAnalysis } from "../src/analytics.js";
import { normalizeText } from "../src/chatbot/text.js";
import { createConversationLogger, createBlobLogger } from "../src/chatbot/logger.js";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

function makeRecord(overrides = {}) {
  return {
    timestamp: new Date().toISOString(),
    session_id: "test-session",
    user_question: "test question",
    matched_intent: null,
    response_type: "fallback",
    confidence_score: 0,
    ...overrides
  };
}

describe("computeAnalysis", () => {
  it("returns zero stats for empty records", () => {
    const result = computeAnalysis([]);
    assert.strictEqual(result.summary.totalConversations, 0);
    assert.strictEqual(result.summary.totalFallbacks, 0);
    assert.strictEqual(result.summary.fallbackRate, 0);
    assert.strictEqual(result.summary.uniqueQuestions, 0);
    assert.deepStrictEqual(result.topUnanswered, []);
    assert.deepStrictEqual(result.recentFallbacks, []);
  });

  it("counts fallbacks correctly from mixed data", () => {
    const records = [
      makeRecord({ response_type: "answer", matched_intent: "greeting" }),
      makeRecord({ response_type: "answer", matched_intent: "register_service" }),
      makeRecord({ response_type: "fallback" }),
      makeRecord({ response_type: "guardrail" }),
      makeRecord({ response_type: "fallback" })
    ];
    const result = computeAnalysis(records);
    assert.strictEqual(result.summary.totalConversations, 5);
    assert.strictEqual(result.summary.totalFallbacks, 2);
    assert.strictEqual(result.summary.fallbackRate, 40);
    assert.strictEqual(result.summary.uniqueQuestions, 1); // both fallbacks are "test question"
  });

  it("calculates fallbackRate correctly", () => {
    const records = [
      makeRecord({ response_type: "fallback" }),
      makeRecord({ response_type: "answer" })
    ];
    const result = computeAnalysis(records);
    assert.strictEqual(result.summary.fallbackRate, 50);
  });

  it("groups identical normalized questions", () => {
    const records = [
      makeRecord({ user_question: "สวัสดี" }),
      makeRecord({ user_question: "สวัสดี" }),
      makeRecord({ user_question: "สวัสดีครับ" }),
      makeRecord({ user_question: "มีอะไร" })
    ];
    const result = computeAnalysis(records);
    assert.strictEqual(result.summary.uniqueQuestions, 3);
    assert.strictEqual(result.topUnanswered.length, 3);
    const top = result.topUnanswered.find((q) => q.normalized === normalizeText("สวัสดี"));
    assert.strictEqual(top.count, 2);
  });

  it("returns top 10 unanswered questions sorted by count", () => {
    const records = [];
    for (let i = 0; i < 15; i++) {
      records.push(makeRecord({ user_question: `question_${i % 5}` }));
    }
    const result = computeAnalysis(records);
    assert.strictEqual(result.topUnanswered.length, 5);
    assert(result.topUnanswered[0].count >= result.topUnanswered[1].count);
  });

  it("builds daily trend for last 15 days", () => {
    const now = new Date("2026-06-24T12:00:00Z");
    const yesterday = new Date("2026-06-23T12:00:00Z");

    const records = [
      makeRecord({
        timestamp: now.toISOString(),
        user_question: "today q"
      }),
      makeRecord({
        timestamp: yesterday.toISOString(),
        user_question: "yesterday q"
      })
    ];
    const result = computeAnalysis(records);
    assert.strictEqual(result.dailyTrend.length, 15);
    const todayKey = "2026-06-24";
    const yesterdayKey = "2026-06-23";
    const today = result.dailyTrend.find((d) => d.date === todayKey);
    const yest = result.dailyTrend.find((d) => d.date === yesterdayKey);
    assert.strictEqual(today.count, 1);
    assert.strictEqual(yest.count, 1);
  });

  it("returns recent 20 fallbacks sorted by timestamp descending", () => {
    const records = [];
    for (let i = 0; i < 25; i++) {
      const d = new Date("2026-06-24T00:00:00Z");
      d.setMinutes(d.getMinutes() + i);
      records.push(makeRecord({ timestamp: d.toISOString(), user_question: `q_${i}` }));
    }
    const result = computeAnalysis(records);
    assert.strictEqual(result.recentFallbacks.length, 20);
    const timestamps = result.recentFallbacks.map((r) => r.timestamp);
    for (let i = 1; i < timestamps.length; i++) {
      assert(new Date(timestamps[i - 1]) >= new Date(timestamps[i]));
    }
  });
});

describe("createConversationLogger", () => {
  it("appends a JSON line to the log file", async () => {
    const dir = await mkdtemp(join(tmpdir(), "faq-test-"));
    const logPath = join(dir, "test.jsonl");
    const logger = createConversationLogger(logPath);

    await logger({
      session_id: "s1",
      user_question: "hello",
      matched_intent: null,
      response_type: "fallback",
      confidence_score: 0.5
    });

    const content = await readFile(logPath, "utf8");
    const lines = content.trim().split("\n");
    assert.strictEqual(lines.length, 1);
    const parsed = JSON.parse(lines[0]);
    assert.strictEqual(parsed.session_id, "s1");
    assert.strictEqual(parsed.user_question, "hello");
    assert.strictEqual(parsed.response_type, "fallback");
    assert.strictEqual(parsed.confidence_score, 0.5);
    assert.ok(parsed.timestamp);

    await rm(dir, { recursive: true, force: true });
  });
});

describe("createBlobLogger", () => {
  it("returns a logger function", () => {
    const logger = createBlobLogger("test-prefix");
    assert.strictEqual(typeof logger, "function");
  });
});
