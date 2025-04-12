return {
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
    "cl-json-stringify",
    fmt("console.log(JSON.stringify(<>, null, 2));",
      { i(1, "obj") },
      { delimiters = "<>", repeat_duplicates = true }
    )
  ),
  s(
    "type-doc",
    fmt("/** @type {<>} */",
      { i(1, "type") },
      { delimiters = "<>", repeat_duplicates = true }
    )
  ),
  s(
    "typedef-obj-doc",
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
    "fn-doc",
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
    "import-doc",
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
    "import-add-doc",
    fmt(
      [[
        @import { <> } from "<>";
      ]],
      { i(1, "prop"), i(2, "path") },
      { delimiters = "<>", repeat_duplicates = true }
    )
  )
}
