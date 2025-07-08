/**
 * @import { ValuePattern } from "./matchValue"
 */

/**
 * @param {unknown} value
 * @param {ValuePattern} pattern
 * @returns {boolean}
 */
export function matchValue(value, pattern) {
  if (typeof pattern === "string") {
    return typeof value === "string" && value === pattern;
  }

  if (pattern instanceof RegExp) {
    return typeof value === "string" && pattern.test(value);
  }

  if (typeof pattern === "function") {
    return pattern(value);
  }

  if (Array.isArray(pattern)) {
    return (
      Array.isArray(value) && pattern.every((p, i) => matchValue(value[i], p))
    );
  }

  if (typeof pattern === "object") {
    return (
      typeof value === "object" &&
      value !== null &&
      Object.entries(pattern).every(([k, p]) =>
        matchValue(value[/** @type {keyof value} */ (k)], p),
      )
    );
  }

  return false;
}
