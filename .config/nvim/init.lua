local set_options = function()
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

  vim.g.markdown_fenced_languages = { 'sh' }
  vim.g.netrw_banner = 0
  vim.g.newrw_hide = 0
  vim.g.netrw_liststyle = 3
end

local load_utilities = function()
  local config_path = vim.fn.stdpath('config')
  vim.cmd('source ' .. config_path .. '/vim/oldfiles.vim')
  vim.cmd('source ' .. config_path .. '/vim/buffers.vim')
  vim.cmd('source ' .. config_path .. '/vim/outline.vim')
  vim.cmd('source ' .. config_path .. '/vim/tabline.vim')
end

local setup_appearance = function()
  vim.g.everforest_background = 'soft'
  vim.opt.background = 'dark'
  vim.cmd.colorscheme('everforest')

  -- statusline
  vim.opt.laststatus = 0
  vim.cmd [[
  hi! link StatusLine WinSeparator
  hi! link StatusLineNC WinSeparator
  ]]
  vim.opt.statusline = [[%{repeat('─', winwidth('.'))}]]

  -- tabline
  vim.opt.tabline = '%!TabLine()'

  -- spell
  vim.cmd.highlight({ 'SpelunkerSpellBad', 'cterm=underline', 'gui=underline' })
  vim.cmd.highlight({ 'SpelunkerComplexOrCompoundWord', 'cterm=underline', 'gui=underline' })

  -- https://github.com/neovim/nvim-lspconfig/wiki/UI-Customization
  vim.diagnostic.config({
    virtual_text = false,
    signs = true,
    underline = false,
    update_in_insert = false,
    severity_sort = true,
  })
end

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

