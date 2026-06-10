import { normalizeText } from "./text.js";

const thaiSegmenter = new Intl.Segmenter("th", { granularity: "word" });

export function checkGuardrail(message, guardrails) {
  const normalizedMessage = normalizeText(message);
  const matchedTerm = (guardrails.blocked_terms || []).find((term) => {
    const normalizedTerm = normalizeText(term);
    return normalizedTerm && includesBlockedTerm(normalizedMessage, normalizedTerm);
  });

  return {
    blocked: Boolean(matchedTerm),
    matchedTerm: matchedTerm || null
  };
}

function includesBlockedTerm(message, term) {
  if (!message || !term) {
    return false;
  }

  const segments = [...thaiSegmenter.segment(message)]
    .filter((segment) => segment.isWordLike)
    .map((segment) => normalizeText(segment.segment));

  if (segments.includes(term)) {
    return true;
  }

  return new RegExp(`(^|\\s)${escapeRegExp(term)}($|\\s)`, "u").test(message);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
