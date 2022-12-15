local wezterm = require 'wezterm';

return {
  font = wezterm.font_with_fallback {
    { family = "Operator Mono SSm", weight = "Book" },
    { family = "Hiragino Sans" },
  },
  font_size = 12.5,
  color_scheme = "Eighties (base16)",
  use_ime = true,
  hide_tab_bar_if_only_one_tab = true,
  adjust_window_size_when_changing_font_size = false,
}
