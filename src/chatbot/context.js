export function createSessionStore() {
  const sessions = new Map();

  return {
    get(sessionId) {
      return sessions.get(sessionId) || null;
    },

    setLastIntent(sessionId, intentId) {
      const existing = sessions.get(sessionId) || {};
      sessions.set(sessionId, {
        ...existing,
        last_intent: intentId,
        updated_at: new Date().toISOString()
      });
    },

    clear() {
      sessions.clear();
    }
  };
}
