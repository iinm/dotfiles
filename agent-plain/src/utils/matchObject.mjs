/**
 * @import { ObjectPattern, ValuePattern } from "./matchObject"
 */

/**
 * @param {Record<string,unknown>} object
 * @param {ObjectPattern} pattern
 * @returns {boolean}
 */
export function matchObject(object, pattern) {
  for (const [key, valuePattern] of Object.entries(pattern)) {
    if (!(key in object)) {
      return false;
    }

    const value = object[key];
    if (typeof valuePattern === "string") {
      if (typeof value !== "string" || value !== valuePattern) {
        return false;
      }
    } else if (valuePattern instanceof RegExp) {
      if (typeof value !== "string" || !valuePattern.test(value)) {
        return false;
      }
    } else if (typeof valuePattern === "function") {
      if (!valuePattern(value)) {
        return false;
      }
    } else if (Array.isArray(valuePattern)) {
      if (!Array.isArray(value)) {
        return false;
      }
      for (let i = 0; i < valuePattern.length; i++) {
        const elementPattern = valuePattern[i];
        const elementValue = value.at(i);
        if (typeof elementPattern === "string") {
          if (
            typeof elementValue !== "string" ||
            elementValue !== elementPattern
          ) {
            return false;
          }
        } else if (elementPattern instanceof RegExp) {
          if (
            typeof elementValue !== "string" ||
            !elementPattern.test(elementValue)
          ) {
            return false;
          }
        } else if (typeof elementPattern === "function") {
          if (!elementPattern(elementValue)) {
            return false;
          }
        } else if (
          typeof elementPattern === "object" &&
          elementPattern !== null
        ) {
          if (typeof elementValue !== "object" || elementValue === null) {
            return false;
          } else if (
            !matchObject(
              /** @type {Record<string,unknown>} */ (elementValue),
              elementPattern,
            )
          ) {
            return false;
          }
        }
      }
    } else if (typeof valuePattern === "object" && valuePattern !== null) {
      if (typeof value !== "object" || value === null) {
        return false;
      }
      if (
        !matchObject(
          /** @type {Record<string,unknown>} */ (value),
          valuePattern,
        )
      ) {
        return false;
      }
    }
  }

  return true;
}
