-- lua version compatibility
---@diagnostic disable-next-line: deprecated
table.unpack = table.unpack or unpack

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

local setup_options = function()
  vim.opt.shada = {
    '!',
    "'1000", -- max number of previously edited files (oldfiles)
    '<50',
    's10',
    'h'
  }
  vim.opt.undofile = true
  vim.opt.ignorecase = true
  vim.opt.smartcase = true
  vim.opt.wildignore = { '.git', 'node_modules' }
  vim.opt.wildmode = { 'longest', 'full' }
  vim.opt.wildoptions = { 'fuzzy', 'pum', 'tagfile' }
  vim.opt.completeopt = { 'menu', 'menuone', 'noinsert', 'popup' }
  vim.opt.clipboard = "unnamedplus"
  vim.opt.termguicolors = true
  vim.opt.cursorline = true
  vim.opt.foldmethod = 'indent'
  vim.opt.foldlevel = 99
  vim.opt.splitbelow = true
  vim.opt.splitright = true
  vim.opt.wrap = false
  vim.opt.tabstop = 8
  vim.opt.expandtab = true
  vim.opt.shiftwidth = 2
  vim.opt.softtabstop = 2
  vim.opt.grepprg = 'grep -n -H -R --exclude-dir ".git" $* .'
  if vim.fn.executable('rg') then
    vim.opt.grepprg = 'rg --vimgrep --glob "!.git" --glob "!node_modules"'
  end
  vim.opt.maxmempattern = 10000
  vim.opt.cmdheight = 2
  vim.opt.shortmess:append('s') -- don't show "search hit BOTTOM, ..."

  vim.g.markdown_fenced_languages = { 'sh', 'mermaid' }
  vim.g.netrw_banner = 0
  vim.g.newrw_hide = 0
  vim.g.netrw_liststyle = 3
  -- spell
  vim.o.spell = true
  vim.o.spelllang = 'en,cjk'
  vim.o.spelloptions = 'camel'
  -- disable mouse
  -- vim.o.mouse = ''
  vim.opt.belloff =
  'backspace,cursor,complete,copy,ctrlg,error,esc,hangul,lang,mess,showmatch,operator,register,shell,spell,wildmode'
  vim.opt.errorbells = true
  vim.opt.visualbell = false
end

local setup_utilities = function()
  local config_path = vim.fn.stdpath('config')
  vim.cmd.source(config_path .. '/vim/oldfiles.vim')
  vim.cmd.source(config_path .. '/vim/buffers.vim')
  vim.cmd.source(config_path .. '/vim/outline.vim')
  vim.cmd.source(config_path .. '/vim/tabline.vim')
end

local hide_statusline = function()
  vim.opt.laststatus = 0
  vim.cmd [[
  hi! link StatusLine WinSeparator
  hi! link StatusLineNC WinSeparator
  ]]
  vim.opt.statusline = [[%{repeat('─', winwidth('.'))}]]
end

local setup_appearance = function()
  vim.g.everforest_background = 'soft'
  vim.opt.background = 'dark'
  vim.cmd.colorscheme('everforest')

  -- statusline
  hide_statusline()
  -- vim.opt.laststatus = 3

  -- tabline
  vim.opt.tabline = '%!MyTabLine()'
  -- vim.opt.showtabline = 2

  -- ruler
  vim.opt.rulerformat = table.concat({
    -- '%20(',
    -- align right
    '%=',
    -- terminal number
    '%#Purple#%{&ft == "toggleterm" ? "#" . b:toggle_number : ""}%*',
    '  ',
    '%l,%c%V %P',
    -- '%)',
  })

  -- https://github.com/neovim/nvim-lspconfig/wiki/UI-Customization
  vim.diagnostic.config({
    virtual_text = false,
    signs = true,
    underline = false,
    update_in_insert = false,
    severity_sort = true,
  })

  -- spell
  vim.cmd [[
  hi clear SpellBad
  hi SpellBad cterm=underline gui=underline
  ]]
end

