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
}
