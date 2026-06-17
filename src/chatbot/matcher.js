import { expandSynonyms, normalizeText, similarityScore } from "./text.js";

const DEFAULT_THRESHOLD = 0.62;

export function findBestIntent(message, knowledgeBase, options = {}) {
  const threshold = options.threshold ?? DEFAULT_THRESHOLD;
  const activeIntents = getActiveIntents(knowledgeBase);
  const candidates = activeIntents.flatMap((intent) =>
    (intent.training_phrases || []).map((phrase) => ({
      intent,
      phrase,
      score: scorePhrase(message, phrase)
    }))
  );

  const best = candidates.sort((a, b) => b.score - a.score)[0];

  if (!best || best.score < threshold) {
    return {
      intent: null,
      confidence: best?.score ?? 0,
      matchedPhrase: best?.phrase ?? null
    };
  }

  return {
    intent: best.intent,
    confidence: best.score,
    matchedPhrase: best.phrase
  };
}

export function findFollowUpIntent(message, knowledgeBase, previousIntentId) {
  if (!previousIntentId) {
    return null;
  }

  const messageText = normalizeText(message);
  const followUpCandidates = getActiveIntents(knowledgeBase).filter((intent) =>
    intent.context_after?.includes(previousIntentId)
  );

  const followUpMatch = followUpCandidates.find((intent) =>
    (intent.follow_up_phrases || []).some((phrase) => {
      const normalizedPhrase = normalizeText(phrase);
      return normalizedPhrase && (
        messageText === normalizedPhrase ||
        messageText.includes(normalizedPhrase) ||
        normalizedPhrase.includes(messageText)
      );
    })
  );

  return followUpMatch || null;
}

function scorePhrase(message, phrase) {
  const normalizedMessage = expandSynonyms(message);
  const normalizedPhrase = normalizeText(phrase);

  if (!normalizedMessage || !normalizedPhrase) {
    return 0;
  }

  if (normalizedMessage === normalizedPhrase) {
    return 1;
  }

  if (normalizedMessage.includes(normalizedPhrase)) {
    return 0.95;
  }

  if (normalizedPhrase.includes(normalizedMessage)) {
    return 0.9;
  }

  return similarityScore(normalizedMessage, normalizedPhrase);
}

function getActiveIntents(knowledgeBase) {
  return (knowledgeBase.intents || []).filter((intent) => intent.status === "active");
}
