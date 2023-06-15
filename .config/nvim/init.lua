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

  vim.g.markdown_fenced_languages = { 'sh' }
  vim.g.netrw_banner = 0
  vim.g.newrw_hide = 0
  vim.g.netrw_liststyle = 3
end

local load_utilities = function()
  local config_path = vim.fn.stdpath('config')
  vim.cmd('source ' .. config_path .. '/outline.vim')
  vim.cmd('source ' .. config_path .. '/buffers.vim')
  vim.cmd('source ' .. config_path .. '/oldfiles.vim')
  vim.cmd('source ' .. config_path .. '/tabline.vim')
end

local set_appearance = function()
  vim.g.everforest_background = 'soft'
  vim.opt.background = 'dark'
  vim.cmd.colorscheme('everforest')

  -- statusline
  vim.opt.laststatus = 3
  vim.cmd.highlight({ 'StatusLineFilename', 'ctermbg=237', 'guibg=#434f55' })
  vim.opt.statusline = table.concat({
    '%<',                                                      -- truncate if too long
    '%{empty(expand("%:h")) ? "" : expand("%:~:.:h") .. "/"}', -- directory name (relative path)
    '%#StatusLineFilename#%t%*',                               -- file name
    ' ',
    '%h',                                                      -- help
    '%m',                                                      -- modified
    '%r',                                                      -- read-only
    '%{FugitiveStatusline()}',                                 -- git status
    '%=',                                                      -- right align
    '%-14.(%l,%c%V%) %P',                                      -- line, column, virtual column, percentage
  }, '')

  -- tabline
  -- vim.opt.showtabline = 2
  vim.opt.tabline = '%!MyTabLine()'
  vim.cmd.highlight({ 'MyTabLineSel', 'ctermbg=238', 'guibg=#4d5960' })

  vim.cmd.highlight({ 'SpelunkerSpellBad', 'cterm=underline', 'gui=underline' })
  vim.cmd.highlight({ 'SpelunkerComplexOrCompoundWord', 'cterm=underline', 'gui=underline' })
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

