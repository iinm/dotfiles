-- Options
for k, v in pairs({
  undofile = true,
  ignorecase = true,
  smartcase = true,
  wildignore = '.git,node_modules',
  clipboard = "unnamedplus",

  -- Default indent
  tabstop = 8,
  expandtab = true,
  shiftwidth = 2,
  softtabstop = 2,
}) do
  vim.opt[k] = v
end

vim.cmd [[colorscheme desert]]

if vim.fn.executable('rg') then
  vim.opt.grepprg = 'rg --vimgrep --glob "!*~" --glob "!.git"'
end

vim.g.markdown_fenced_languages = { 'sh' }

-- File browser
vim.g.netrw_banner = 0
vim.g.netrw_liststyle = 3 -- tree view
vim.g.netrw_winsize = 25 -- %

-- Keymap
vim.g.mapleader = ' '

vim.keymap.set('n', '<leader>fe', ':<C-u>Lexplore!<CR>')
vim.keymap.set('n', '<leader>ft', ':<C-u>Lexplore! %:h<CR><CR>')
vim.keymap.set('n', '<leader>gg', ':<C-u>grep! ')

-- Indent
vim.cmd [[
augroup set_indent
  autocmd!
  autocmd Filetype go     setlocal tabstop=4 noexpandtab softtabstop=4 shiftwidth=4
  autocmd Filetype python setlocal tabstop=4 expandtab   softtabstop=4 shiftwidth=4
augroup END
]]

-- File types
vim.cmd [[
augroup set_filetype
  autocmd!
  autocmd BufNewFile,BufRead *.tsx,*.jsx set filetype=typescriptreact
augroup END
]]

-- Plugins
-- https://github.com/wbthomason/packer.nvim
local packer_local_path = vim.fn.stdpath('data') .. '/site/pack/packer/start/packer.nvim'
local packer_exists = pcall(function()
  local file = io.open(packer_local_path, "r")
  io.close(file)
end)

if packer_exists then
  require('packer').startup(function()
    use 'wbthomason/packer.nvim'

    -- Colorscheme
    use 'sainnhe/everforest'

    -- Utilities
    use 'easymotion/vim-easymotion'
    use 'junegunn/fzf'
    use 'junegunn/fzf.vim'
    use 'tpope/vim-commentary'
    use 'windwp/nvim-autopairs'
    use 'vim-scripts/BufOnly.vim'
    use 'tpope/vim-sleuth'
    use 'tpope/vim-fugitive'
    use 'kamykn/spelunker.vim'
    use 'lilydjwg/colorizer'

    -- Completion, Snippets, LSP
    use 'neovim/nvim-lspconfig'
    use 'hrsh7th/nvim-cmp'
    use 'hrsh7th/cmp-nvim-lsp'
    use 'hrsh7th/vim-vsnip'
    use 'hrsh7th/cmp-vsnip'
    use 'rafamadriz/friendly-snippets'
    use 'github/copilot.vim'

    -- Package manager
    use 'williamboman/mason.nvim'
    use 'williamboman/mason-lspconfig.nvim'

    -- Languages
    use 'pangloss/vim-javascript'
    use 'maxmellon/vim-jsx-pretty'
    use 'jparise/vim-graphql'
    use 'hashivim/vim-terraform'
    use 'jose-elias-alvarez/typescript.nvim'
  end)

  -- Colorscheme
  vim.opt.background = 'dark'
  vim.cmd [[colorscheme everforest]]

  -- fzf
  vim.g.fzf_preview_window = {'right:40%:hidden', 'ctrl-/'}

  -- easymotion
  vim.g.EasyMotion_do_mapping = 0
  vim.g.EasyMotion_smartcase = 1

  -- autopairs
  require("nvim-autopairs").setup()

  -- Completion
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
      ['<CR>'] = cmp.mapping.confirm({ select = true })
    }),
    sources = cmp.config.sources({
      { name = 'nvim_lsp' },
      { name = 'vsnip' },
    }, {
      { name = 'buffer' },
    })
  })

  -- LSP
  require('mason').setup()
  require("mason-lspconfig").setup_handlers({ function(server)
    require('lspconfig')[server].setup {
      capabilities = require('cmp_nvim_lsp').default_capabilities(),
    }
  end
  })

  if vim.fn.executable('efm-langserver') == 1 then
    require('lspconfig')['efm'].setup {
      filetypes = { 'javascript', 'javascriptreact', 'typescript', 'typescriptreact' },
    }
    vim.cmd [[
    augroup format_on_save
      autocmd!
      autocmd BufWritePre *.js,*.jsx lua vim.lsp.buf.format()
      autocmd BufWritePre *.ts,*.tsx lua vim.lsp.buf.format()
    augroup END
    ]]
  end

  vim.lsp.handlers["textDocument/publishDiagnostics"] = vim.lsp.with(
    vim.lsp.diagnostic.on_publish_diagnostics, { virtual_text = false }
  )

  -- javascript
  vim.g.javascript_plugin_jsdoc = 1

  -- typescript
  require("typescript").setup({
    disable_commands = false,
  })

  -- Keymap with Plugins
  vim.keymap.set('n', '<leader><leader>', ':<C-u>Commands<CR>')
  vim.keymap.set('n', '<leader>b', ':<C-u>Buffers<CR>')
  vim.keymap.set('n', '<leader>w', ':<C-u>set wrap!<CR>')
  vim.keymap.set('n', 's', '<Plug>(easymotion-overwin-f2)')

  -- File
  vim.keymap.set('n', '<leader>ff', ':<C-u>Files<CR>')
  vim.keymap.set('n', '<leader>fh', ':<C-u>History<CR>')

  -- LSP
  vim.keymap.set('n', '<leader>ch', vim.lsp.buf.hover)
  vim.keymap.set('n', '<leader>cf', vim.lsp.buf.format)
  vim.keymap.set('n', '<leader>cr', vim.lsp.buf.references)
  vim.keymap.set('n', '<leader>cj', vim.lsp.buf.definition)
  vim.keymap.set('n', '<leader>ci', vim.lsp.buf.implementation)
  vim.keymap.set('n', '<leader>ct', vim.lsp.buf.type_definition)
  vim.keymap.set('n', '<leader>cn', vim.lsp.buf.rename)
  vim.keymap.set('n', '<leader>ca', vim.lsp.buf.code_action)
  vim.keymap.set('n', '<leader>cd', vim.diagnostic.open_float)
  vim.keymap.set('n', '<leader>ce', vim.diagnostic.goto_next)

  -- Spell
  vim.keymap.set('n', '<leader>sl', '<Plug>(spelunker-correct-from-list)')
  vim.keymap.set('n', '<leader>sL', '<Plug>(spelunker-correct-all-from-list)')
  vim.keymap.set('n', '<leader>sf', '<Plug>(spelunker-correct)')
  vim.keymap.set('n', '<leader>sF', '<Plug>(spelunker-correct-all)')
end
