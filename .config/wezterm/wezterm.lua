local wezterm = require 'wezterm';

return {
  font = wezterm.font("Operator Mono SSm", { weight="Book" }),
  font_size = 13,
  color_scheme = "Chalk",
  use_ime = true,
  hide_tab_bar_if_only_one_tab = true,
  adjust_window_size_when_changing_font_size = false,
}
