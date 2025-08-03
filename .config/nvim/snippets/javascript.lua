return {
  s(
    "d",
    fmt(
      [[
        console.debug("\n--- DEBUG: ", JSON.stringify({ <target> }, null, 2));
      ]],
      { target = i(1, "target") },
      { delimiters = "<>", repeat_duplicates = true }
    )
  ),
  s(
    "err-custom",
    fmt(
      [[
        export class <name> extends Error {
          /**
           * @param {string} message
           */
          constructor(message) {
            super(message);
            this.name = "<name>";
          }
        }
      ]],
      { name = i(1, "ErrorName") },
      { delimiters = "<>", repeat_duplicates = true }
    )
  ),
  s(
    "type",
    fmt("/** @type {<>} */",
      { i(1, "type") },
      { delimiters = "<>", repeat_duplicates = true }
    )
  ),
  s(
    "type-obj",
    fmt(
      [[
        /**
         * @typedef {Object} <>
         * @property {<>} <>
         */
      ]],
      { i(1, "TypeName"), i(2, "propType"), i(3, "propName") },
      { delimiters = "<>", repeat_duplicates = true }
    )
  ),
  s(
    "type-fn",
    fmt(
      [[
        /**
         * @param {<>} <>
         * @returns {<>}
         */
      ]],
      { i(1, "paramType"), i(2, "paramNmae"), i(3, "returnType") },
      { delimiters = "<>", repeat_duplicates = true }
    )
  ),
  s(
    "import-type",
    fmt(
      [[
        /**
         * @import { <> } from "<>";
         */
      ]],
      { i(1, "prop"), i(2, "path") },
      { delimiters = "<>", repeat_duplicates = true }
    )
  ),
  s(
    "import-type-add",
    fmt(
      [[
        @import { <> } from "<>";
      ]],
      { i(1, "prop"), i(2, "path") },
      { delimiters = "<>", repeat_duplicates = true }
    )
  )
}
