local M = {}

-- Maximize (Open in new tab)
function M.toggle_maximize()
  local is_term = function()
    return vim.startswith(vim.fn.bufname(), 'term:')
  end
  if vim.fn.winnr('$') == 1 then
    if vim.fn.tabpagenr() > 1 then
      vim.cmd.tabclose()
      if is_term() then
        -- fix blank screen
        vim.cmd('stopinsert')
      end
    end
  else
    if not is_term() then
      -- mark current position
      vim.cmd('normal! m"')
    end
    -- open in new tab
    vim.cmd.tabe('%')
    if not is_term() then
      -- restore position
      vim.cmd('normal! `"')
    end
  end
end

function M.toggle_quickfix()
  for _, win in pairs(vim.fn.getwininfo()) do
    if win.quickfix == 1 then
      vim.cmd('cclose')
      return
    end
  end
  vim.cmd('botright cwindow | setlocal nowrap')
end

return M
