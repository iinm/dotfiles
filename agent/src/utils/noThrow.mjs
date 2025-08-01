/**
 * @template T
 * @param {() => Promise<T>} task
 * @returns {Promise<T | Error>}
 */
export async function noThrow(task) {
  try {
    return await task();
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    return new Error(`Non-Error thrown: ${error}`);
  }
}

/**
 * @template T
 * @param {() => T} task
 * @returns {T | Error}
 */
export function noThrowSync(task) {
  try {
    return task();
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }
    return new Error(`Non-Error thrown: ${error}`);
  }
}
