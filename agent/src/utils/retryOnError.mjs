/**
 * @typedef {Object} RetryOnErrorConfig
 * @property {(err: unknown) => boolean} shouldRetry
 * @property {(err: unknown, interval: number) => Promise<void>} [beforeRetry]
 * @property {number} initialInterval
 * @property {number} maxInterval
 * @property {number} multiplier
 * @property {number} maxAttempt
 */

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @param {RetryOnErrorConfig} config
 * @returns {Promise<T>}
 */
export async function retryOnError(fn, config) {
  let attempt = 0;

  while (true) {
    try {
      attempt++;
      return await fn();
    } catch (err) {
      if (attempt >= config.maxAttempt || !config.shouldRetry(err)) {
        throw err;
      }

      const interval = Math.min(
        config.initialInterval * config.multiplier ** (attempt - 1),
        config.maxInterval,
      );

      if (config.beforeRetry) {
        await config.beforeRetry(err, interval);
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }
  }
}
