return {
  s(
    "cl",
    fmt("console.log(<>);",
      { i(1, "message") },
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
}
