local close_terms = function()
  -- close all term windows in all tabs
  for i = 1, vim.fn.tabpagenr('$'), 1 do
    local current_tab = vim.fn.tabpagenr()
    vim.cmd(i .. 'tabnext')
    for j = vim.fn.winnr('$'), 1, -1 do
      local buf_name = vim.fn.bufname(vim.fn.winbufnr(j))
      if vim.startswith(buf_name, 'term://') then
        vim.cmd(j .. 'wincmd c')
      end
    end
    -- back to current tab
    vim.cmd(current_tab .. 'tabnext')
  end
end

local close_terms_in_other_tab = function()
  local current_tab = vim.fn.tabpagenr()
  for i = 1, vim.fn.tabpagenr('$'), 1 do
    if i ~= current_tab then
      vim.cmd(i .. 'tabnext')
      for j = vim.fn.winnr('$'), 1, -1 do
        local buf_name = vim.fn.bufname(vim.fn.winbufnr(j))
        if vim.startswith(buf_name, 'term://') then
          vim.cmd(j .. 'wincmd c')
        end
      end
    end
  end
  -- back to current tab
  vim.cmd(current_tab .. 'tabnext')
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

local toggle_quickfix = function()
  for _, win in pairs(vim.fn.getwininfo()) do
    if win.quickfix == 1 then
      vim.cmd('cclose')
      return
    end
  end
  vim.cmd('botright cwindow | setlocal nowrap')
end

return {
  close_terms = close_terms,
  close_terms_in_other_tab = close_terms_in_other_tab,
  toggle_maximize = toggle_maximize,
  toggle_quickfix = toggle_quickfix,
}
