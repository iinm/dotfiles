return {
  s(
    "debug",
    fmt(
      [[
        console.debug("\n--- DEBUG: <description>");
        console.debug(JSON.stringify({ <target> }, null, 2));
      ]],
      { description = i(1, ""), target = i(2, "target") },
      { delimiters = "<>", repeat_duplicates = true }
    )
  ),
}
