const SYNONYM_MAP = {
  product: "ผลิตภัณฑ์",
  prod: "ผลิตภัณฑ์",
  ประกัน: "ผลิตภัณฑ์",
  สินค้า: "ผลิตภัณฑ์",
  service: "บริการ",
  เซอร์วิส: "บริการ",
};

export function normalizeText(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function expandSynonyms(text) {
  return normalizeText(text)
    .split(" ")
    .map((token) => SYNONYM_MAP[token] || token)
    .join(" ");
}

export function tokenize(value) {
  return normalizeText(value)
    .split(" ")
    .filter(Boolean);
}

export function similarityScore(a, b) {
  const normalizedA = normalizeText(a);
  const normalizedB = normalizeText(b);

  if (!normalizedA || !normalizedB) {
    return 0;
  }

  if (normalizedA === normalizedB) {
    return 1;
  }

  if (normalizedA.includes(normalizedB) || normalizedB.includes(normalizedA)) {
    const shorter = Math.min(normalizedA.length, normalizedB.length);
    const longer = Math.max(normalizedA.length, normalizedB.length);
    return Math.max(0.72, shorter / longer);
  }

  const tokensA = new Set(tokenize(normalizedA));
  const tokensB = new Set(tokenize(normalizedB));

  if (tokensA.size === 0 || tokensB.size === 0) {
    return 0;
  }

  const intersection = [...tokensA].filter((token) => tokensB.has(token)).length;
  const union = new Set([...tokensA, ...tokensB]).size;

  if (intersection === 0 || union === 0) {
    return 0;
  }

  return intersection / union;
}
