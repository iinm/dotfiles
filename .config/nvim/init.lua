-- Options
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

-- Utilities
vim.cmd('source ' .. vim.fn.stdpath('config') .. '/outline.vim')
vim.cmd('source ' .. vim.fn.stdpath('config') .. '/buffers.vim')
vim.cmd('source ' .. vim.fn.stdpath('config') .. '/oldfiles.vim')

-- Key map
vim.g.mapleader = ' '
vim.keymap.set('n', '<leader>vr', ':<C-u>source $MYVIMRC<CR>')
vim.keymap.set('n', '<C-w>m', '<C-w>_<C-w><bar>')
vim.keymap.set('n', '<leader>b', ':<C-u>call Buffers()<CR>')
vim.keymap.set('n', '<leader>w', ':<C-u>set wrap!<CR>')
vim.keymap.set('n', '<leader>n', ':<C-u>set number!<CR>')
vim.keymap.set('n', '<leader>s', ':<C-u>gr!<Space>')
vim.keymap.set('n', '<leader>e', ':<C-u>e %:h <bar> /<C-r>=expand("%:t")<CR><CR>')
vim.keymap.set('n', '<leader>t', ':<C-u>split | terminal<Space>')
-- https://vim.fandom.com/wiki/Search_for_visually_selected_text
vim.cmd [[vnoremap // y/\V<C-r>=escape(@",'/\')<CR><CR>]]

-- Commands
vim.api.nvim_create_user_command('BDelete', 'b # | bd #', {})
vim.api.nvim_create_user_command('BOnly', '%bd | e # | bd #', {})
vim.api.nvim_create_user_command('Outline', 'call Outline()', {})
vim.api.nvim_create_user_command('Oldfiles', 'call Oldfiles()', {})
vim.api.nvim_create_user_command('OldfilesLocal', [[call Oldfiles('\v^' .. getcwd())]], {})

-- etc.
vim.api.nvim_create_autocmd({ 'QuickFixCmdPost' }, {
  group = vim.api.nvim_create_augroup('UserOpenQuickfixWindow', {}),
  pattern = '*grep*',
  command = 'cwindow | setlocal nowrap'
})

local indent_augroup = vim.api.nvim_create_augroup('UserIndentConfig', {})
vim.api.nvim_create_autocmd({ 'FileType' }, {
  pattern = 'go',
  group = indent_augroup,
  command = 'setlocal tabstop=4 noexpandtab softtabstop=4 shiftwidth=4'
})

-- Plugins
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
  use 'ctrlpvim/ctrlp.vim'
  use 'tpope/vim-sleuth'
  use 'tpope/vim-commentary'
  use 'tpope/vim-fugitive'
  use 'elihunter173/dirbuf.nvim'
  use 'akinsho/toggleterm.nvim'
  use 'windwp/nvim-autopairs'
  use 'kamykn/spelunker.vim'
  use { 'phaazon/hop.nvim', branch = 'v2' }

  -- lsp
  use 'neovim/nvim-lspconfig'
  use "williamboman/mason.nvim"
  use 'williamboman/mason-lspconfig.nvim'
  use 'jose-elias-alvarez/null-ls.nvim'

  -- snippets
  use 'hrsh7th/vim-vsnip'
  use 'rafamadriz/friendly-snippets'

  -- completion
  use 'hrsh7th/cmp-buffer'
  use 'hrsh7th/cmp-vsnip'
  use 'hrsh7th/cmp-nvim-lsp'
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

  -- ctrlp
  vim.g.ctrlp_user_command = 'fd --hidden --exclude .git --type f --color=never "" %s'
  vim.g.ctrlp_root_markers = { '.git', 'package.json' }
  vim.g.ctrlp_match_window = 'bottom,order:btt,min:1,max:15,results:15'
  vim.g.ctrlp_by_filename = 1
  vim.g.ctrlp_use_caching = 0
  vim.g.ctrlp_mruf_relative = 1
  vim.g.ctrlp_mruf_exclude = [[COMMIT_EDITMSG]]

  -- toggleterm
  require("toggleterm").setup({
    size = function(term)
      if term.direction == "horizontal" then
        return vim.o.lines * 0.4
      elseif term.direction == "vertical" then
        return vim.o.columns * 0.4
      end
    end,
  })

  -- lsp
  require('mason').setup()
  -- https://github.com/williamboman/mason-lspconfig.nvim
  local mason_lspconfig = require('mason-lspconfig')
  -- mason_lspconfig.setup({
  --   ensure_installed = {
  --     'lua_ls',
  --     'gopls',
  --     'tsserver',
  --     'custom_elements_ls',
  --     'emmet_ls',
  --   },
  -- })
  mason_lspconfig.setup_handlers({
    function(server)
      require('lspconfig')[server].setup {
        capabilities = require('cmp_nvim_lsp').default_capabilities(),
      }
    end
  })

  -- null-ls
  -- https://github.com/jose-elias-alvarez/null-ls.nvim/wiki/Avoiding-LSP-formatting-conflicts
  local null_ls = require('null-ls')

  local lsp_formatting = function(bufnr)
    vim.lsp.buf.format({
      filter = function(client)
        print(client.name)
        return client.name == 'null-ls'
      end,
      bufnr = bufnr,
    })
  end

  local before_lsp_formatting = function(bufnr)
    local filetype = vim.api.nvim_buf_get_option(bufnr, 'filetype')
    if filetype == 'typescript' then
      local ts = require("typescript").actions
      ts.removeUnused({ sync = true })
    end
  end

  local lsp_formatting_augroup = vim.api.nvim_create_augroup('LspFormatting', {})

  null_ls.setup({
    sources = {
      null_ls.builtins.formatting.goimports,
      null_ls.builtins.formatting.eslint,
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
        vim.api.nvim_clear_autocmds({ group = lsp_formatting_augroup, buffer = bufnr })
        vim.api.nvim_create_autocmd('BufWritePre', {
          group = lsp_formatting_augroup,
          buffer = bufnr,
          callback = function()
            before_lsp_formatting(bufnr)
            lsp_formatting(bufnr)
          end,
        })
      end
    end,
  })

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

  -- cmp
  -- https://github.com/hrsh7th/nvim-cmp/wiki/Menu-Appearance
  local cmp_kinds = {
    Text = '  ',
    Method = 'λ  ',
    Function = '  ',
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
    Snippet = '  ',
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
      ['<C-b>'] = cmp.mapping.scroll_docs(-4),
      ['<C-f>'] = cmp.mapping.scroll_docs(4),
      ['<C-Space>'] = cmp.mapping.complete(),
      ['<C-e>'] = cmp.mapping.abort(),
      ['<CR>'] = cmp.mapping.confirm({ select = true }),
    }),
    sources = cmp.config.sources({
      { name = 'nvim_lsp' },
      { name = 'vsnip' },
    }, {
      { name = 'buffer' },
    }),
    formatting = {
      fields = { 'abbr', 'kind', 'menu' },
      format = function(_, vim_item)
        vim_item.kind = cmp_kinds[vim_item.kind] or ''
        -- if entry.completion_item.detail ~= nil then
        --   vim_item.menu = entry.completion_item.detail
        -- end
        return vim_item
      end
    }
  })

  -- spelunker
  vim.g.enable_spelunker_vim = 0
  vim.api.nvim_create_autocmd({ 'BufNewFile', 'BufRead' }, {
    group = vim.api.nvim_create_augroup('UserSpelunkerConfig', {}),
    pattern = { '*.md', '*.json', '*.sh', '*.fish', '*.js', '*.ts', '*.tsx' },
    command = 'call spelunker#toggle()',
  })
  vim.cmd([[
  highlight SpelunkerSpellBad gui=underline
  highlight SpelunkerComplexOrCompoundWord gui=underline
  ]])

  -- etc.
  vim.cmd [[
  let g:everforest_background = 'soft'
  set background=dark
  colorscheme everforest
  ]]
  vim.cmd [[
  set statusline=%<%f\ %h%m%r%{FugitiveStatusline()}%=%-14.(%l,%c%V%)\ %P
  ]]

  require('nvim-autopairs').setup()
  require('hop').setup()
  require('typescript').setup({})

  vim.g.javascript_plugin_jsdoc = 1

  -- Key map
  vim.keymap.set('n', '<leader>f', ':<C-u>CtrlPMixed<CR>', {})
  vim.keymap.set('n', 's', ':<C-u>HopChar2<CR>')

  -- terminal
  vim.keymap.set('n', '<C-w>t', ':<C-u>ToggleTerm<CR>')
  vim.keymap.set('n', '<C-w>T', ':<C-u>TermSelect<CR>')
  vim.keymap.set('n', '<leader>t', [[:<C-u><C-r>=v:count1<CR>TermExec cmd=''<Left>]])
  vim.api.nvim_create_autocmd({ 'TermOpen' }, {
    group = vim.api.nvim_create_augroup('UserTerminalConfig', {}),
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
      vim.keymap.set('t', '<C-w>T', '<Cmd>TermSelect<CR>', {})
    end,
  })

  -- lsp
  vim.keymap.set('n', '<leader>d', vim.diagnostic.open_float)
  vim.keymap.set('n', '<leader>q', vim.diagnostic.setloclist)
  vim.keymap.set('n', '[d', vim.diagnostic.goto_prev)
  vim.keymap.set('n', ']d', vim.diagnostic.goto_next)

  -- https://github.com/neovim/nvim-lspconfig
  vim.api.nvim_create_autocmd('LspAttach', {
    group = vim.api.nvim_create_augroup('UserLspConfig', {}),
    callback = function(ev)
      local opts = { buffer = ev.buf }
      vim.keymap.set({ 'n', 'v' }, '<leader>a', vim.lsp.buf.code_action, opts)
      vim.keymap.set('n', 'gD', vim.lsp.buf.declaration, opts)
      vim.keymap.set('n', 'gd', vim.lsp.buf.definition, opts)
      vim.keymap.set('n', 'gt', vim.lsp.buf.type_definition, opts)
      vim.keymap.set('n', 'gr', vim.lsp.buf.references, opts)
      vim.keymap.set('n', 'gi', vim.lsp.buf.implementation, opts)
      vim.keymap.set('n', 'K', vim.lsp.buf.hover, opts)
      vim.keymap.set({ 'n', 'i' }, '<C-k>', vim.lsp.buf.signature_help, opts)

      -- commands
      vim.api.nvim_create_user_command('LspRename', function()
        vim.lsp.buf.rename()
      end, {})
      vim.api.nvim_create_user_command('LspFormat', function()
        vim.lsp.buf.format({ async = false })
      end, {})

      -- format on save
      vim.api.nvim_create_autocmd({ 'BufWritePre' }, {
        group = vim.api.nvim_create_augroup('UserLspFormattingOnSave', {}),
        pattern = { '*.lua' },
        callback = function()
          vim.lsp.buf.format({ async = false })
        end,
      })
    end,
  })

  -- git
  vim.keymap.set('n', '<leader>gf', ':<C-u>Git fetch --prune<CR>')
  vim.keymap.set('n', '<leader>gc', ':<C-u>Git checkout<Space>')
  vim.keymap.set('n', '<leader>gp', ':<C-u>Git pull origin <C-r>=FugitiveHead()<CR><CR>')
  vim.keymap.set('n', '<leader>gP',
    [[:5TermExec open=0 cmd='with_notify git push origin <C-r>=FugitiveHead()<CR>'<Left>]])
  vim.keymap.set('n', '<leader>gb', ':<C-u>Git blame<CR>')

  -- https://github.com/hrsh7th/vim-vsnip
  vim.cmd [[
  inoremap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  snoremap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  inoremap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'
  snoremap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'
  ]]

  -- Commands
  vim.api.nvim_create_user_command('ToggleSpell', 'call spelunker#toggle()', {})
end)