local setup_keymap = function()
  vim.g.mapleader = ' '
  -- utilities
  vim.keymap.set('n', '<leader>r', 'q:?')
  vim.keymap.set('n', '<leader>f', ':<C-u>CtrlPMixed<CR>')
  vim.keymap.set('n', '<leader>o', ':<C-u>Oldfiles<CR>')
  vim.keymap.set('n', '<leader>b', ':<C-u>Buffers<CR>')
  vim.keymap.set('n', '<leader>w', ':<C-u>set wrap!<CR>')
  vim.keymap.set('n', '<leader>n', ':<C-u>set number!<CR>')
  vim.keymap.set('n', '<leader>s', ':<C-u>gr!<Space>')
  vim.keymap.set('n', '<leader>x', [[:<C-u><C-r>=v:count1<CR>TermExec cmd=''<Left>]])
  vim.keymap.set('n', '<leader>z', ':<C-u>setl foldlevel=')
  vim.keymap.set('n', '<leader>c', function()
    require("nvim-highlight-colors").toggle()
  end)
  vim.keymap.set('v', '//', [[y/\V<C-r>=escape(@",'/\')<CR><CR>]])
  vim.keymap.set('n', 's', ':<C-u>HopChar2<CR>')
  -- vim.keymap.set('n', '-', ':<C-u>e %:h<CR>')
  vim.keymap.set('n', '-', ':<C-u>e %:h <bar> /<C-r>=expand("%:t")<CR><CR>')

  -- window
  vim.keymap.set('n', '<C-w>z', toggle_maximize)
  vim.keymap.set('n', '<C-w>t', ':<C-u><C-r>=v:count<CR>ToggleTerm<CR>')
  for i = 1, 5, 1 do
    vim.keymap.set(
      'n',
      '<C-w>' .. i,
      ':<C-u>CloseTerms<CR>' .. ':' .. i .. 'ToggleTerm<CR>')
  end
  vim.keymap.set('n', '<C-w>d', toggle_debugger)

  -- terminal
  vim.api.nvim_create_autocmd({ 'TermOpen' }, {
    group = vim.api.nvim_create_augroup('UserTerminalKeymapConfig', {}),
    pattern = '*',
    callback = function()
      local opts = { buffer = 0 }
      vim.keymap.set('t', '<esc>', [[<C-\><C-n>]], opts)
      vim.keymap.set('t', '<C-g>', [[<Cmd>file<CR>]], opts)
      vim.keymap.set('t', '<C-w>h', [[<Cmd>wincmd h<CR>]], opts)
      vim.keymap.set('t', '<C-w>j', [[<Cmd>wincmd j<CR>]], opts)
      vim.keymap.set('t', '<C-w>k', [[<Cmd>wincmd k<CR>]], opts)
      vim.keymap.set('t', '<C-w>l', [[<Cmd>wincmd l<CR>]], opts)
      vim.keymap.set('t', '<C-w>c', [[<Cmd>wincmd c<CR>]], opts)
      vim.keymap.set('t', '<C-w><C-w>', [[<Cmd>wincmd w<CR>]], opts)
      vim.keymap.set('t', '<C-w>t', '<Cmd>ToggleTerm<CR>', {})
      vim.keymap.set('t', '<C-w>z', toggle_maximize)
      for i = 1, 5, 1 do
        vim.keymap.set(
          't',
          '<C-w>' .. i,
          [[<Cmd>CloseTerms<CR>]] .. '<Cmd>' .. i .. 'ToggleTerm<CR>')
      end
    end,
  })

  -- lsp
  -- https://github.com/neovim/nvim-lspconfig
  vim.keymap.set('n', '<leader>q', vim.diagnostic.setloclist)
  vim.keymap.set('n', '[d', vim.diagnostic.goto_prev)
  vim.keymap.set('n', ']d', vim.diagnostic.goto_next)

  vim.api.nvim_create_autocmd('LspAttach', {
    group = vim.api.nvim_create_augroup('UserLspKeymapConfig', {}),
    callback = function(ev)
      local opts = { buffer = ev.buf }
      vim.keymap.set({ 'n', 'v' }, '<leader>a', vim.lsp.buf.code_action, opts)
      vim.keymap.set('n', 'gD', vim.lsp.buf.declaration, opts)
      vim.keymap.set('n', 'gd', vim.lsp.buf.definition, opts)
      vim.keymap.set('n', 'gr', vim.lsp.buf.references, opts)
      vim.keymap.set('n', 'gi', vim.lsp.buf.implementation, opts)
      vim.keymap.set('n', 'K', vim.lsp.buf.hover, opts)
      vim.keymap.set({ 'n', 'i' }, '<C-k>', vim.lsp.buf.signature_help, opts)
    end,
  })

  -- git
  vim.keymap.set('n', '<leader>gs', ':<C-u>Git status<CR>')
  vim.keymap.set('n', '<leader>gf', ':<C-u>Git fetch --prune<CR>')
  vim.keymap.set('n', '<leader>gc', ':<C-u>Git checkout<Space>')
  vim.keymap.set('n', '<leader>gp', ':<C-u>Git pull origin <C-r>=FugitiveHead()<CR><CR>')
  vim.keymap.set('n', '<leader>gP',
    [[:5TermExec open=0 cmd='with_notify git push origin <C-r>=FugitiveHead()<CR>'<Left>]])
  vim.keymap.set('n', '<leader>gb', ':<C-u>Git blame<CR>')

  -- dap
  vim.keymap.set('n', '<leader>db', ':<C-u>DapToggleBreakpoint<CR>')
  vim.keymap.set('n', '<leader>dc', ':<C-u>DapContinue<CR>')
  vim.keymap.set({ 'n', 'v' }, '<leader>de', '<Cmd>lua require("dapui").eval()<CR>')

  -- ctrlp
  vim.g.ctrlp_map = '<Nop>'
  vim.g.ctrlp_prompt_mappings = {
    ['PrtSelectMove("j")'] = { '<down>', '<c-n>' },
    ['PrtSelectMove("k")'] = { '<up>', '<c-p>' },
    ['PrtHistory(-1)'] = { '<c-j>' },
    ['PrtHistory(1)'] = { '<c-k>' },
  }

  -- vsnip
  -- https://github.com/hrsh7th/vim-vsnip
  vim.cmd [[
  inoremap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  snoremap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  inoremap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'
  snoremap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'
  ]]
end

local setup_commands = function()
  vim.api.nvim_create_user_command('ReloadVimrc', 'source $MYVIMRC', {})
  vim.api.nvim_create_user_command('BDelete', 'b # | bd #', {})
  vim.api.nvim_create_user_command('BOnly', '%bd | e # | bd #', {})
  vim.api.nvim_create_user_command('Buffers', 'call Buffers()', {})
  vim.api.nvim_create_user_command('Outline', 'call Outline()', {})
  vim.api.nvim_create_user_command('Oldfiles', function()
    vim.fn['Oldfiles']({ only_cwd = true })
  end, {})
  vim.api.nvim_create_user_command('OldfilesGlobal', function()
    vim.fn['Oldfiles']()
  end, {})
  vim.api.nvim_create_user_command('ToggleSpell', 'call spelunker#toggle()', {})

  vim.api.nvim_create_user_command('CloseTerms', function()
    for i = vim.fn.winnr('$'), 1, -1 do
      local buf_name = vim.fn.bufname(vim.fn.winbufnr(i))
      if vim.startswith(buf_name, 'term://') then
        vim.cmd(i .. 'wincmd c')
      end
    end
  end, {})

  vim.api.nvim_create_user_command('ToggleDebugger', toggle_debugger, {})
  vim.api.nvim_create_user_command('ClearBreakpoints', function()
    require('dap').clear_breakpoints()
  end, {})

  vim.api.nvim_create_autocmd('LspAttach', {
    group = vim.api.nvim_create_augroup('UserLspCommandConfig', {}),
    callback = function()
      vim.api.nvim_create_user_command('LspRename', function()
        vim.lsp.buf.rename()
      end, {})
      vim.api.nvim_create_user_command('LspFormat', function()
        vim.lsp.buf.format({ async = false })
      end, {})
      vim.api.nvim_create_user_command('LspTypeDefinition', function()
        vim.lsp.buf.type_definition()
      end, {})
    end,
  })
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

  -- indent
  vim.api.nvim_create_autocmd({ 'FileType' }, {
    pattern = 'go',
    group = vim.api.nvim_create_augroup('UserIndentConfig', {}),
    command = 'setlocal tabstop=4 noexpandtab softtabstop=4 shiftwidth=4'
  })

  -- fix syntax highlighting
  -- https://vim.fandom.com/wiki/Fix_syntax_highlighting
  vim.api.nvim_create_autocmd({ 'BufEnter', 'InsertLeave' }, {
    group = vim.api.nvim_create_augroup('UserFixSyntaxHighlighting', {}),
    pattern = { '*' },
    command = 'syntax sync fromstart'
  })

  -- setup dirbuf
  vim.api.nvim_create_autocmd({ 'FileType' }, {
    group = vim.api.nvim_create_augroup('UserSetupDirBuf', {}),
    pattern = { 'dirbuf' },
    callback = function()
      -- disable color highlight
      require("nvim-highlight-colors").turnOff()
      -- show path
      vim.cmd.file()
    end,
  })
end

local ensure_plugins = function()
  -- https://github.com/wbthomason/packer.nvim#bootstrapping
  local ensure_packer = function()
    local fn = vim.fn
    local install_path = fn.stdpath('data') .. '/site/pack/packer/start/packer.nvim'
    if fn.empty(fn.glob(install_path)) > 0 then
      fn.system({ 'git', 'clone', '--depth', '1', 'https://github.com/wbthomason/packer.nvim', install_path })
      vim.cmd [[packadd packer.nvim]]
      return true
    end
    return false
  end

  local packer_bootstrap = ensure_packer()

  require('packer').startup(function(use)
    use 'wbthomason/packer.nvim'

    -- ui
    use 'sainnhe/everforest'

    -- utilities
    use 'ctrlpvim/ctrlp.vim'
    use 'tpope/vim-sleuth'
    use 'tpope/vim-commentary'
    use 'tpope/vim-fugitive'
    use 'elihunter173/dirbuf.nvim'
    use 'akinsho/toggleterm.nvim'
    use 'windwp/nvim-autopairs'
    use 'kamykn/spelunker.vim'
    use 'brenoprata10/nvim-highlight-colors'
    use 'kylechui/nvim-surround'
    use 'stevearc/dressing.nvim'
    use { 'phaazon/hop.nvim', branch = 'v2' }

    -- lsp
    use 'neovim/nvim-lspconfig'

    -- debugger
    use 'mfussenegger/nvim-dap'
    use 'rcarriga/nvim-dap-ui'

    -- snippets
    use 'hrsh7th/vim-vsnip'
    use 'rafamadriz/friendly-snippets'

    -- completion
    use 'hrsh7th/cmp-buffer'
    use 'hrsh7th/cmp-vsnip'
    use 'hrsh7th/cmp-nvim-lsp'
    use 'hrsh7th/cmp-path'
    use 'hrsh7th/cmp-cmdline'
    use 'hrsh7th/nvim-cmp'
    use 'github/copilot.vim'

    -- languages
    use 'pangloss/vim-javascript'
    use 'jose-elias-alvarez/typescript.nvim'
    use 'jparise/vim-graphql'
    use 'hashivim/vim-terraform'
    use 'dag/vim-fish'
    use 'digitaltoad/vim-pug'

    if packer_bootstrap then
      require('packer').sync()
    end
  end)
end

local setup_toggleterm = function()
  require("toggleterm").setup({
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
            filter = function(client)
              -- print(client.name)
              if string.match(ev.file, '%.lua$') then
                return client.name == 'lua_ls'
              end
              return client.name == 'efm'
            end
          })
        end,
      })
    end,
  })

  -- https://github.com/neovim/nvim-lspconfig/blob/master/doc/server_configurations.md
  local lspconfig = require('lspconfig')
  local capabilities = require('cmp_nvim_lsp').default_capabilities()

  local efm_tools = require('efm_tools')

  lspconfig.lua_ls.setup({
    capabilities = capabilities,
  })

  -- npm i -g typescript-language-server
  lspconfig.tsserver.setup({
    capabilities = capabilities,
  })

  local efm_languages = {
    sh = {
      efm_tools.linters.shellcheck,
    },
    javascript = {
      efm_tools.linters.eslint,
      efm_tools.formatters.prettier,
    },
    typescript = {
      efm_tools.linters.eslint,
      efm_tools.formatters.prettier,
    },
    typescriptreact = {
      efm_tools.linters.eslint,
      efm_tools.formatters.prettier,
    },
    go = {
      efm_tools.formatters.gofmt,
    },
    terraform = {
      efm_tools.formatters.terraform_fmt,
    },
    json = {
      efm_tools.formatters.prettier,
    },
  }

  lspconfig.efm.setup({
    capabilities = capabilities,
    init_options = { documentFormatting = true },
    filetypes = vim.tbl_keys(efm_languages),
    settings = {
      rootMarkers = { ".git/" },
      languages = efm_languages,
    }
  })