local set_keymap = function()
  local telescope_builtin = require('telescope.builtin')

  vim.g.mapleader = ' '
  -- utilities
  vim.keymap.set('n', '<leader><leader>', telescope_builtin.commands, {})
  vim.keymap.set('n', '<leader>r', telescope_builtin.command_history, {})
  vim.keymap.set('n', '<leader>f', telescope_builtin.find_files, {})
  vim.keymap.set('n', '<leader>o', telescope_builtin.oldfiles, {})
  vim.keymap.set('n', '<leader>b', ':<C-u>call Buffers()<CR>', {})
  vim.keymap.set('n', '<leader>w', ':<C-u>set wrap!<CR>')
  vim.keymap.set('n', '<leader>n', ':<C-u>set number!<CR>')
  vim.keymap.set('n', '<leader>s', ':<C-u>gr!<Space>')
  vim.keymap.set('n', '<leader>t', [[:<C-u><C-r>=v:count1<CR>TermExec cmd=''<Left>]])
  vim.keymap.set('n', '<leader>vr', ':<C-u>source $MYVIMRC<CR>')
  vim.keymap.set('v', '//', [[y/\V<C-r>=escape(@",'/\')<CR><CR>]])
  vim.keymap.set('n', 's', ':<C-u>HopChar2<CR>')
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

  -- terminal
  vim.api.nvim_create_autocmd({ 'TermOpen' }, {
    group = vim.api.nvim_create_augroup('UserTerminalKeymapConfig', {}),
    pattern = '*',
    callback = function()
      local opts = { buffer = 0 }
      vim.keymap.set('t', '<esc>', [[<C-\><C-n>]], opts)
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
  vim.keymap.set('n', '<leader>d', vim.diagnostic.open_float)
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
      -- Disable to avoid conflict with :tabnext
      -- vim.keymap.set('n', 'gt', vim.lsp.buf.type_definition, opts)
      vim.keymap.set('n', 'gr', vim.lsp.buf.references, opts)
      vim.keymap.set('n', 'gi', vim.lsp.buf.implementation, opts)
      vim.keymap.set('n', 'K', vim.lsp.buf.hover, opts)
      vim.keymap.set({ 'n', 'i' }, '<C-k>', vim.lsp.buf.signature_help, opts)
    end,
  })

  -- copilot
  -- vim.cmd [[imap <silent><script><expr> <C-J> copilot#Accept("\<CR>")]]
  -- vim.g.copilot_no_tab_map = true

  -- git
  vim.keymap.set('n', '<leader>gf', ':<C-u>Git fetch --prune<CR>')
  vim.keymap.set('n', '<leader>gc', ':<C-u>Git checkout<Space>')
  vim.keymap.set('n', '<leader>gp', ':<C-u>Git pull origin <C-r>=FugitiveHead()<CR><CR>')
  vim.keymap.set('n', '<leader>gP',
    [[:5TermExec open=0 cmd='with_notify git push origin <C-r>=FugitiveHead()<CR>'<Left>]])
  vim.keymap.set('n', '<leader>gb', ':<C-u>Git blame<CR>')

  -- dap
  vim.keymap.set('n', '<leader>dt', toggle_debugger)
  vim.keymap.set('n', '<leader>db', ':<C-u>DapToggleBreakpoint<CR>')
  vim.keymap.set('n', '<leader>dB', ':<C-u>ClearBreakpoints<CR>')
  vim.keymap.set('n', '<leader>dc', ':<C-u>DapContinue<CR>')
  vim.keymap.set({ 'n', 'v' }, '<leader>de', '<Cmd>lua require("dapui").eval()<CR>')

  -- vsnip
  -- https://github.com/hrsh7th/vim-vsnip
  vim.cmd [[
  inoremap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  snoremap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  inoremap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'
  snoremap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'
  ]]
end

local create_commands = function()
  vim.api.nvim_create_user_command('BD', 'b # | bd #', {})
  vim.api.nvim_create_user_command('BOnly', '%bd | e # | bd #', {})
  vim.api.nvim_create_user_command('Outline', 'call Outline()', {})
  vim.api.nvim_create_user_command('Buffers', 'call Buffers()', {})
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

  vim.api.nvim_create_user_command('ToggleFolding', function()
    if vim.opt_local.foldlevel:get() < 50 then
      vim.opt_local.foldlevel = 99
    else
      vim.opt_local.foldlevel = 2
    end
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

local create_auto_commands = function()
  vim.api.nvim_create_autocmd({ 'QuickFixCmdPost' }, {
    group = vim.api.nvim_create_augroup('UserOpenQuickfixWindowAfterGrep', {}),
    pattern = '*grep*',
    command = 'botright cwindow | setlocal nowrap'
  })

  vim.api.nvim_create_autocmd({ 'FileType' }, {
    pattern = 'go',
    group = vim.api.nvim_create_augroup('UserIndentConfig', {}),
    command = 'setlocal tabstop=4 noexpandtab softtabstop=4 shiftwidth=4'
  })

  -- format on save
  vim.api.nvim_create_autocmd('LspAttach', {
    group = vim.api.nvim_create_augroup('UserLspFormatOnSave', {}),
    callback = function()
      vim.api.nvim_create_autocmd({ 'BufWritePre' }, {
        group = vim.api.nvim_create_augroup('UserLspFormattingOnSave', {}),
        pattern = { '*.lua' },
        callback = function()
          vim.lsp.buf.format({ async = false })
        end,
      })
    end,
  })

  -- spell check
  -- vim.api.nvim_create_autocmd({ 'BufNewFile', 'BufRead' }, {
  --   group = vim.api.nvim_create_augroup('UserSpelunkerConfig', {}),
  --   pattern = { '*.md', '*.json', '*.sh', '*.fish', '*.js', '*.ts', '*.tsx' },
  --   callback = function()
  --     vim.fn['spelunker#toggle']()
  --   end,
  -- })
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
    use "nvim-lua/plenary.nvim"

    -- ui
    use 'sainnhe/everforest'

    -- utilities
    use { 'nvim-telescope/telescope.nvim', tag = '0.1.1' }
    use 'stevearc/dressing.nvim'
    use 'tpope/vim-sleuth'
    use 'tpope/vim-commentary'
    use 'tpope/vim-fugitive'
    use 'elihunter173/dirbuf.nvim'
    use 'akinsho/toggleterm.nvim'
    use 'windwp/nvim-autopairs'
    use 'kamykn/spelunker.vim'
    use { 'phaazon/hop.nvim', branch = 'v2' }
    use 'folke/trouble.nvim'

    -- lsp
    use 'neovim/nvim-lspconfig'
    use "williamboman/mason.nvim"
    use 'williamboman/mason-lspconfig.nvim'
    use 'jose-elias-alvarez/null-ls.nvim'

    -- debugger
    use 'mfussenegger/nvim-dap'
    use 'jay-babu/mason-nvim-dap.nvim'
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

    -- lanugages
    use 'pangloss/vim-javascript'
    use 'jose-elias-alvarez/typescript.nvim'
    use 'jparise/vim-graphql'
    use 'hashivim/vim-terraform'
    use 'dag/vim-fish'

    if packer_bootstrap then
      require('packer').sync()
    end
  end)
end

local setup_telescope = function()
  local telescope = require('telescope')
  local telescope_actions = require('telescope.actions')
  telescope.setup({
    defaults = {
      path_display = { "smart" },
      file_ignore_patterns = { 'node_modules', '.git' },
      mappings = {
        i = {
          ['<esc>'] = telescope_actions.close,
        }
      }
    },
    pickers = {
      find_files = {
        hidden = true,
        previewer = false,
      },
      oldfiles = {
        only_cwd = true,
        previewer = false,
      },
      buffers = {
        ignore_current_buffer = true,
        sort_lastused = true,
        previewer = false,
      },
    }
  })
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

local setup_mason = function()
  require('mason').setup()
end

local setup_lsp = function()
  -- https://github.com/neovim/nvim-lspconfig/wiki/UI-Customization
  vim.diagnostic.config({
    virtual_text = false,
    signs = true,
    underline = false,
    update_in_insert = false,
    severity_sort = true,
  })

  local signs = { Error = ' ', Warn = ' ', Hint = ' ', Info = ' ' }
  for type, icon in pairs(signs) do
    local hl = 'DiagnosticSign' .. type
    vim.fn.sign_define(hl, { text = icon, texthl = hl, numhl = hl })
  end

  -- https://github.com/williamboman/mason-lspconfig.nvim
  local mason_lspconfig = require('mason-lspconfig')
  -- :h mason-lspconfig.setup_handlers()
  mason_lspconfig.setup_handlers({
    function(server)
      require('lspconfig')[server].setup {
        capabilities = require('cmp_nvim_lsp').default_capabilities(),
      }
    end
  })
  -- mason_lspconfig.setup({
  --   ensure_installed = {
  --     'lua_ls',
  --     'gopls',
  --     'tsserver',
  --     'custom_elements_ls',
  --     'emmet_ls',
  --   },
  -- })

  require('trouble').setup({
    icons = false,
    fold_open = 'v',
    fold_closed = '>',
    indent_lines = false,
    signs = {
      error = 'error',
      warning = 'warn',
      hint = 'hint',
      information = 'info'
    },
    use_diagnostic_signs = true
  })
end

local setup_null_ls = function(local_config)
  -- https://github.com/jose-elias-alvarez/null-ls.nvim/wiki/Avoiding-LSP-formatting-conflicts
  local null_ls = require('null-ls')

  local null_ls_formatting = function(bufnr)
    vim.lsp.buf.format({
      filter = function(client)
        return client.name == 'null-ls'
      end,
      bufnr = bufnr,
    })
  end

  -- Run actions before formatting
  -- local before_null_ls_formatting = function(bufnr)
  --   local filetype = vim.api.nvim_buf_get_option(bufnr, 'filetype')
  --   if filetype == 'typescript' then
  --     local ts = require("typescript").actions
  --     ts.removeUnused({ sync = true })
  --   end
  -- end

  local null_ls_formatting_augroup = vim.api.nvim_create_augroup('UserNullLSFormatting', {})

  null_ls.setup({
    sources = local_config.null_ls_sources or {
      null_ls.builtins.formatting.goimports,
      null_ls.builtins.formatting.prettier,
      null_ls.builtins.diagnostics.eslint.with({
        diagnostics_postprocess = function(diagnostic)
          diagnostic.severity = vim.diagnostic.severity["WARN"]
        end,
      }),
      null_ls.builtins.diagnostics.shellcheck,
      null_ls.builtins.code_actions.shellcheck,
    },
    on_attach = function(client, bufnr)
      if client.supports_method('textDocument/formatting') then
        vim.api.nvim_clear_autocmds({ group = null_ls_formatting_augroup, buffer = bufnr })
        vim.api.nvim_create_autocmd('BufWritePre', {
          group = null_ls_formatting_augroup,
          buffer = bufnr,
          callback = function()
            -- before_null_ls_formatting(bufnr)
            null_ls_formatting(bufnr)
          end,
        })
      end
    end,
  })
end

local setup_cmp = function()
  -- https://github.com/hrsh7th/nvim-cmp/wiki/Menu-Appearance
  local cmp_kinds = {
    Text = '  ',
    Method = '  ',
    Function = 'λ  ',
    Constructor = '  ',
    Field = '  ',
    Variable = '  ',
    Class = '  ',
    Interface = '  ',
    Module = '  ',
    Property = '  ',
    Unit = '  ',
    Value = '  ',
    Enum = '  ',
    Keyword = '  ',
    Snippet = '>  ',
    Color = '  ',
    File = '  ',
    Reference = '  ',
    Folder = '  ',
    EnumMember = '  ',
    Constant = '  ',
    Struct = '  ',
    Event = '  ',
    Operator = '  ',
    TypeParameter = '  ',
  }

  -- https://github.com/hrsh7th/nvim-cmp
  local cmp = require('cmp')
  cmp.setup({
    snippet = {
      expand = function(args)
        vim.fn["vsnip#anonymous"](args.body)
      end,
    },
    mapping = cmp.mapping.preset.insert({
      -- Disable Tab to avoid conflicts with Copilot.
      -- ['<Tab>'] = function(fallback)
      --   if cmp.visible() then
      --     cmp.select_next_item()
      --   else
      --     fallback()
      --   end
      -- end,
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
    formatting = {
      fields = { 'abbr', 'kind', 'menu' },
      format = function(_, vim_item)
        vim_item.kind = cmp_kinds[vim_item.kind] or ''
        -- if entry.completion_item.detail ~= nil then
        --   vim_item.menu = entry.completion_item.detail
        -- end
        return vim_item
      end
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
  local dapui = require("dapui")

  dap.configurations = local_config.dap_configurations or {
    typescript = {
      {
        name = 'Test (Jest)',
        type = 'node2',
        request = 'launch',
        program = '${workspaceFolder}/node_modules/.bin/jest',
        cwd = '${workspaceFolder}',
        args = { '--runInBand', '${file}' },
      }
    }
  }

  -- https://github.com/jay-babu/mason-nvim-dap.nvim
  require('mason-nvim-dap').setup({
    -- ensure_installed = {
    --   'node2',
    -- },
    handlers = {
      function(config)
        require('mason-nvim-dap').default_setup(config)
      end,
    },
  })

  require('dapui').setup()
  dap.listeners.after.event_initialized["dapui_config"] = function()
    open_debugger()
  end
  -- dap.listeners.before.event_terminated["dapui_config"] = function()
  --   close_debugger()
  -- end
  dap.listeners.before.event_exited["dapui_config"] = function()
    close_debugger()
  end
end

local setup_plugins = function()
  -- vim.g.enable_spelunker_vim = 0
  vim.g.javascript_plugin_jsdoc = 1
  require('hop').setup()
  require('nvim-autopairs').setup()
  require('typescript').setup({})
  require('dressing').setup()
end

-- Setup
set_options()
load_utilities()
ensure_plugins()
local local_config = require('local')

-- plugins
setup_telescope()
setup_toggleterm()
setup_mason()
setup_lsp()
setup_null_ls(local_config)
setup_cmp()
setup_dap(local_config)
setup_plugins()

set_appearance()
set_keymap()
create_commands()
create_auto_commands()
