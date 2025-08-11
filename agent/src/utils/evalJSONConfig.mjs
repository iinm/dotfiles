/**
 * @param {unknown} configItem
 * @returns {unknown}
 */
export function evalJSONConfig(configItem) {
  if (Array.isArray(configItem)) {
    return configItem.map((item) => evalJSONConfig(item));
  }

  if (typeof configItem === "object" && configItem !== null) {
    if (
      Object.keys(configItem).length === 1 &&
      "regex" in configItem &&
      typeof configItem.regex === "string"
    ) {
      return new RegExp(configItem.regex);
    }

    /** @type {Record<string,unknown>} */
    const clone = {};
    for (const [k, v] of Object.entries(configItem)) {
      clone[k] = evalJSONConfig(v);
    }
    return clone;
  }

  return configItem;
}
