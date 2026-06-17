import { computeEmbedding, cosineSimilarity } from "./embedder.js";
import { normalizeText } from "./text.js";
import { findBestIntent, findFollowUpIntent } from "./matcher.js";

const CACHE_SIZE_THRESHOLD = 500;
const PHRASE_EMBEDDING_CACHE = new Map();

function makeCacheKey(knowledgeBase) {
  let key = "";
  const intents = knowledgeBase.intents || [];
  for (let i = 0; i < intents.length; i++) {
    const intent = intents[i];
    if (intent.status !== "active") continue;
    const phrases = intent.training_phrases || [];
    for (let j = 0; j < phrases.length; j++) {
      key += phrases[j];
    }
  }
  return key;
}

async function buildPhraseCache(knowledgeBase, cacheKey) {
  const cache = new Map();
  const seen = new Set();
  const intents = knowledgeBase.intents || [];

  for (let i = 0; i < intents.length; i++) {
    const intent = intents[i];
    if (intent.status !== "active") continue;
    const phrases = intent.training_phrases || [];
    for (let j = 0; j < phrases.length; j++) {
      const phrase = phrases[j];
      if (seen.has(phrase)) continue;
      seen.add(phrase);
      try {
        const normalized = normalizeText(phrase);
        if (!normalized) continue;
        const embedding = await computeEmbedding(normalized);
        cache.set(phrase, { intent, embedding });
      } catch {
        // skip phrases that fail embedding
      }
    }
  }

  PHRASE_EMBEDDING_CACHE.set(cacheKey, cache);
}

export { findFollowUpIntent };

export async function findBestIntentHybrid(message, knowledgeBase, options = {}) {
  const classical = findBestIntent(message, knowledgeBase, options);

  if (classical.confidence >= 0.85) {
    return classical;
  }

  const cacheKey = makeCacheKey(knowledgeBase);
  let cache = PHRASE_EMBEDDING_CACHE.get(cacheKey);

  if (!cache) {
    try {
      await buildPhraseCache(knowledgeBase, cacheKey);
      cache = PHRASE_EMBEDDING_CACHE.get(cacheKey);
    } catch {
      return classical;
    }
  }

  if (!cache || cache.size === 0 || cache.size > CACHE_SIZE_THRESHOLD) {
    return classical;
  }

  let messageEmbedding;

  try {
    messageEmbedding = await computeEmbedding(normalizeText(message));
  } catch {
    return classical;
  }

  const intentScores = new Map();

  for (const [, { intent, embedding }] of cache) {
    const score = cosineSimilarity(messageEmbedding, embedding);
    const current = intentScores.get(intent.intent_id) || 0;
    if (score > current) {
      intentScores.set(intent.intent_id, score);
    }
  }

  const sorted = [...intentScores.entries()].sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    return classical;
  }

  const [topId, topScore] = sorted[0];
  const margin = sorted.length >= 2 ? topScore - sorted[1][1] : 1;

  if (topScore >= 0.85 && margin >= 0.08) {
    const matchedIntent = knowledgeBase.intents.find(i => i.intent_id === topId);
    if (matchedIntent) {
      return {
        intent: matchedIntent,
        confidence: Math.min(topScore + 0.05, 0.99),
        matchedPhrase: null
      };
    }
  }

  return classical;
}
