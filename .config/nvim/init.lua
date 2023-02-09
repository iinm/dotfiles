-- Options
for k, v in pairs({
  undofile = true,
  ignorecase = true,
  smartcase = true,
  wildignore = '.git,node_modules',
  clipboard = "unnamedplus",
  termguicolors = true,

  -- Default indent
  tabstop = 8,
  expandtab = true,
  shiftwidth = 2,
  softtabstop = 2,
}) do
  vim.opt[k] = v
end

vim.g.markdown_fenced_languages = { 'sh' }

if vim.fn.executable('rg') then
  vim.opt.grepprg = 'rg --vimgrep --glob "!*~" --glob "!.git"'
end

-- File browser
vim.g.netrw_banner = 0
vim.g.netrw_liststyle = 3 -- tree view
vim.g.netrw_winsize = 25 -- %

-- Keymap
vim.g.mapleader = ' '

vim.keymap.set('n', '<leader>fe', ':<C-u>Explore .<CR>')
-- vim.keymap.set('n', '<leader>ft', ':<C-u>Explore %:h<CR><CR>')
vim.keymap.set('n', '<leader>ft', ':<C-u>Explore <bar> :sil! /<C-R>=expand("%:t")<CR><CR>')
vim.keymap.set('n', '<leader>fs', ':<C-u>grep! ')
vim.keymap.set('n', '<leader>w', ':<C-u>set wrap!<CR>')

-- Indent
local indent_augroup = vim.api.nvim_create_augroup('MyIndent', { clear = true })
vim.api.nvim_create_autocmd({ 'FileType' }, {
  pattern = 'go',
  group = indent_augroup,
  command = 'setlocal tabstop=4 noexpandtab softtabstop=4 shiftwidth=4'
})

-- Plugins
-- git clone --depth 1 https://github.com/wbthomason/packer.nvim ~/.local/share/nvim/site/pack/packer/start/packer.nvim
local packer_local_path = vim.fn.stdpath('data') .. '/site/pack/packer/start/packer.nvim'
local packer_exists = pcall(function()
  local file = io.open(packer_local_path, "r")
  io.close(file)
end)