local setup_keymap = function()
  local window_utils = require('window_utils')

  vim.g.mapleader = ' '
  -- utilities
  vim.keymap.set('n', '<leader>r', 'q:?')
  vim.keymap.set('n', '<leader>f', ':<C-u>Files<CR>')
  vim.keymap.set('n', '<leader>o', ':<C-u>Oldfiles<CR>')
  vim.keymap.set('n', '<leader>b', ':<C-u>Buffers<CR>')
  vim.keymap.set('n', '<leader>w', ':<C-u>setl wrap!<CR>')
  vim.keymap.set('n', '<leader>n', ':<C-u>setl number!<CR>')
  vim.keymap.set('n', '<leader>s', ':<C-u>gr!<Space>')
  vim.keymap.set('n', '<leader>x', [[:<C-u><C-r>=v:count1<CR>TermExec cmd=''<Left>]])
  vim.keymap.set('n', '<leader>z', ':<C-u>setl foldlevel=')
  vim.keymap.set('n', '<leader>q', window_utils.toggle_quickfix)
  vim.keymap.set({ 'n', 'v' }, '<leader>c', ':CopyContext<CR>')
  vim.keymap.set('n', 's', '<Plug>(easymotion-overwin-f2)')
  vim.keymap.set('n', '-', '<Cmd>Oil<CR>')
  -- vim.keymap.set('n', '-', ':<C-u>e %:h <bar> /<C-r>=expand("%:t")<CR><CR>:nohlsearch<CR>:file<CR>')
  -- vim.keymap.set('n', '-', ':<C-u>e %:h<CR>')
  -- vim.keymap.set('v', '//', [[y/\V<C-r>=escape(@",'/\')<CR><CR>]]) -- -> use * or # instead

  -- window
  vim.keymap.set('n', '<C-w>z', window_utils.toggle_maximize)
  vim.keymap.set('n', '<C-w>t', function()
    window_utils.close_terms_in_other_tab()
    vim.cmd(vim.v.count .. 'ToggleTerm')
  end)
  for i = 1, 5, 1 do
    vim.keymap.set('n', '<C-w>' .. i, string.format('<Cmd>CloseTerms<CR><Cmd>%dToggleTerm<CR>', i))
    vim.keymap.set('n', '<F' .. i .. '>', string.format('<Cmd>CloseTerms<CR><Cmd>%dToggleTerm<CR>', i))
  end

  -- terminal
  vim.api.nvim_create_autocmd({ 'TermOpen' }, {
    group = vim.api.nvim_create_augroup('UserTerminalKeymapConfig', {}),
    pattern = '*',
    callback = function()
      local opts = { buffer = 0 }
      vim.keymap.set('t', '<esc>', [[<C-\><C-n>]], opts)
      vim.keymap.set('t', '<C-g>', '<Cmd>file<CR>', opts)
      vim.keymap.set('t', '<C-w>h', '<Cmd>wincmd h<CR>', opts)
      vim.keymap.set('t', '<C-w>j', '<Cmd>wincmd j<CR>', opts)
      vim.keymap.set('t', '<C-w>k', '<Cmd>wincmd k<CR>', opts)
      vim.keymap.set('t', '<C-w>l', '<Cmd>wincmd l<CR>', opts)
      vim.keymap.set('t', '<C-w>c', '<Cmd>wincmd c<CR>', opts)
      vim.keymap.set('t', '<C-w><C-w>', '<Cmd>wincmd w<CR>', opts)
      vim.keymap.set('t', '<C-w>gt', '<Cmd>tabnext<CR>', opts)
      vim.keymap.set('t', '<C-w>gT', '<Cmd>tabprevious<CR>', opts)
      vim.keymap.set('t', '<C-w>t', '<Cmd>ToggleTerm<CR>', {})
      vim.keymap.set('t', '<C-w>z', window_utils.toggle_maximize)
      for i = 1, 5, 1 do
        vim.keymap.set('t', '<C-w>' .. i, string.format('<Cmd>CloseTerms<CR><Cmd>%dToggleTerm<CR>', i))
        vim.keymap.set('t', '<F' .. i .. '>', string.format('<Cmd>CloseTerms<CR><Cmd>%dToggleTerm<CR>', i))
      end
    end,
  })

  -- lsp
  -- https://github.com/neovim/nvim-lspconfig
  vim.keymap.set('n', '[d', vim.diagnostic.goto_prev)
  vim.keymap.set('n', ']d', vim.diagnostic.goto_next)

  vim.api.nvim_create_autocmd('LspAttach', {
    group = vim.api.nvim_create_augroup('UserLspKeymapConfig', {}),
    callback = function(ev)
      local opts = { buffer = ev.buf }
      vim.keymap.set({ 'n', 'v' }, '<leader>a', vim.lsp.buf.code_action, opts)
      vim.keymap.set('n', 'gd', vim.lsp.buf.definition, opts)
      vim.keymap.set('n', 'gr', vim.lsp.buf.references, opts)
      vim.keymap.set('n', 'gi', vim.lsp.buf.implementation, opts)
      -- default
      -- vim.keymap.set('n', 'K', vim.lsp.buf.hover, opts)
      vim.keymap.set({ 'n', 'i' }, '<C-k>', vim.lsp.buf.signature_help, opts)
    end,
  })

  -- git
  vim.keymap.set('n', '<leader>gf', ':<C-u>Git fetch --prune<CR>')
  vim.keymap.set('n', '<leader>gc', ':<C-u>Git checkout<Space>')
  vim.keymap.set('n', '<leader>gp', ':<C-u>Git pull origin <C-r>=FugitiveHead()<CR><CR>')
  vim.keymap.set('n', '<leader>gP',
    [[:5TermExec open=0 cmd='with_notify git push origin <C-r>=FugitiveHead()<CR>'<Left>]])
  vim.keymap.set('n', '<leader>gb', ':<C-u>Git blame<CR>')
  vim.keymap.set('n', '<leader>gl', ':<C-u>Git log %<CR>')

  -- luasnip
  local ls = require('luasnip')

  vim.keymap.set({ "i", "s" }, "<C-f>", function()
    if ls.jumpable(1) then
      ls.jump(1)
    end
  end, { silent = true })

  vim.keymap.set({ "i", "s" }, "<C-b>", function()
    if ls.jumpable(1) then
      ls.jump(-1)
    end
  end, { silent = true })

  -- minuet
  vim.keymap.set({ "i", "s" }, "<C-l>", function()
    if vim.fn.mode() == 'i' then
      require('minuet.virtualtext').action.next()
    end
  end, { silent = true })

  vim.keymap.set({ "i", "s" }, "<C-h>", function()
    if require('minuet.virtualtext').action.is_visible() then
      require('minuet.virtualtext').action.prev()
    else
      return vim.api.nvim_replace_termcodes("<C-h>", true, false, true)
    end
  end, { expr = true, silent = true })

  vim.keymap.set({ "i", "s" }, "<Tab>", function()
    if require('minuet.virtualtext').action.is_visible() then
      require('minuet.virtualtext').action.accept()
    else
      return vim.api.nvim_replace_termcodes("<Tab>", true, false, true)
    end
  end, { expr = true, silent = true })
end

local setup_commands = function()
  local window_utils = require('window_utils')
  local commands = {
    { 'Buffers',              'call Buffers()',                                         {} },
    { 'Oldfiles',             function() vim.fn['Oldfiles']({ only_cwd = true }) end,   {} },
    { 'OldfilesGlobal',       function() vim.fn['Oldfiles']() end,                      {} },
    { 'Outline',              'call Outline()',                                         {} },
    { 'CloseTerms',           function() window_utils.close_terms() end,                {} },
    { 'ToggleHighlightColor', function() require("nvim-highlight-colors").toggle() end, {} },
    { 'Diagnostics',          function() vim.diagnostic.setloclist() end,               {} },
    { 'CopyContext', function(opts)
      -- file explorer -> copy path
      if vim.bo.filetype == 'oil' then
        require('oil.actions').copy_entry_path.callback()
        vim.fn.setreg('+', vim.fn.fnamemodify(vim.fn.getreg(vim.v.register), ":."))
        return
      end
      -- visual mode or range -> copy path with range
      if opts.range > 0 then
        local range_start = opts.line1
        local range_end = opts.line2
        if range_start == range_end then
          vim.fn.setreg('+', vim.fn.expand('%') .. ':' .. range_start)
        else
          vim.fn.setreg('+', vim.fn.expand('%') .. ':' .. range_start .. '-' .. range_end)
        end
        return
      end
      -- normal mode -> copy path
      vim.fn.setreg('+', vim.fn.expand('%'))
    end, { range = true } },
  }

  for _, command in ipairs(commands) do
    vim.api.nvim_create_user_command(table.unpack(command))
  end

  vim.api.nvim_create_user_command('EditSnippets', function()
    require("luasnip.loaders").edit_snippet_files()
  end, {})

  vim.api.nvim_create_autocmd('LspAttach', {
    group = vim.api.nvim_create_augroup('UserLspCommandConfig', {}),
    callback = function()
      local lsp_utils = require('lsp_utils')
      local lsp_commands = {
        { 'LspRename',                function() vim.lsp.buf.rename() end,                                  {} },
        { 'LspFormat',                function() vim.lsp.buf.format({ async = false }) end,                 {} },
        { 'LspTypeDefinition',        function() vim.lsp.buf.type_definition() end,                         {} },
        { 'LspDeclaration',           function() vim.lsp.buf.declaration() end,                             {} },
        { 'LspImplementation',        function() vim.lsp.buf.implementation() end,                          {} },
        { 'LspIncomingCall',          function() vim.lsp.buf.incoming_calls() end,                          {} },
        { 'LspOutgoingCall',          function() vim.lsp.buf.outgoing_calls() end,                          {} },
        { 'LspIncomingCallRecursive', function() lsp_utils.lsp_call_hierarchy_recursive('incoming', 4) end, {} },
        { 'LspOutgoingCallRecursive', function() lsp_utils.lsp_call_hierarchy_recursive('outgoing', 2) end, {} },
      }
      for _, command in ipairs(lsp_commands) do
        vim.api.nvim_create_user_command(table.unpack(command))
      end
    end,
  })

  -- Delete buffers that reference non-existent files
  vim.api.nvim_create_user_command('DeleteUnavailableBuffers', function()
    local bufs_to_delete = {}
    for _, bufnr in ipairs(vim.api.nvim_list_bufs()) do
      if vim.api.nvim_buf_is_loaded(bufnr) then
        local bufname = vim.api.nvim_buf_get_name(bufnr)
        -- The buffer has a file path and the file is not readable,
        if bufname ~= "" and vim.fn.filereadable(bufname) == 0 then
          -- buftype is empty (not a special buffer)
          local buftype = vim.api.nvim_get_option_value('buftype', { buf = bufnr })
          if buftype == "" then
            table.insert(bufs_to_delete, bufnr)
          end
        end
      end
    end

    if #bufs_to_delete > 0 then
      for _, bufnr in ipairs(bufs_to_delete) do
        vim.api.nvim_buf_delete(bufnr, { force = true })
      end
      vim.notify("Deleted " .. #bufs_to_delete .. " unavailable buffers.", vim.log.levels.INFO)
    else
      vim.notify("No unavailable buffers to delete.", vim.log.levels.INFO)
    end
  end, {})

  -- Function to get selected text in visual mode
  local get_visual_selection = function()
    local start_pos = vim.fn.getpos("'<")
    local end_pos = vim.fn.getpos("'>")
    local lines = vim.fn.getline(start_pos[2], end_pos[2])
    if #lines == 0 then
      return ''
    elseif #lines == 1 then
      return string.sub(lines[1], start_pos[3], end_pos[3])
    else
      lines[1] = string.sub(lines[1], start_pos[3])
      lines[#lines] = string.sub(lines[#lines], 1, end_pos[3])
      return table.concat(lines, '\n')
    end
  end

  -- Generic document reference command
  vim.api.nvim_create_user_command('Doc', function(opts)
    local filetype = vim.bo.filetype
    local cursor_word

    if opts.range > 0 then
      -- Get the selected text in visual mode
      cursor_word = get_visual_selection()
      cursor_word = cursor_word:gsub('\n', ' ')
    else
      -- Get the word under the cursor in normal mode
      cursor_word = vim.fn.expand('<cword>')
    end

    local open_cmd = vim.fn.has('linux') == 1 and 'xdg-open' or 'open'
    if filetype == 'terraform' then
      local url = 'https://registry.terraform.io/search/providers?q=' .. cursor_word
      vim.fn.system({ open_cmd, url })
    else
      local url = 'https://www.google.com/search?q=' .. cursor_word
      vim.fn.system({ open_cmd, url })
    end
  end, { range = true })

  -- Ask (LLM) command
  vim.api.nvim_create_user_command('Ask', function(opts)
    local cursor_word = ''
    local question = table.concat(opts.fargs, " ")

    if opts.range > 0 then
      -- Get the selected text in visual mode
      cursor_word = get_visual_selection()
    end

    local query = cursor_word .. "\n" .. question
    local url = 'https://www.perplexity.ai/?q=' .. query
    local open_cmd = vim.fn.has('linux') == 1 and 'xdg-open' or 'open'
    vim.fn.system({ open_cmd, url })
  end, { range = true, nargs = '*' })
end

local setup_auto_commands = function()
  -- reload changed files
  vim.api.nvim_create_autocmd({ "WinEnter", "BufEnter", "FocusGained" }, {
    group = vim.api.nvim_create_augroup("UserAutoReloadFile", {}),
    callback = function(args)
      local bufnr = args.buf
      -- normal buffer and the buffer name (file path) exists
      if vim.bo[bufnr].buftype == '' and vim.api.nvim_buf_get_name(bufnr) ~= '' then
        vim.cmd("checktime")
      end
    end,
  })

  -- update oldfiles
  vim.api.nvim_create_autocmd({ 'BufEnter' }, {
    group = vim.api.nvim_create_augroup('UserUpdateOldfiles', {}),
    pattern = '*',
    callback = function()
      vim.fn['UpdateOldfiles'](vim.fn.expand('<afile>:p'))
    end,
  })

  -- open quickfix window after grep
  vim.api.nvim_create_autocmd({ 'QuickFixCmdPost' }, {
    group = vim.api.nvim_create_augroup('UserOpenQuickfixWindowAfterGrep', {}),
    pattern = '*grep*',
    command = 'botright cwindow | setlocal nowrap'
  })

  -- folding method
  vim.api.nvim_create_autocmd({ 'FileType' }, {
    callback = function()
      if require('nvim-treesitter.parsers').has_parser() then
        vim.wo.foldmethod = 'expr'
        vim.wo.foldexpr = 'v:lua.vim.treesitter.foldexpr()'
      else
        vim.wo.foldmethod = 'indent'
      end
    end
  })

  -- indent
  local indent_config = {
    { 'go',       'setlocal tabstop=4 noexpandtab softtabstop=4 shiftwidth=4' },
    { 'xml',      'setlocal tabstop=4' },
    { 'markdown', 'setlocal tabstop=2 expandtab softtabstop=2 shiftwidth=2' },
  }

  for _, config in ipairs(indent_config) do
    vim.api.nvim_create_autocmd({ 'FileType' }, {
      pattern = config[1],
      group = vim.api.nvim_create_augroup('UserIndentConfig', {}),
      command = config[2],
    })
  end

  -- disable spell check
  vim.api.nvim_create_autocmd({ 'FileType' }, {
    pattern = { 'toggleterm', 'qf' },
    group = vim.api.nvim_create_augroup('UserDisableSpellCheck', {}),
    command = 'setlocal nospell'
  })

  -- fix syntax highlighting
  -- https://vim.fandom.com/wiki/Fix_syntax_highlighting
  -- vim.api.nvim_create_autocmd({ 'BufEnter', 'InsertLeave' }, {
  --   group = vim.api.nvim_create_augroup('UserFixSyntaxHighlighting', {}),
  --   pattern = { '*' },
  --   command = 'syntax sync fromstart'
  -- })

  -- oil
  vim.api.nvim_create_autocmd({ 'FileType' }, {
    group = vim.api.nvim_create_augroup('UserOilShowPath', {}),
    pattern = { 'oil' },
    callback = function()
      -- show path
      vim.cmd.file()
    end,
  })

  -- fzf
  vim.api.nvim_create_autocmd({ 'FileType' }, {
    group = vim.api.nvim_create_augroup('UserFzfExitOnEsc', {}),
    pattern = { 'fzf' },
    callback = function()
      vim.keymap.set('t', '<esc>', '<C-c>', { buffer = true })
    end,
  })

  local lsp_utils = require('lsp_utils')
  lsp_utils.lsp_call_hierarchy_recursive_setup_autocmd()
end

local setup_plugins = function()
  -- https://github.com/folke/lazy.nvim
  local lazypath = vim.fn.stdpath('data') .. '/lazy/lazy.nvim'
  if not (vim.uv or vim.loop).fs_stat(lazypath) then
    local lazyrepo = 'https://github.com/folke/lazy.nvim.git'
    local out = vim.fn.system({ 'git', 'clone', '--filter=blob:none', '--branch=stable', lazyrepo, lazypath })
    if vim.v.shell_error ~= 0 then
      vim.api.nvim_echo({
        { 'Failed to clone lazy.nvim:\n', 'ErrorMsg' },
        { out,                            'WarningMsg' },
        { '\nPress any key to exit...' },
      }, true, {})
      vim.fn.getchar()
      os.exit(1)
    end
  end
  vim.opt.rtp:prepend(lazypath)

  require('lazy').setup({
    -- syntax
    'nvim-treesitter/nvim-treesitter',

    -- ui
    'sainnhe/everforest',
    'stevearc/dressing.nvim',

    -- fuzzy finder
    'junegunn/fzf',
    'junegunn/fzf.vim',

    -- file explorer
    'stevearc/oil.nvim',

    -- terminal
    'akinsho/toggleterm.nvim',

    -- markdown preview
    'previm/previm',
    'tyru/open-browser.vim',

    -- utilities
    'tpope/vim-sleuth',
    'tpope/vim-fugitive',
    'easymotion/vim-easymotion',
    'kylechui/nvim-surround',
    'windwp/nvim-autopairs',
    'bullets-vim/bullets.vim',
    'Almo7aya/openingh.nvim',
    'brenoprata10/nvim-highlight-colors',

    -- lsp
    'neovim/nvim-lspconfig',

    -- completion
    { 'saghen/blink.cmp', version = '1.*' },
    'milanglacier/minuet-ai.nvim',

    -- snippets
    {
      "L3MON4D3/LuaSnip",
      version = "v2.*",
      dependencies = { "rafamadriz/friendly-snippets" },
    },

    -- required by minuet-ai
    'nvim-lua/plenary.nvim',
  })
end

local setup_toggleterm = function()
  require("toggleterm").setup({
    auto_scroll = false,
    size = function(term)
      if term.direction == "horizontal" then
        return vim.o.lines * 0.4
      elseif term.direction == "vertical" then
        return vim.o.columns * 0.4
      end
    end,
  })
end

local setup_lsp = function()
  local local_config = require_safe('local_config')

  vim.lsp.config('*', {
    capabilities = require('blink.cmp').get_lsp_capabilities()
  })

  local efm_default_settings = require('efm_config').default_settings
  local efm_settings = vim.tbl_deep_extend(
    'force',
    efm_default_settings,
    local_config.efm_settings or {}
  )

  local servers = {
    { name = 'lua_ls',      bin = 'lua-language-server' },
    { name = 'ts_ls',       bin = 'tsserver' },
    { name = 'gopls',       bin = 'gopls' },
    { name = 'terraformls', bin = 'terraform-ls' },
    {
      name = 'lemminx',
      bin = 'lemminx',
      config = {
        settings = local_config.lemminx_settings or {
          -- Example:
          -- settings = {
          --   xml = {
          --     catalogs = { vim.fn.expand('~/catalog.xml') }
          --   }
          -- }
        }
      }
    },
    {
      name = 'efm',
      bin = 'efm-langserver',
      config = {
        init_options = { documentFormatting = true },
        filetypes = vim.tbl_keys(efm_settings.languages),
        settings = efm_settings,
      }
    }
  }

  for _, server in ipairs(servers) do
    if vim.fn.executable(server.bin) then
      if server.config then
        vim.lsp.config(server.name, server.config)
      end
      vim.lsp.enable(server.name)
    end
  end

  -- formatter
  local lsp_format_clients = vim.iter({
    local_config.lsp_format_clients or {},
    -- default clients
    {
      { file = '%.lua$',  client = 'lua_ls' },
      { file = '%.xml$',  client = 'lemminx' },
      { file = '%.js$',   client = 'efm' },
      { file = '%.ts$',   client = 'efm' },
      { file = '%.jsx$',  client = 'efm' },
      { file = '%.tsx$',  client = 'efm' },
      { file = '%.go$',   client = 'efm' },
      { file = '%.tf$',   client = 'efm' },
      { file = '%.json$', client = 'efm' },
    },
  }):flatten():totable()

  -- format on save
  vim.api.nvim_create_autocmd('LspAttach', {
    group = vim.api.nvim_create_augroup('UserLspFormatOnSave', {}),
    callback = function()
      vim.api.nvim_create_autocmd({ 'BufWritePre' }, {
        group = vim.api.nvim_create_augroup('UserLspFormattingOnSave', {}),
        pattern = { '*' },
        callback = function(ev)
          -- print(vim.inspect(ev))
          vim.lsp.buf.format({
            async = false,
            timeout_ms = 3000,
            filter = function(client)
              for _, v in ipairs(lsp_format_clients) do
                if string.match(ev.file, v.file) then
                  return client.name == v.client
                end
              end
              return client.server_capabilities.documentFormattingProvider
            end
          })
        end,
      })
    end,
  })
end

local setup_blink_cmp = function()
  require('blink.cmp').setup({
    keymap = {
      preset = 'default',
      ['<CR>'] = { 'accept', 'fallback' },
    },
    completion = {
      list = {
        selection = { preselect = false, auto_insert = true },
      },
      documentation = {
        auto_show = true,
        auto_show_delay_ms = 200,
      },
    },
    snippets = { preset = 'luasnip' },
    cmdline = {
      keymap = {
        preset = 'none',
        ['<Tab>'] = { 'show_and_insert', 'select_next' },
        ['<C-n>'] = { 'select_next', 'fallback' },
        ['<C-p>'] = { 'select_prev', 'fallback' },
        ['<C-e>'] = { 'cancel' },
      },
      completion = {
        menu = { auto_show = true },
        list = {
          selection = { preselect = false, auto_insert = true },
        },
      },
    },
  })
end

local setup_oil = function()
  require("oil").setup({
    view_options = {
      show_hidden = true,
    },
    keymaps = {
      ["<C-l>"] = false,
    },
    lsp_file_methods = {
      enabled = true,
      timeout_ms = 10000,
      -- If set to true or unmodified, it will cause old files to reappear in cases where file movement and import path editing occur.
      autosave_changes = false,
    },
  })
end

local setup_treesitter = function()
  require('nvim-treesitter.configs').setup({
    ensure_installed = {
      'vim', 'vimdoc',
      'javascript', 'jsdoc',
      'typescript', 'tsx',
      'mermaid',
      'fish',
      'graphql',
      -- Disabled due to instability
      -- 'terraform',
    },
    highlight = { enable = true },
  })
end

local setup_minuet = function()
  require('minuet').setup({
    cmp = {
      enable_auto_complete = false,
    },
    blink = {
      enable_auto_complete = false,
    },

    virtualtext = {
      auto_trigger_ft = {},
      keymap = {},
      -- show_on_completion_menu = true,
    },

    provider = 'gemini',

    provider_options = {
      openai = {
        model = 'gpt-4.1-mini',
        optional = {
          max_tokens = 256,
        },
        api_key = 'MINUET_OPENAI_API_KEY',
      },

      gemini = {
        model = 'gemini-2.0-flash',
        optional = {
          generationConfig = {
            maxOutputTokens = 256,
            -- for thinking model
            -- thinkingConfig = {
            --   thinkingBudget = 0,
            -- },
          },
          safetySettings = {
            {
              category = 'HARM_CATEGORY_DANGEROUS_CONTENT',
              threshold = 'BLOCK_ONLY_HIGH',
            },
          },
        },
        api_key = 'MINUET_GEMINI_API_KEY',
      },

      claude = {
        model = 'claude-3-5-haiku-latest',
        api_key = 'MINUET_ANTHROPIC_API_KEY'
      },
    },
  })
end

local setup_others = function()
  vim.g.fzf_preview_window = { 'hidden,right,50%', 'ctrl-/' }
  require('nvim-autopairs').setup()
  require("nvim-surround").setup()
  require('dressing').setup()
  require("luasnip.loaders.from_lua").load({ paths = vim.fn.stdpath('config') .. '/snippets' })
end

setup_options()
setup_utilities()

setup_plugins()
setup_toggleterm()
setup_lsp()
setup_blink_cmp()
setup_oil()
setup_treesitter()
setup_minuet()
setup_others()

setup_appearance()
setup_keymap()
setup_commands()
setup_auto_commands()
