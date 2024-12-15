--[[
start                vim -u NONE (does not load init.lua)
open file            :e **/foo.sh
                     :e %:h/ (open directory of current file)
                     :sp foo.sh (split)
                     :vsp foo.sh (vsplit)
motions              } (next paragraph)
                     { (previous paragraph)
                     C-f (next page)
                     C-b (previous page)
scroll               zz (center)
                     zt (top)
                     zb (bottom)
search               /foo -> n (next) -> N (previous)
                     * (next <cword>)
                     % (previous <cword>)
command              :foo
                     :execute "normal! ..." (execute normal mode command)
                       - `execute` will handle special characters like `<CR>`
                       - `normal!` ignores mappings
                     :foo <C-r>" (paste from register)
replace              :%s/foo/bar/g
                     :%s/<C-r>/bar/g (replace last search)
marks                :marks
                     ma (set mark a)
                     `a (jump to mark a)
                     `` (jump to previous mark)
                     :delmarks a (delete mark a)
                     :delmarks! a (delete all marks)
jumps                :jumps -> [N] Ctrl-o (older location) or Ctrl-i (newer location)
recent files         :browse oldfiles
                     :browse filter /foo.*/ oldfiles
grep                 :grep! foo -> :cw
                     :grep! foo % (current buffer)
                     :grep! <cword> (cursor word)
                     :grep! \b<cword>\b
close buffers        :bd foo* -> Ctrl-a (close all matched)
                     :%bd (close all) -> C-o (back to previous buffer)
window               C-w C-w (next window)
                     C-w -> o (close other windows)
                     C-w -> = (equalize window size)
                     C-w -> _ (maximize height)
                     C-w -> | (maximize width)
                     C-w -> c (close)
netrw                :e .
                     :e . -> i -> i -> i (tree view)
                     :e . -> p (preview)
                     :e . -> d (make directory)
                     :e . -> % (new file)
                     :e . -> D (delete)
                     :e . -> R (rename)
                     :e . -> mt (mark target) -> mf (markfile) -> mm (move)
                     :e . -> mt (mark target) -> mf (markfile) -> mc (copy)
                     :e . -> mu (unmark all)
quickfix             :cw(indow) (open quickfix window)
                     :colder (older quickfix list)
                     :cnewer (newer quickfix list)
                     :cdo %s/foo/bar/g (replace in quickfix list)
open path            gf (goto file)
                     gx (xdg-open)
                     C-w gf (open in new tab)
folding              zc (close), zo (open), zO (open all)
spell                ]s (next), [s (previous)
                     z= (suggestions)
                     zg (add word to spellfile)
                     zw (remove word from spellfile)
--]]

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
    vim.opt.grepprg = 'rg --vimgrep --hidden --glob "!.git" --glob "!node_modules"'
  end
  vim.opt.maxmempattern = 10000
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
  -- vim.keymap.set('v', '//', [[y/\V<C-r>=escape(@",'/\')<CR><CR>]]) -- -> use * or # instead
  vim.keymap.set('n', 's', ':<C-u>HopChar2<CR>')
  -- vim.keymap.set('n', '-', ':<C-u>e %:h <bar> /<C-r>=expand("%:t")<CR><CR>:nohlsearch<CR>:file<CR>')
  -- vim.keymap.set('n', '-', ':<C-u>e %:h<CR>')
  vim.keymap.set('n', '-', '<Cmd>Oil<CR>')

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

  -- dap
  vim.keymap.set('n', '<leader>db', ':<C-u>DapToggleBreakpoint<CR>')
  vim.keymap.set({ 'n', 'v' }, '<leader>de', '<Cmd>lua require("dapui").eval()<CR>')

  -- luasnip
  local ls = require('luasnip')
  vim.keymap.set({ "i", "s" }, "<C-f>", function() ls.jump(1) end, { silent = true })
  vim.keymap.set({ "i", "s" }, "<C-b>", function() ls.jump(-1) end, { silent = true })
end

local setup_commands = function()
  local window_utils = require('window_utils')
  local commands = {
    { 'Buffers',              'call Buffers()',                                         {} },
    { 'Oldfiles',             function() vim.fn['Oldfiles']({ only_cwd = true }) end,   {} },
    { 'OldfilesGlobal',       function() vim.fn['Oldfiles']() end,                      {} },
    { 'ToggleDebugger',       function() window_utils.toggle_debugger() end,            {} },
    { 'ClearBreakpoints',     function() require('dap').clear_breakpoints() end,        {} },
    { 'Debug',                function() require('dap').continue() end,                 {} },
    { 'Outline',              'call Outline()',                                         {} },
    { 'CloseTerms',           function() window_utils.close_terms() end,                {} },
    { 'ToggleHighlightColor', function() require("nvim-highlight-colors").toggle() end, {} },
    { 'Diagnostics',          function() vim.diagnostic.setloclist() end,               {} },
    { 'CopyRelativePath',     function() vim.fn.setreg('+', vim.fn.expand('%')) end,    {} },
    { 'CopyAbsolutePath',     function() vim.fn.setreg('+', vim.fn.expand('%:p')) end,  {} }
  }

  for _, command in ipairs(commands) do
    vim.api.nvim_create_user_command(table.unpack(command))
  end

  vim.api.nvim_create_autocmd('LspAttach', {
    group = vim.api.nvim_create_augroup('UserLspCommandConfig', {}),
    callback = function()
      local lsp_commands = {
        { 'LspRename',         function() vim.lsp.buf.rename() end,                  {} },
        { 'LspFormat',         function() vim.lsp.buf.format({ async = false }) end, {} },
        { 'LspTypeDefinition', function() vim.lsp.buf.type_definition() end,         {} },
        { 'LspDeclaration',    function() vim.lsp.buf.declaration() end,             {} },
        { 'LspImplementation', function() vim.lsp.buf.implementation() end,          {} },
        { 'LspIncomingCall',   function() vim.lsp.buf.incoming_calls() end,          {} },
        { 'LspOutgoingCall',   function() vim.lsp.buf.outgoing_calls() end,          {} },
      }
      for _, command in ipairs(lsp_commands) do
        vim.api.nvim_create_user_command(table.unpack(command))
      end
    end,
  })

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

    if filetype == 'terraform' then
      local url = 'https://registry.terraform.io/search/providers?q=' .. cursor_word
      vim.fn.system({ 'open', url })
    else
      local url = 'https://www.google.com/search?q=' .. cursor_word
      vim.fn.system({ 'open', url })
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
    vim.fn.system({ 'open', url })
  end, { range = true, nargs = '*' })
end

local setup_auto_commands = function()
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
        vim.opt.foldmethod = 'expr'
        vim.opt.foldexpr = 'nvim_treesitter#foldexpr()'
      else
        vim.opt.foldmethod = "indent"
      end
    end,
  })

  -- indent
  vim.api.nvim_create_autocmd({ 'FileType' }, {
    pattern = 'go',
    group = vim.api.nvim_create_augroup('UserIndentConfig', {}),
    command = 'setlocal tabstop=4 noexpandtab softtabstop=4 shiftwidth=4'
  })
  vim.api.nvim_create_autocmd({ 'FileType' }, {
    pattern = 'xml',
    group = vim.api.nvim_create_augroup('UserIndentConfig', {}),
    command = 'setlocal tabstop=4'
  })

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
    -- ui
    'sainnhe/everforest',
    'stevearc/dressing.nvim',

    -- utilities
    'junegunn/fzf',
    'junegunn/fzf.vim',
    'tpope/vim-sleuth',
    'tpope/vim-fugitive',
    'stevearc/oil.nvim',
    'akinsho/toggleterm.nvim',
    'windwp/nvim-autopairs',
    'brenoprata10/nvim-highlight-colors',
    'kylechui/nvim-surround',
    {
      'phaazon/hop.nvim',
      branch = 'v2'
    },
    {
      'numToStr/Comment.nvim',
      lazy = false
    },
    'nvim-treesitter/nvim-treesitter',
    'JoosepAlviste/nvim-ts-context-commentstring',
    'Almo7aya/openingh.nvim',
    'previm/previm',
    'tyru/open-browser.vim',
    'bullets-vim/bullets.vim',
    'MattesGroeger/vim-bookmarks',

    -- lsp
    'neovim/nvim-lspconfig',

    -- debugger
    'mfussenegger/nvim-dap',
    {
      'rcarriga/nvim-dap-ui',
      dependencies = { "mfussenegger/nvim-dap", "nvim-neotest/nvim-nio" },
    },

    -- completion
    'hrsh7th/cmp-buffer',
    'hrsh7th/cmp-nvim-lsp',
    'hrsh7th/cmp-path',
    'hrsh7th/cmp-cmdline',
    'hrsh7th/nvim-cmp',
    'github/copilot.vim',
    {
      'CopilotC-Nvim/CopilotChat.nvim',
      build = 'make tiktoken',
    },

    -- snippets
    {
      "L3MON4D3/LuaSnip",
      version = "v2.*",
      dependencies = { "rafamadriz/friendly-snippets" },
    },
    'saadparwaiz1/cmp_luasnip',

    -- languages
    {
      "pmizio/typescript-tools.nvim",
      dependencies = { "nvim-lua/plenary.nvim", "neovim/nvim-lspconfig" },
      opts = {},
    },
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

  -- https://github.com/neovim/nvim-lspconfig/blob/master/doc/configs.md
  local lspconfig = require('lspconfig')
  local capabilities = require('cmp_nvim_lsp').default_capabilities()

  if vim.fn.executable('lua-language-server') then
    lspconfig.lua_ls.setup({
      capabilities = capabilities,
    })
  end

  -- brew install terraform-ls
  if vim.fn.executable('terraform-ls') then
    lspconfig.terraformls.setup({
      capabilities = capabilities,
    })
  end

  -- npm i -g vscode-langservers-extracted
  if vim.fn.executable('vscode-eslint-language-server') then
    lspconfig.eslint.setup({
      capabilities = capabilities,
    })
  end

  -- https://github.com/redhat-developer/vscode-xml/releases
  -- xattr -d com.apple.quarantine lemminx
  if vim.fn.executable('lemminx') then
    lspconfig.lemminx.setup({
      capabilities = capabilities,
      settings = local_config.lemminx_settings or {
        -- Example:
        -- settings = {
        --   xml = {
        --     catalogs = { vim.fn.expand('~/catalog.xml') }
        --   }
        -- }
      }
    })
  end

  local efm_default_settings = require('efm_config').default_settings
  local efm_settings = vim.tbl_deep_extend(
    'force',
    efm_default_settings,
    local_config.efm_settings or {}
  )
  lspconfig.efm.setup({
    capabilities = capabilities,
    init_options = { documentFormatting = true },
    filetypes = vim.tbl_keys(efm_settings.languages),
    settings = efm_settings,
  })

  -- npm install -g typescript typescript-language-server
  require("typescript-tools").setup(
    vim.tbl_deep_extend("force",
      { capabilities = capabilities },
      local_config.typescript_tools or {
        -- Example:
        -- settings = {
        --   tsserver_file_preferences = {
        --     -- https://stackoverflow.com/questions/62503006/vscode-add-js-extension-on-import-autocomplete
        --     importModuleSpecifierEnding = "js",
        --   }
        -- }
      }
    )
  )

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

local setup_cmp = function()
  -- https://github.com/hrsh7th/nvim-cmp
  local cmp = require('cmp')

  -- https://github.com/L3MON4D3/LuaSnip?tab=readme-ov-file#add-snippets
  local luasnip = require('luasnip')
  require("luasnip.loaders.from_vscode").lazy_load()

  cmp.setup({
    snippet = {
      expand = function(args)
        luasnip.lsp_expand(args.body)
      end,
    },

    mapping = cmp.mapping.preset.insert({
      ['<C-p>'] = cmp.mapping.select_prev_item(),
      ['<C-n>'] = cmp.mapping.select_next_item(),
      ['<CR>'] = cmp.mapping.confirm({ select = false })
    }),

    sources = cmp.config.sources({
      { name = 'nvim_lsp' },
      { name = 'luasnip' },
    }, {
      { name = 'buffer' },
    }),

    window = {
      completion = cmp.config.window.bordered(),
      documentation = cmp.config.window.bordered(),
    },
  })

  cmp.setup.cmdline({ '/', '?' }, {
    mapping = cmp.mapping.preset.cmdline(),
    sources = {
      { name = 'buffer' }
    }
  })

  cmp.setup.cmdline(':', {
    mapping = cmp.mapping.preset.cmdline(),
    sources = cmp.config.sources({
      { name = 'path' }
    }, {
      { name = 'cmdline' }
    })
  })
end

local setup_dap = function()
  local local_config = require_safe('local_config')
  local dap = require('dap')

  -- https://github.com/mfussenegger/nvim-dap/wiki/Debug-Adapter-installation
  require("dap").adapters["pwa-node"] = {
    type = "server",
    host = "localhost",
    port = "${port}",
    executable = {
      command = "node",
      -- https://github.com/microsoft/vscode-js-debug/releases
      args = { os.getenv('HOME') .. "/tools/js-debug/src/dapDebugServer.js", "${port}" },
    }
  }
  dap.configurations = local_config.dap_configurations or {
    typescript = {
      {
        name = 'Test (Jest)',
        type = 'pwa-node',
        request = 'launch',
        console = "integratedTerminal",
        cwd = '${workspaceFolder}',
        program = '${workspaceFolder}/node_modules/.bin/jest',
        args = { '--runInBand', '${file}' },
      }
    },
    javascript = {
      {
        name = 'Test (Node.js)',
        type = 'pwa-node',
        request = 'launch',
        console = "integratedTerminal",
        cwd = '${workspaceFolder}',
        -- program = 'node',
        args = { '--test', '${file}' },
      }
    }
  }

  local window_utils = require('window_utils')
  require('dapui').setup()
  dap.listeners.after.event_initialized["dapui_config"] = function()
    window_utils.open_debugger()
  end
  dap.listeners.before.event_exited["dapui_config"] = function()
    window_utils.close_debugger()
  end
end

local setup_oil = function()
  require("oil").setup({
    view_options = {
      show_hidden = true,
    },
    keymaps = {
      ["<C-l>"] = false,
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
      'terraform',
      'graphql'
    },
    highlight = { enable = true },
  })
end

local setup_comment = function()
  -- https://github.com/JoosepAlviste/nvim-ts-context-commentstring/wiki/Integrations
  require('ts_context_commentstring').setup {
    enable_autocmd = false,
  }
  require('Comment').setup({
    pre_hook = require('ts_context_commentstring.integrations.comment_nvim').create_pre_hook(),
  })
end

local setup_others = function()
  vim.g.fzf_preview_window = { 'hidden,right,50%', 'ctrl-/' }
  vim.g.copilot_filetypes = {
    gitcommit = true,
  }
  require('hop').setup()
  require('nvim-autopairs').setup()
  require("nvim-surround").setup()
  require('dressing').setup()
  require("CopilotChat").setup({
    debug = false,
    mappings = {
      complete = {
        insert = '<Tab>',
      },
    },
  })
end

setup_options()
setup_utilities()

setup_plugins()
setup_toggleterm()
setup_lsp()
setup_cmp()
setup_dap()
setup_oil()
setup_treesitter()
setup_comment()
setup_others()

setup_appearance()
setup_keymap()
setup_commands()
setup_auto_commands()
