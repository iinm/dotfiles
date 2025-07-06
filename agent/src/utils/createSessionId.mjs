/**
 * Generate a session ID
 * e.g. 2025-12-31-2359
 * @returns {string}
 */
export function createSessionId() {
  const startTime = new Date();
  return [
    startTime.toISOString().slice(0, 10),
    `0${startTime.getHours()}`.slice(-2) +
      `0${startTime.getMinutes()}`.slice(-2),
  ].join("-");
}
