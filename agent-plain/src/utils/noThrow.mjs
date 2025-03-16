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
    throw new Error(`Non-Error thrown: ${error}`);
  }
}
