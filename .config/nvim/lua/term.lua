local M = {}

local function get_current_win()
  return vim.t.managed_terminal_win
end

local function set_current_win(win)
  vim.t.managed_terminal_win = win
end

local function get_last_opened_label()
  return vim.t.last_opened_terminal_label
end

local function set_last_opened_label(label)
  vim.t.last_opened_terminal_label = label
end

local function find_terminal(label)
  for _, bufnr in ipairs(vim.api.nvim_list_bufs()) do
    if vim.b[bufnr].managed_terminal
        and vim.b[bufnr].terminal_label == label then
      return bufnr
    end
  end
end

local function default_terminal_height()
  return math.max(8, math.floor(vim.o.lines * 0.4))
end

local function terminal_height()
  return vim.t.managed_terminal_height or default_terminal_height()
end

local function set_terminal_height(height)
  vim.t.managed_terminal_height = height
end

local function is_managed_terminal_win(win)
  if not win or not vim.api.nvim_win_is_valid(win) then
    return false
  end

  local bufnr = vim.api.nvim_win_get_buf(win)
  return vim.b[bufnr].managed_terminal == true
end

local function hide_current()
  local win = get_current_win()
  if is_managed_terminal_win(win) then
    set_terminal_height(vim.api.nvim_win_get_height(win))
    vim.api.nvim_win_close(win, true)
  end
  set_current_win(nil)
end

local function ensure_terminal(label)
  local bufnr = find_terminal(label)

  if bufnr and vim.api.nvim_buf_is_valid(bufnr) then
    return bufnr
  end

  local new_bufnr = vim.api.nvim_create_buf(true, true)

  vim.api.nvim_buf_call(new_bufnr, function()
    vim.fn.termopen(vim.o.shell, {
      on_exit = function()
        vim.schedule(function()
          if vim.api.nvim_buf_is_valid(new_bufnr) then
            vim.api.nvim_buf_delete(new_bufnr, { force = true })
          end
        end)
      end,
    })
  end)

  vim.api.nvim_buf_set_name(new_bufnr, "term:" .. label)
  vim.b[new_bufnr].managed_terminal = true
  vim.b[new_bufnr].terminal_label = label

  return new_bufnr
end

function M.open(label)
  local bufnr = ensure_terminal(label)

  if is_managed_terminal_win(get_current_win()) then
    if vim.api.nvim_win_get_buf(get_current_win()) == bufnr then
      set_last_opened_label(label)
      vim.cmd("startinsert")
      return
    end

    hide_current()
  end

  vim.cmd(("botright %dsplit"):format(terminal_height()))
  set_current_win(vim.api.nvim_get_current_win())

  vim.api.nvim_win_set_buf(get_current_win(), bufnr)
  vim.cmd("resize " .. terminal_height())

  set_last_opened_label(label)
  vim.cmd("startinsert")
end

function M.toggle(default_label)
  if is_managed_terminal_win(get_current_win()) then
    hide_current()
    return
  end

  M.open(get_last_opened_label() or default_label)
end

function M.exec(label, command)
  local bufnr = ensure_terminal(label)

  local job = vim.b[bufnr].terminal_job_id

  if job then
    vim.fn.chansend(job, command .. "\n")
  end
end

return M
