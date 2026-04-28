-- snippet_loader.lua
-- Load VSCode-format JSON snippets and provide them as native completion items.
-- Supports personal snippets and plugin snippets (e.g. friendly-snippets).

local M = {}

local snippets_dir = vim.fn.stdpath('config') .. '/snippets'
local loaded = {} -- cache: filetype -> list of completion items

--- Parse VSCode-format snippet JSON and return completion items.
--- @param filepath string
--- @param base_dir string
--- @return table[]
local function parse_snippet_file(filepath, base_dir)
  local resolved = filepath:gsub('^%./', '')
  local full_path = base_dir .. '/' .. resolved
  local f = io.open(full_path, 'r')
  if not f then return {} end
  local content = f:read('*a')
  f:close()

  local ok, data = pcall(vim.json.decode, content)
  if not ok or type(data) ~= 'table' then return {} end

  local items = {}
  for name, snippet in pairs(data) do
    local prefix = snippet.prefix
    -- prefix can be a string or array of strings
    local prefixes = type(prefix) == 'table' and prefix or { prefix }
    local body = snippet.body
    if type(body) == 'table' then
      body = table.concat(body, '\n')
    end
    for _, p in ipairs(prefixes) do
      table.insert(items, {
        word = p,
        abbr = p,
        menu = '[Snip]',
        kind = 'Snippet',
        info = name .. '\n' .. body,
        user_data = { snippet_body = body },
      })
    end
  end
  return items
end

--- Load snippets from a package.json contributes.snippets entry.
--- @param pkg_path string
--- @param ft string
--- @return table[]
local function load_from_package(pkg_path, ft)
  local f = io.open(pkg_path, 'r')
  if not f then return {} end
  local content = f:read('*a')
  f:close()

  local ok, pkg = pcall(vim.json.decode, content)
  if not ok or not pkg.contributes or not pkg.contributes.snippets then return {} end

  local base_dir = vim.fn.fnamemodify(pkg_path, ':h')
  local items = {}
  for _, entry in ipairs(pkg.contributes.snippets) do
    local languages = entry.language
    if type(languages) == 'string' then
      languages = { languages }
    end
    for _, lang in ipairs(languages) do
      if lang == ft then
        vim.list_extend(items, parse_snippet_file(entry.path, base_dir))
      end
    end
  end
  return items
end

--- Find all snippet package.json files (personal + plugins).
--- @return string[]
local function find_snippet_packages()
  local packages = {}

  -- Personal snippets
  local personal = snippets_dir .. '/package.json'
  if vim.fn.filereadable(personal) == 1 then
    table.insert(packages, personal)
  end

  -- Plugin snippets (search packpath for package.json with contributes.snippets)
  for _, dir in ipairs(vim.opt.packpath:get()) do
    local glob = dir .. '/pack/*/start/*/package.json'
    local files = vim.fn.glob(glob, false, true)
    vim.list_extend(packages, files)
  end

  return packages
end

--- Get snippet items for a filetype, loading from disk if needed.
--- @param ft string
--- @return table[]
local function get_snippets(ft)
  if loaded[ft] then return loaded[ft] end

  local items = {}
  for _, pkg_path in ipairs(find_snippet_packages()) do
    vim.list_extend(items, load_from_package(pkg_path, ft))
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

--- Trigger snippet completion.
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
