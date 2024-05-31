local require_safe = function(name)
  local ok, module = pcall(require, name)
  if not ok then
    print('Failed to load ' .. name .. ': ' .. module)
    return {}
  end
  if type(module) == 'table' then
    return module
  end
  return {}
end

local wezterm = require 'wezterm';
local local_config = require_safe 'local_config';

local config = {}

if wezterm.config_builder then
  config = wezterm.config_builder()
end

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
-- Note: The window can be dragged by SUPER+left mouse drag
-- config.window_decorations = "RESIZE"
config.window_padding = {
  left = "0.2cell",
  right = "0.2cell",
  top = "0cell",
  bottom = "0cell",
}
config.keys = {
  {
    key = 'n',
    mods = 'SHIFT|CTRL',
    action = wezterm.action.ToggleFullScreen,
  },
}
config.native_macos_fullscreen_mode = true

-- host specific config
if type(local_config.apply_to_config) == 'function' then
  local_config.apply_to_config(config)
end

return config