if packer_exists then
  require('packer').startup(function()
    use 'wbthomason/packer.nvim'

    -- Colorscheme
    use 'EdenEast/nightfox.nvim'

    -- Utilities
    use {
      'nvim-telescope/telescope.nvim', tag = '0.1.1',
      requires = { { 'nvim-lua/plenary.nvim' } }
    }
    use {
      'phaazon/hop.nvim',
      branch = 'v2',
    }
    use 'github/copilot.vim'
    use 'kamykn/spelunker.vim'
    use 'lilydjwg/colorizer'
    use 'tpope/vim-commentary'
    use 'tpope/vim-fugitive'
    use 'tpope/vim-sleuth'
    use 'vim-scripts/BufOnly.vim'
    use 'windwp/nvim-autopairs'

    -- Snippets
    use 'hrsh7th/vim-vsnip'
    use 'rafamadriz/friendly-snippets'

    -- LSP, and Package manager
    use 'neovim/nvim-lspconfig'
    use 'williamboman/mason.nvim'
    use 'williamboman/mason-lspconfig.nvim'
    use 'jose-elias-alvarez/null-ls.nvim'
    use 'ray-x/lsp_signature.nvim'
    use 'folke/trouble.nvim'
    use 'onsails/lspkind.nvim'

    -- Completion
    use 'hrsh7th/cmp-buffer'
    use 'hrsh7th/cmp-path'
    use 'hrsh7th/cmp-cmdline'
    use 'hrsh7th/cmp-vsnip'
    use 'hrsh7th/cmp-nvim-lsp'
    use 'hrsh7th/nvim-cmp'

    -- Languages
    use 'pangloss/vim-javascript'
    use 'maxmellon/vim-jsx-pretty'
    use 'jose-elias-alvarez/typescript.nvim'
    use 'jparise/vim-graphql'
    use 'hashivim/vim-terraform'
    use 'dag/vim-fish'
  end)

  -- Colorscheme
  vim.cmd.colorscheme('nordfox')

  -- hop
  require('hop').setup()

  -- autopairs
  require("nvim-autopairs").setup()

  -- Telescope
  local telescope_actions = require('telescope.actions')
  require('telescope').setup {
    defaults = {
      mappings = {
        i = {
          ['<esc>'] = telescope_actions.close
        }
      }
    },
    pickers = {
      commands = {
        theme = 'dropdown'
      },
      find_files = {
        theme = 'dropdown'
      },
      git_files = {
        theme = 'dropdown'
      },
      buffers = {
        theme = 'dropdown',
        ignore_current_buffer = true,
        sort_lastused = true,
      },
      oldfiles = {
        theme = 'dropdown'
      },
      live_grep = {
        theme = 'dropdown'
      },
      grep_string = {
        theme = 'dropdown'
      },
    }
  }

  -- Completion
  local cmp = require('cmp')
  local lspkind = require('lspkind')

  cmp.setup({
    snippet = {
      expand = function(args)
        vim.fn["vsnip#anonymous"](args.body)
      end,
    },
    mapping = cmp.mapping.preset.insert({
      -- Note: it conflicts with copilot
      -- ["<Tab>"] = cmp.mapping(function(fallback)
      --   if cmp.visible() then
      --     cmp.select_next_item()
      --   else
      --     fallback()
      --   end
      -- end, { "i", "s" }),
      -- ["<S-Tab>"] = cmp.mapping(function(fallback)
      --   if cmp.visible() then
      --     cmp.select_prev_item()
      --   else
      --     fallback()
      --   end
      -- end, { "i", "s" }),
      ['<C-b>'] = cmp.mapping.scroll_docs(-4),
      ['<C-f>'] = cmp.mapping.scroll_docs(4),
      ['<C-Space>'] = cmp.mapping.complete(),
      ['<C-e>'] = cmp.mapping.abort(),
      ['<CR>'] = cmp.mapping.confirm({ select = true })
    }),
    sources = cmp.config.sources({
      { name = 'nvim_lsp' },
      { name = 'vsnip' },
      { name = 'path' },
    }, {
      { name = 'buffer' },
    }),
    formatting = {
      format = lspkind.cmp_format({
        mode = 'symbol',
        -- https://github.com/microsoft/vscode-codicons/blob/main/dist/codicon.ttf
        preset = 'codicons',
        maxwidth = 50,
        ellipsis_char = '...',
      })
    },
  })

  cmp.setup.cmdline(':', {
    mapping = cmp.mapping.preset.cmdline(),
    sources = cmp.config.sources({
      { name = 'path' }
    }, {
      { name = 'cmdline' }
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

  vim.lsp.handlers["textDocument/publishDiagnostics"] = vim.lsp.with(
    vim.lsp.diagnostic.on_publish_diagnostics, { virtual_text = false }
  )

  local null_ls = require('null-ls')

  -- https://github.com/jose-elias-alvarez/null-ls.nvim/wiki/Avoiding-LSP-formatting-conflicts
  local lsp_formatting = function(bufnr)
    vim.lsp.buf.format({
      filter = function(client)
        -- apply whatever logic you want (in this example, we'll only use null-ls)
        return client.name == "null-ls"
      end,
      bufnr = bufnr,
    })
  end

  local lsp_formatting_augroup = vim.api.nvim_create_augroup("LspFormatting", { clear = true })

  null_ls.setup({
    sources = {
      null_ls.builtins.formatting.eslint,
      null_ls.builtins.diagnostics.shellcheck.with({
        diagnostic_config = {
          virtual_text = false,
          severity_sort = true,
        },
      }),
      null_ls.builtins.code_actions.shellcheck,
    },
    on_attach = function(client, bufnr)
      if client.supports_method("textDocument/formatting") then
        vim.api.nvim_clear_autocmds({ group = lsp_formatting_augroup, buffer = bufnr })
        vim.api.nvim_create_autocmd("BufWritePre", {
          group = lsp_formatting_augroup,
          buffer = bufnr,
          callback = function()
            lsp_formatting(bufnr)
          end,
        })
      end
    end,
  })

  require('trouble').setup({
    icons = false,
    fold_open = "v",
    fold_closed = ">",
    indent_lines = false,
    signs = {
      error = "error",
      warning = "warn",
      hint = "hint",
      information = "info"
    },
    use_diagnostic_signs = false
  })

  require('lsp_signature').setup()

  -- javascript
  vim.g.javascript_plugin_jsdoc = 1

  -- typescript
  require("typescript").setup({
    disable_commands = false,
  })

  -- File types
  local file_type_augroup = vim.api.nvim_create_augroup('MyFileType', { clear = true })
  vim.api.nvim_create_autocmd({ 'BufNewFile', 'BufRead' }, {
    pattern = {'*.tsx', '*.jsx'},
    group = file_type_augroup,
    command = 'set filetype=typescriptreact'
  })

  -- Spell
  vim.cmd.highlight({ 'SpelunkerSpellBad', 'cterm=underline' })
  vim.cmd.highlight({ 'SpelunkerComplexOrCompoundWord', 'cterm=underline' })

  -- Keymap with Plugins
  local telescope_builtin = require('telescope.builtin')
  vim.keymap.set('n', '<leader><leader>', telescope_builtin.commands, {})
  vim.keymap.set('n', '<leader>b', telescope_builtin.buffers, {})
  vim.keymap.set('n', '<leader>r', telescope_builtin.resume, {})
  vim.keymap.set('n', 's', ':<C-u>HopChar2<CR>')

  -- File
  vim.keymap.set('n', '<leader>ff', telescope_builtin.find_files, {})
  vim.keymap.set('n', '<leader>fh', telescope_builtin.oldfiles, {})
  vim.keymap.set('n', '<leader>fg', telescope_builtin.git_files, {})
  vim.keymap.set('n', '<leader>fs', telescope_builtin.live_grep, {})
  vim.keymap.set('n', '<leader>fc', telescope_builtin.grep_string, {})

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
  vim.keymap.set('n', '<leader>st', '<Plug>(spelunker-toggle)')
  vim.keymap.set('n', '<leader>sl', '<Plug>(spelunker-correct-from-list)')
  vim.keymap.set('n', '<leader>sL', '<Plug>(spelunker-correct-all-from-list)')
  -- vim.keymap.set('n', '<leader>sf', '<Plug>(spelunker-correct)')
  -- vim.keymap.set('n', '<leader>sF', '<Plug>(spelunker-correct-all)')

  -- vsnip
  vim.cmd [[
  imap <expr> <Tab>   vsnip#jumpable(1)   ? '<Plug>(vsnip-jump-next)'      : '<Tab>'
  smap <expr> <Tab>   vsnip#jumpable(1)   ? '<Plug>(vsnip-jump-next)'      : '<Tab>'
  imap <expr> <S-Tab> vsnip#jumpable(-1)  ? '<Plug>(vsnip-jump-prev)'      : '<S-Tab>'
  smap <expr> <S-Tab> vsnip#jumpable(-1)  ? '<Plug>(vsnip-jump-prev)'      : '<S-Tab>'
  ]]
end
