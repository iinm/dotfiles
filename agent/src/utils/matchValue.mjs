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
    if (Array.isArray(value)) {
      for (let i = 0; i < pattern.length; i++) {
        if (!matchValue(value[i], pattern[i])) {
          return false;
        }
      }
      return true;
    }
    return false;
  }
  if (typeof pattern === "object") {
    if (typeof value === "object" && value !== null) {
      for (const key of Object.keys(pattern)) {
        if (
          !matchValue(value[/** @type {keyof value} */ (key)], pattern[key])
        ) {
          return false;
        }
      }
      return true;
    }
  } else {
    // Nothing to do
  }

  return true;
}
