-- snippet_loader.lua
-- Load VSCode-format JSON snippets and provide them as native completion items.

local M = {}

local snippets_dir = vim.fn.stdpath('config') .. '/snippets'
local loaded = {} -- cache: filetype -> list of completion items

--- Parse VSCode-format snippet JSON and return completion items.
--- @param filepath string
--- @return table[]
local function parse_snippet_file(filepath)
  local f = io.open(filepath, 'r')
  if not f then return {} end
  local content = f:read('*a')
  f:close()

  local ok, data = pcall(vim.json.decode, content)
  if not ok or type(data) ~= 'table' then return {} end

  local items = {}
  for name, snippet in pairs(data) do
    local body = snippet.body
    if type(body) == 'table' then
      body = table.concat(body, '\n')
    end
    table.insert(items, {
      word = snippet.prefix,
      abbr = snippet.prefix,
      menu = '[Snip]',
      kind = 'Snippet',
      info = name .. '\n' .. body,
      user_data = { snippet_body = body },
    })
  end
  return items
end

--- Get snippet items for a filetype, loading from disk if needed.
--- @param ft string
--- @return table[]
local function get_snippets(ft)
  if loaded[ft] then return loaded[ft] end

  -- Read package.json to find snippet file for this filetype
  local pkg_path = snippets_dir .. '/package.json'
  local f = io.open(pkg_path, 'r')
  if not f then
    loaded[ft] = {}
    return {}
  end
  local content = f:read('*a')
  f:close()

  local ok, pkg = pcall(vim.json.decode, content)
  if not ok or not pkg.contributes or not pkg.contributes.snippets then
    loaded[ft] = {}
    return {}
  end

  local items = {}
  for _, entry in ipairs(pkg.contributes.snippets) do
    if entry.language == ft then
      local path = entry.path:gsub('^%./', '')
      items = parse_snippet_file(snippets_dir .. '/' .. path)
      break
    end
  end
  loaded[ft] = items
  return items
end

--- Expand snippet body when a snippet completion item is confirmed.
local function setup_expand_autocmd()
  vim.api.nvim_create_autocmd('CompleteDone', {
    group = vim.api.nvim_create_augroup('UserSnippetExpand', {}),
    callback = function()
      local item = vim.v.completed_item
      if not item or not item.user_data then return end

      local user_data = item.user_data
      if type(user_data) == 'string' then
        local ok, parsed = pcall(vim.json.decode, user_data)
        if ok then user_data = parsed end
      end

      if type(user_data) == 'table' and user_data.snippet_body then
        -- Remove the inserted prefix text, then expand the snippet
        local prefix = item.word or ''
        if #prefix > 0 then
          local row, col = unpack(vim.api.nvim_win_get_cursor(0))
          local line = vim.api.nvim_get_current_line()
          local before = line:sub(1, col - #prefix)
          local after = line:sub(col + 1)
          vim.api.nvim_set_current_line(before .. after)
          vim.api.nvim_win_set_cursor(0, { row, #before })
        end
        vim.snippet.expand(user_data.snippet_body)
      end
    end,
  })
end

--- Trigger snippet completion alongside LSP completion.
--- Call this in insert mode to add snippet items to the completion menu.
function M.complete()
  local ft = vim.bo.filetype
  local items = get_snippets(ft)
  if #items == 0 then return end

  local col = vim.fn.col('.')
  local line = vim.fn.getline('.')
  local prefix = line:sub(1, col - 1):match('[%w_-]*$') or ''
  local start_col = col - #prefix

  local filtered = {}
  for _, item in ipairs(items) do
    if prefix == '' or item.word:sub(1, #prefix) == prefix then
      table.insert(filtered, item)
    end
  end

  if #filtered > 0 then
    vim.fn.complete(start_col, filtered)
  end
end

--- Setup: register autocmds for snippet expansion and keymap.
function M.setup()
  setup_expand_autocmd()

  -- <C-s> to trigger snippet completion manually
  vim.keymap.set('i', '<C-s>', function()
    M.complete()
  end, { silent = true, desc = 'Trigger snippet completion' })
end

return M
