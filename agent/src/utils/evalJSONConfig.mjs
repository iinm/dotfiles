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
      "$regex" in configItem &&
      typeof configItem.$regex === "string"
    ) {
      return new RegExp(configItem.$regex);
    }

    if (Object.keys(configItem).length === 1 && "$has" in configItem) {
      const pattern = evalJSONConfig(configItem.$has);
      /** @param {unknown} value */
      return (value) => {
        if (!Array.isArray(value)) return false;
        return value.some((item) => {
          if (typeof pattern === "string") {
            return item === pattern;
          }
          if (pattern instanceof RegExp) {
            return typeof item === "string" && pattern.test(item);
          }
          if (typeof pattern === "function") {
            return pattern(item);
          }
          return false;
        });
      };
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