end

local setup_cmp = function()
  -- https://github.com/hrsh7th/nvim-cmp
  local cmp = require('cmp')
  cmp.setup({
    snippet = {
      expand = function(args)
        vim.fn["vsnip#anonymous"](args.body)
      end,
    },
    mapping = cmp.mapping.preset.insert({
      ['<C-p>'] = cmp.mapping.select_prev_item(),
      ['<C-n>'] = cmp.mapping.select_next_item(),
      ['<C-e>'] = cmp.mapping.abort(),
      ['<CR>'] = cmp.mapping.confirm({ select = false }),
    }),
    sources = cmp.config.sources({
      { name = 'nvim_lsp' },
      { name = 'vsnip' },
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

local setup_dap = function(local_config)
  local dap = require('dap')

  -- https://github.com/mfussenegger/nvim-dap/wiki/Debug-Adapter-installation
  dap.adapters.node2 = {
    type = 'executable',
    command = 'node',
    args = { os.getenv('HOME') .. '/tools/vscode-node-debug2/out/src/nodeDebug.js' },
  }

  dap.configurations = local_config.dap_configurations or {
    typescript = {
      {
        name = 'Test (Jest)',
        type = 'node2',
        request = 'launch',
        cwd = '${workspaceFolder}',
        program = '${workspaceFolder}/node_modules/.bin/jest',
        args = { '--runInBand', '${file}' },
      }
    },
    javascript = {
      {
        name = 'Test (Node.js)',
        type = 'node2',
        request = 'launch',
        cwd = '${workspaceFolder}',
        -- program = 'node',
        args = { '--test', '${file}' },
      }
    }
  }

  require('dapui').setup()
  dap.listeners.after.event_initialized["dapui_config"] = function()
    open_debugger()
  end
  dap.listeners.before.event_exited["dapui_config"] = function()
    close_debugger()
  end
end

local setup_ctrlp = function()
  vim.g.ctrlp_user_command = 'fd --hidden --exclude .git --type f --color=never "" %s'
  vim.g.ctrlp_root_markers = { '.git', 'package.json' }
  vim.g.ctrlp_match_window = 'bottom,order:btt,min:1,max:20,results:20'
  vim.g.ctrlp_by_filename = 1
  vim.g.ctrlp_use_caching = 0
  vim.g.ctrlp_mruf_relative = 1
  vim.g.ctrlp_mruf_exclude = [[COMMIT_EDITMSG]]
end

local setup_plugins = function()
  vim.g.javascript_plugin_jsdoc = 1
  require('hop').setup()
  require('nvim-autopairs').setup()
  require("nvim-surround").setup()
  require('nvim-highlight-colors').setup()
  require('dressing').setup()
  require('typescript').setup({})
end

-- Setup
set_options()
load_utilities()
ensure_plugins()

local local_config = require('local_config')

-- plugins
setup_ctrlp()
setup_toggleterm()
setup_lsp()
setup_cmp()
setup_dap(local_config)
setup_plugins()

setup_appearance()
setup_keymap()
setup_commands()
setup_auto_commands()
