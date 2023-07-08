local wezterm = require 'wezterm';
local local_config = require 'local_config';

local config = {}

if wezterm.config_builder then
  config = wezterm.config_builder()
end

config.term = "wezterm"
config.font = wezterm.font_with_fallback {
  { family = "Operator Mono SSm", weight = "Book" },
  { family = "Hiragino Sans" },
  { family = "Noto Sans CJK JP" },
  -- { family = "codicon" },
}
config.font_size = 12.5
config.color_scheme = "Eighties (base16)"
config.use_ime = true
config.hide_tab_bar_if_only_one_tab = true
config.adjust_window_size_when_changing_font_size = false
config.window_padding = {
  left = "0.5cell",
  right = "0.5cell",
  top = "0.25cell",
  bottom = "0.25cell",
}
config.keys = {
  {
    key = 'n',
    mods = 'SHIFT|CTRL',
    action = wezterm.action.ToggleFullScreen,
  },
}

-- host specific config
local_config.apply_to_config(config)

return config
