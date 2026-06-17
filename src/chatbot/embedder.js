import { pipeline } from "@xenova/transformers";

let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", "Xenova/paraphrase-multilingual-MiniLM-L12-v2", {
      quantized: true
    });
  }
  return embedder;
}

export async function computeEmbedding(text) {
  const extractor = await getEmbedder();
  const result = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(result.data);
}

export function cosineSimilarity(a, b) {
  let dot = 0;

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
  }

  const normA = Math.sqrt(a.reduce((sum, v) => sum + v * v, 0));
  const normB = Math.sqrt(b.reduce((sum, v) => sum + v * v, 0));

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (normA * normB);
}
