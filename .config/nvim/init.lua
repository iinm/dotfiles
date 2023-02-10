--[[ Cheat Sheet
open file            :e **/main.go
                     :e %:h/
jump                 :jumps -> [N] Ctrl-O (older location) or Ctrl-I (newer location)
recent files         :browse oldfiles
                     :browse filter /pattern/ oldfiles
open path            gf (goto file), gx (xdg-open)
grep current dir     :grep! hoge -> :cw
grep current buffer  :grep! hoge %
]]

-- options
for k, v in pairs({
  undofile = true,
  ignorecase = true,
  smartcase = true,
  wildignore = '.git,node_modules',
  clipboard = 'unnamedplus',
  termguicolors = true,

  -- default indent
  tabstop = 8,
  expandtab = true,
  shiftwidth = 2,
  softtabstop = 2,
}) do
  vim.opt[k] = v
end

if vim.fn.executable('rg') then
  vim.opt.grepprg = 'rg --vimgrep --hidden --glob "!*~" --glob "!.git" --glob "!node_modules"'
end

vim.g.netrw_banner = 0
vim.g.netrw_liststyle = 3 -- tree view
vim.g.netrw_winsize = 25 -- %

vim.g.markdown_fenced_languages = { 'sh' }

-- keymap
vim.g.mapleader = ' '
vim.keymap.set('n', '<leader>gg', ':<C-u>grep! ')
vim.keymap.set('n', '<leader>w', ':<C-u>set wrap!<CR>')
-- https://vim.fandom.com/wiki/Search_for_visually_selected_text
vim.cmd [[vnoremap // y/\V<C-r>=escape(@",'/\')<CR><CR>]]

-- indent
local indent_augroup = vim.api.nvim_create_augroup('UserIndent', { clear = true })
vim.api.nvim_create_autocmd({ 'FileType' }, {
  pattern = 'go',
  group = indent_augroup,
  command = 'setlocal tabstop=4 noexpandtab softtabstop=4 shiftwidth=4'
})

-- open quickfix window after grep
local opne_quickfix_window_augroup = vim.api.nvim_create_augroup('UserOpenQuickfixWindow', { clear = true })
vim.api.nvim_create_autocmd({ 'QuickFixCmdPost' }, {
  group = opne_quickfix_window_augroup,
  pattern = '*grep*',
  command = 'cwindow'
})

-- plugins
local packer_local_path = vim.fn.stdpath('data') .. '/site/pack/packer/start/packer.nvim'
local packer_exists = pcall(function()
  local file = io.open(packer_local_path, 'r')
  io.close(file)
end)

if packer_exists then
  require('packer').startup(function()
    use 'wbthomason/packer.nvim'

    -- colorscheme
    use 'EdenEast/nightfox.nvim'

    -- utilities
    use 'windwp/nvim-autopairs'
    use { 'nvim-telescope/telescope.nvim', tag = '0.1.1', requires = { { 'nvim-lua/plenary.nvim' } } }
    use { 'phaazon/hop.nvim', branch = 'v2' }
    use 'nvim-tree/nvim-tree.lua'
    use 'kazhala/close-buffers.nvim'
    use 'tpope/vim-commentary'
    use 'tpope/vim-fugitive'
    use 'tpope/vim-sleuth'
    use 'kamykn/spelunker.vim'
    use 'github/copilot.vim'
    use 'lilydjwg/colorizer'

    -- snippets
    use 'hrsh7th/vim-vsnip'
    use 'rafamadriz/friendly-snippets'

    -- lsp
    use 'neovim/nvim-lspconfig'
    use 'williamboman/mason.nvim'
    use 'williamboman/mason-lspconfig.nvim'
    use 'jose-elias-alvarez/null-ls.nvim'
    -- use 'ray-x/lsp_signature.nvim'
    use 'folke/trouble.nvim'
    use 'onsails/lspkind.nvim'

    -- completion
    use 'hrsh7th/cmp-buffer'
    use 'hrsh7th/cmp-path'
    use 'hrsh7th/cmp-cmdline'
    use 'hrsh7th/cmp-vsnip'
    use 'hrsh7th/cmp-nvim-lsp'
    use 'hrsh7th/nvim-cmp'

    -- languages
    use 'pangloss/vim-javascript'
    use 'maxmellon/vim-jsx-pretty'
    use 'jose-elias-alvarez/typescript.nvim'
    use 'jparise/vim-graphql'
    use 'hashivim/vim-terraform'
    use 'dag/vim-fish'
  end)

  -- colorscheme
  vim.cmd.colorscheme('nordfox')

  -- telescope
  local telescope_actions = require('telescope.actions')
  require('telescope').setup {
    defaults = {
      file_ignore_patterns = {
        'node_modules',
        '.git',
      },
      mappings = {
        i = {
          ['<esc>'] = telescope_actions.close
        }
      }
    },
    pickers = {
      commands = { theme = 'dropdown' },
      command_history = { theme = 'dropdown' },
      find_files = {
        theme = 'dropdown',
        hidden = true,
      },
      git_files = { theme = 'dropdown' },
      buffers = {
        theme = 'dropdown',
        ignore_current_buffer = true,
        sort_lastused = true,
      },
      oldfiles = { theme = 'dropdown'
      },
      live_grep = {
        theme = 'dropdown',
        hidden = true
      },
      grep_string = { theme = 'dropdown' },
    }
  }

  -- nvim-tree
  vim.g.loaded_netrw = 1
  vim.g.loaded_netrwPlugin = 1
  require('nvim-tree').setup({
    renderer = {
      icons = {
        show = {
          file = false,
          folder = false,
          folder_arrow = true,
          git = true,
          modified = true,
        }
      }
    }
  })

  -- cmp
  local cmp = require('cmp')
  local lspkind = require('lspkind')

  cmp.setup({
    snippet = {
      expand = function(args)
        vim.fn['vsnip#anonymous'](args.body)
      end,
    },
    mapping = cmp.mapping.preset.insert({
      -- Note: it conflicts with copilot
      -- ['<Tab>'] = cmp.mapping(function(fallback)
      --   if cmp.visible() then
      --     cmp.select_next_item()
      --   else
      --     fallback()
      --   end
      -- end, { 'i', 's' }),
      -- ['<S-Tab>'] = cmp.mapping(function(fallback)
      --   if cmp.visible() then
      --     cmp.select_prev_item()
      --   else
      --     fallback()
      --   end
      -- end, { 'i', 's' }),
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

  -- lsp
  require('mason').setup()
  require('mason-lspconfig').setup_handlers({ function(server)
    require('lspconfig')[server].setup {
      capabilities = require('cmp_nvim_lsp').default_capabilities(),
    }
  end
  })

  -- https://github.com/neovim/nvim-lspconfig/wiki/UI-Customization
  vim.diagnostic.config({
    virtual_text = false,
    signs = true,
    underline = true,
    update_in_insert = false,
    severity_sort = true,
  })

  local signs = { Error = ' ', Warn = ' ', Hint = ' ', Info = ' ' }
  for type, icon in pairs(signs) do
    local hl = 'DiagnosticSign' .. type
    vim.fn.sign_define(hl, { text = icon, texthl = hl, numhl = hl })
  end

  -- local show_diagnostics_augroup = vim.api.nvim_create_augroup('UserShowDiagnostics', { clear = true })
  -- vim.api.nvim_create_autocmd({ 'CursorHold', 'CursorHoldI' }, {
  --   group = show_diagnostics_augroup,
  --   pattern = '*',
  --   callback = function() vim.diagnostic.open_float(nil, { focus = false }) end,
  -- })

  -- https://github.com/jose-elias-alvarez/null-ls.nvim/wiki/Avoiding-LSP-formatting-conflicts
  local null_ls = require('null-ls')

  local lsp_formatting = function(bufnr)
    vim.lsp.buf.format({
      filter = function(client)
        return client.name == 'null-ls'
      end,
      bufnr = bufnr,
    })
  end

  local lsp_formatting_augroup = vim.api.nvim_create_augroup('LspFormatting', { clear = true })

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
      if client.supports_method('textDocument/formatting') then
        vim.api.nvim_clear_autocmds({ group = lsp_formatting_augroup, buffer = bufnr })
        vim.api.nvim_create_autocmd('BufWritePre', {
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

  -- require('lsp_signature').setup()

  -- file types
  local file_type_augroup = vim.api.nvim_create_augroup('UserFileType', { clear = true })
  vim.api.nvim_create_autocmd({ 'BufNewFile', 'BufRead' }, {
    pattern = { '*.tsx', '*.jsx' },
    group = file_type_augroup,
    command = 'set filetype=typescriptreact'
  })

  -- etc.
  require('hop').setup()
  require('nvim-autopairs').setup()
  require('close_buffers').setup()

  require('typescript').setup({
    disable_commands = false,
  })

  vim.g.javascript_plugin_jsdoc = 1

  vim.cmd.highlight({ 'SpelunkerSpellBad', 'cterm=underline' })
  vim.cmd.highlight({ 'SpelunkerComplexOrCompoundWord', 'cterm=underline' })

  -- keymap with plugins
  vim.keymap.set('n', 's', ':<C-u>HopChar2<CR>')

  local telescope_builtin = require('telescope.builtin')
  vim.keymap.set('n', '<leader><leader>', telescope_builtin.commands, {})
  vim.keymap.set('n', '<leader>b', telescope_builtin.buffers, {})
  vim.keymap.set('n', '<leader>r', telescope_builtin.resume, {})

  -- file
  vim.keymap.set('n', '<leader>ff', telescope_builtin.find_files, {})
  vim.keymap.set('n', '<leader>fh', telescope_builtin.oldfiles, {})
  vim.keymap.set('n', '<leader>fg', telescope_builtin.git_files, {})
  vim.keymap.set('n', '<leader>fs', telescope_builtin.live_grep, {})
  vim.keymap.set('n', '<leader>fc', telescope_builtin.grep_string, {})
  vim.keymap.set('n', '<leader>ft', ':<C-u>NvimTreeFindFile<CR>')

  -- grep
  vim.keymap.set('n', '<leader>gc', ':<C-u>grep! <cword><CR>')
  vim.keymap.set('n', '<leader>gw', ":<C-u>grep! '\\b<cword>\\b'<CR>")

  -- lsp
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
  vim.keymap.set('n', '<leader>cp', ':<C-u>Trouble<CR>')

  -- spell
  vim.keymap.set('n', '<leader>st', '<Plug>(spelunker-toggle)')
  vim.keymap.set('n', '<leader>sn', '<Plug>(spelunker-jump-next)')
  vim.keymap.set('n', '<leader>sp', '<Plug>(spelunker-jump-next)')
  vim.keymap.set('n', '<leader>sl', '<Plug>(spelunker-correct-from-list)')
  vim.keymap.set('n', '<leader>sL', '<Plug>(spelunker-correct-all-from-list)')
  vim.keymap.set('n', '<leader>sg', '<Plug>(add-spelunker-good)')
  vim.keymap.set('n', '<leader>su', '<Plug>(undo-spelunker-good)')

  -- vsnip
  vim.cmd [[
  imap <expr> <Tab>   vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<Tab>'
  smap <expr> <Tab>   vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<Tab>'
  imap <expr> <S-Tab> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<S-Tab>'
  smap <expr> <S-Tab> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<S-Tab>'
  ]]
end
