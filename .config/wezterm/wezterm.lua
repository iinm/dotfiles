local wezterm = require 'wezterm';
local local_config = require 'local_config';

local config = {}

if wezterm.config_builder then
  config = wezterm.config_builder()
end

config.font = wezterm.font_with_fallback {
  { family = "Operator Mono SSm", weight = "Book" },
  { family = "Hiragino Sans" },
  { family = "Noto Sans CJK JP" },
}
config.font_size = 12.4
config.color_scheme = "Eighties (base16)"
config.use_ime = true
config.hide_tab_bar_if_only_one_tab = true
config.adjust_window_size_when_changing_font_size = false

-- host specific config
local_config.apply_to_config(config)

return config
