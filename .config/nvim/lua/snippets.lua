local ls = require("luasnip")
local s = ls.snippet
local sn = ls.snippet_node
local isn = ls.indent_snippet_node
local t = ls.text_node
local i = ls.insert_node
local f = ls.function_node
local c = ls.choice_node
local d = ls.dynamic_node
local r = ls.restore_node
local events = require("luasnip.util.events")
local ai = require("luasnip.nodes.absolute_indexer")
local extras = require("luasnip.extras")
local l = extras.lambda
local rep = extras.rep
local p = extras.partial
local m = extras.match
local n = extras.nonempty
local dl = extras.dynamic_lambda
local fmt = require("luasnip.extras.fmt").fmt
local fmta = require("luasnip.extras.fmt").fmta
local conds = require("luasnip.extras.expand_conditions")
local postfix = require("luasnip.extras.postfix").postfix
local types = require("luasnip.util.types")
local parse = require("luasnip.util.parser").parse_snippet
local ms = ls.multi_snippet
local k = require("luasnip.nodes.key_indexer").new_key

ls.add_snippets("javascript", {
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
         * @import { <> } "<>";
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
        @import { <> } "<>";
      ]],
      { i(1, "prop"), i(2, "path") },
      { delimiters = "<>", repeat_duplicates = true }
    )
  )
})
