local is_debugger_open = function()
  for i = vim.fn.winnr('$'), 1, -1 do
    local buf_name = vim.fn.bufname(vim.fn.winbufnr(i))
    if buf_name == 'DAP Breakpoints' then
      return true
    end
  end
  return false
end

local open_debugger = function()
  if is_debugger_open() then
    return
  end
  local position = vim.fn.line('.')
  vim.cmd.tabe('%')
  -- restore position
  vim.cmd([[execute "normal! " . ]] .. position .. [[ . "ggzz"]])
  require('dapui').open()
end

local close_debugger = function()
  if not is_debugger_open() then
    return
  end
  require('dapui').close()
  if vim.fn.tabpagenr() > 1 then
    vim.cmd.tabclose()
  end
end

local toggle_debugger = function()
  if is_debugger_open() then
    close_debugger()
  else
    open_debugger()
  end
end

-- Maximize (Open in new tab)
local toggle_maximize = function()
  local is_term = function()
    return vim.startswith(vim.fn.bufname(), 'term://')
  end
  if vim.fn.winnr('$') == 1 then
    if vim.fn.tabpagenr() > 1 then
      vim.cmd.tabclose()
      if is_term() then
        -- fix blank screen
        vim.cmd([[execute "stopinsert"]])
      end
    end
  else
    local position = vim.fn.line('.')
    vim.cmd.tabe('%')
    if not is_term() then
      -- restore position
      vim.cmd([[execute "normal! " . ]] .. position .. [[ . "ggzz"]])
    end
  end
end

return {
  open_debugger = open_debugger,
  close_debugger = close_debugger,
  toggle_debugger = toggle_debugger,
  toggle_maximize = toggle_maximize,
}
