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
        word = '',
        abbr = p,
        menu = '[Snip]',
        kind = 'Snippet',
        info = name .. '\n' .. body,
        user_data = { snippet_body = body, snippet_prefix = p },
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

      if type(user_data) ~= 'table' or not user_data.snippet_body then return end

      -- word='' means completion already removed the typed prefix (from start_col to cursor).
      -- Just expand the snippet at the current cursor position.
      vim.schedule(function()
        vim.snippet.expand(user_data.snippet_body)
      end)
    end,
  })
end

--- Auto-trigger snippet completion on TextChangedI.
--- Deferred to give LSP completion priority.
local function setup_auto_trigger()
  local timer = nil

  vim.api.nvim_create_autocmd('TextChangedI', {
    group = vim.api.nvim_create_augroup('UserSnippetAutoTrigger', {}),
    callback = function()
      -- Cancel any pending trigger
      if timer then
        timer:stop()
        timer = nil
      end

      -- Defer to give LSP completion a chance to show first
      timer = vim.defer_fn(function()
        timer = nil

        -- Don't interfere if popup menu is already visible (e.g. from LSP)
        if vim.fn.pumvisible() == 1 then return end
        -- Must be in insert mode
        if vim.fn.mode() ~= 'i' then return end

        local ft = vim.bo.filetype
        local items = get_snippets(ft)
        if #items == 0 then return end

        local col = vim.fn.col('.')
        local line = vim.fn.getline('.')
        local prefix = line:sub(1, col - 1):match('[%w_-]+$')
        if not prefix or #prefix < 1 then return end

        local filtered = {}
        for _, item in ipairs(items) do
          if item.abbr:sub(1, #prefix) == prefix then
            table.insert(filtered, item)
          end
        end

        if #filtered > 0 then
          local start_col = col - #prefix
          vim.fn.complete(start_col, filtered)
        end
      end, 100) -- 100ms delay to let LSP respond first
    end,
  })
end

--- Setup snippet jump keymaps (<C-f> next, <C-b> prev).
local function setup_jump_keymaps()
  vim.keymap.set({ 'i', 's' }, '<C-f>', function()
    if vim.snippet.active({ direction = 1 }) then
      vim.snippet.jump(1)
    else
      return vim.api.nvim_replace_termcodes('<C-f>', true, false, true)
    end
  end, { expr = true, silent = true, desc = 'Snippet: jump to next placeholder' })

  vim.keymap.set({ 'i', 's' }, '<C-b>', function()
    if vim.snippet.active({ direction = -1 }) then
      vim.snippet.jump(-1)
    else
      return vim.api.nvim_replace_termcodes('<C-b>', true, false, true)
    end
  end, { expr = true, silent = true, desc = 'Snippet: jump to prev placeholder' })
end

--- Setup: register autocmds and keymaps.
function M.setup()
  setup_expand_autocmd()
  setup_auto_trigger()
  setup_jump_keymaps()
end

return M
