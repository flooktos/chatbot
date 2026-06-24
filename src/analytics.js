import { readFile } from "node:fs/promises";
import { normalizeText } from "./chatbot/text.js";

export async function getFallbackAnalysis(logPath, blobPrefix) {
  const records = await loadAllRecords(logPath, blobPrefix);
  return computeAnalysis(records);
}

async function loadAllRecords(logPath, blobPrefix) {
  if (blobPrefix && process.env.BLOB_READ_WRITE_TOKEN) {
    return loadFromBlob(blobPrefix);
  }
  return loadFromFile(logPath);
}

async function loadFromFile(logPath) {
  try {
    const content = await readFile(logPath, "utf8");
    return content
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

async function loadFromBlob(blobPrefix) {
  try {
    const { list } = await import("@vercel/blob");
    const { blobs } = await list({ prefix: blobPrefix });
    const records = await Promise.all(
      blobs.map(async (b) => {
        const res = await fetch(b.url);
        return res.json();
      })
    );
    return records;
  } catch {
    return [];
  }
}

export function computeAnalysis(records) {
  const totalConversations = records.length;
  const fallbacks = records.filter((r) => r.response_type === "fallback");
  const totalFallbacks = fallbacks.length;
  const fallbackRate = totalConversations > 0
    ? Number(((totalFallbacks / totalConversations) * 100).toFixed(2))
    : 0;

  const questionGroups = groupByNormalized(fallbacks.map((r) => r.user_question));
  const uniqueQuestions = questionGroups.length;

  const topUnanswered = questionGroups
    .sort((a, b) => b.count - a.count)
    .slice(0, 10)
    .map((g) => {
      const timestamps = fallbacks
        .filter((r) => normalizeText(r.user_question) === g.normalized)
        .map((r) => r.timestamp)
        .sort();
      return {
        question: g.original,
        normalized: g.normalized,
        count: g.count,
        lastAsked: timestamps[timestamps.length - 1] || null
      };
    });

  const dailyTrend = buildDailyTrend(fallbacks);

  const recentFallbacks = fallbacks
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 20)
    .map((r) => ({
      timestamp: r.timestamp,
      sessionId: r.session_id,
      question: r.user_question,
      confidenceScore: r.confidence_score
    }));

  return {
    summary: {
      totalConversations,
      totalFallbacks,
      fallbackRate,
      uniqueQuestions
    },
    topUnanswered,
    dailyTrend,
    recentFallbacks
  };
}

function groupByNormalized(questions) {
  const groups = new Map();
  for (const q of questions) {
    const norm = normalizeText(q);
    if (!norm) continue;
    if (!groups.has(norm)) {
      groups.set(norm, { normalized: norm, original: q, count: 0 });
    }
    const group = groups.get(norm);
    group.count++;
  }
  return [...groups.values()];
}

function buildDailyTrend(fallbacks, days = 30) {
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daily = {};

  for (let i = 0; i < days; i++) {
    const d = new Date(today - i * 86_400_000);
    const key = d.toISOString().slice(0, 10);
    daily[key] = 0;
  }

  for (const f of fallbacks) {
    const key = f.timestamp.slice(0, 10);
    if (daily[key] !== undefined) {
      daily[key]++;
    }
  }

  return Object.entries(daily)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}
