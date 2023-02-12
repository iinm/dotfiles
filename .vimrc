" --- Cheat Sheet
" open file            :e **/main.go
"                      :e %:h/
" recent files         :browse oldfiles
"                      :browse filter /hoge.*/ oldfiles
" jump                 :jumps -> [N] Ctrl-o (older location) or Ctrl-i (newer location)
" grep                 :grep! foo -> :cw
"                      :grep! foo % (current buffer)
"                      :grep! <cword> (cursor word)
"                      :grep! \b<cword>\b
" close buffers        :bd foo* -> Ctrl-a
" close other window   Ctrl-w -> o
" browse file          :e .
"                      :e . -> i -> i -> i (tree view)
"                      :e . -> p (preview)
"                      :e . -> d (make directory)
"                      :e . -> % (new file)
"                      :e . -> D (delete)
"                      :e . -> R (rename)
"                      :e . -> mt (mark target) -> mf (markfile) -> mm (move)
"                      :e . -> mt (mark target) -> mf (markfile) -> mc (copy)
"                      :e . -> mu (unmark all)
" open path            gf (goto file), gx (xdg-open)
" next <cword>         *
" previous <cword>     %

if !isdirectory(expand("~/.vim/undodir"))
  call mkdir(expand("~/.vim/undodir"), 'p')
endif

" --- Options
set encoding=utf-8 
set hidden
set nobackup
set noswapfile
set undodir=~/.vim/undodir
set undofile
set history=10000
set incsearch
set hlsearch
set ignorecase
set smartcase
set wildmenu
set wildmode=longest,full
set wildoptions=pum
set wildignore+=*/.git/*,*/tmp/*,*.swp
set clipboard=unnamed,unnamedplus,autoselect
set ttimeoutlen=10
set backspace=indent,eol,start
set mouse=a
set ttymouse=sgr

" --- Appearance
set termguicolors
syntax enable

" cursor
let &t_SI = "\<Esc>[6 q"
let &t_SR = "\<Esc>[4 q"
let &t_EI = "\<Esc>[2 q"

" italic
let &t_ZH="\<Esc>[3m"
let &t_ZR="\<Esc>[23m"

" undercurl
let &t_Cs = "\<Esc>[4:3m"
let &t_Ce = "\<Esc>[4:0m"

" --- Indent
set tabstop=8 expandtab shiftwidth=2 softtabstop=2

augroup vimrc_indent
  autocmd!
  autocmd Filetype go     setlocal tabstop=4 noexpandtab softtabstop=4 shiftwidth=4
augroup END

" --- etc.
if executable('rg')
  set grepprg=rg\ --vimgrep\ --hidden\ --glob\ '!.git'
endif

augroup vimrc_quickfix
  autocmd!
  autocmd FileType qf setlocal nowrap
  autocmd QuickFixCmdPost *grep* cwindow
augroup END

let g:markdown_fenced_languages = ['sh', 'plantuml']

" --- Keymap
nnoremap <C-l> :nohlsearch<CR>
" https://vim.fandom.com/wiki/Search_for_visually_selected_text
vnoremap // y/\V<C-r>=escape(@",'/\')<CR><CR>

let mapleader = "\<Space>"

nnoremap <Leader>w :<C-u>set wrap!<CR>

nnoremap [file] <Nop>
nmap <Leader>f [file]
nnoremap [file]f :<C-u>terminal fd --hidden --ignore-case<Space>
nnoremap [file]h :<C-u>browse oldfiles<CR>
nnoremap [file]H :<C-u>browse filter /<C-R>=substitute(getcwd(), '^.*/', '', '')<CR>.*/ oldfiles<CR>
nnoremap [file]s :<C-u>grep!<Space>
" https://vi.stackexchange.com/questions/20307/find-and-highlight-current-file-in-netrw
nnoremap [file]e :<C-u>Explore <bar> :sil! /<C-R>=expand("%:t")<CR><CR> <bar> :nohlsearch<CR>

nnoremap [buffer] <Nop>
nmap <Leader>b [buffer]
nnoremap [buffer]b :<C-u>ls<CR>:b<Space>
nnoremap [buffer]l :<C-u>b #<CR>
nnoremap [buffer]dt :<C-u>bd !*<C-a><CR>

" --- Plugins
if filereadable(expand('~/.vim/autoload/plug.vim'))
  call plug#begin()
  " colorscheme
  Plug 'sainnhe/everforest'

  " utilities
  Plug 'easymotion/vim-easymotion'
  Plug 'tpope/vim-commentary'
  Plug 'tpope/vim-sleuth'
  Plug 'tpope/vim-fugitive'
  Plug 'tpope/vim-surround'
  Plug 'jiangmiao/auto-pairs'
  Plug 'mattn/emmet-vim'
  Plug 'kamykn/spelunker.vim'
  Plug 'markonm/traces.vim'
  Plug 'vim-scripts/BufOnly.vim'
  Plug 'lilydjwg/colorizer'
  Plug 'godlygeek/tabular'
  Plug 'iamcco/markdown-preview.nvim', { 'do': { -> mkdp#util#install() }, 'for': ['markdown', 'vim-plug']}

  " completion, lsp
  Plug 'prabirshrestha/vim-lsp'
  Plug 'mattn/vim-lsp-settings'
  Plug 'prabirshrestha/asyncomplete.vim'
  Plug 'prabirshrestha/asyncomplete-lsp.vim'
  Plug 'prabirshrestha/asyncomplete-buffer.vim'
  Plug 'prabirshrestha/asyncomplete-file.vim'
  Plug 'github/copilot.vim'

  " snippets
  Plug 'hrsh7th/vim-vsnip'
  Plug 'hrsh7th/vim-vsnip-integ'
  Plug 'rafamadriz/friendly-snippets'

  " languages
  Plug 'pangloss/vim-javascript'
  Plug 'jparise/vim-graphql'
  Plug 'maxmellon/vim-jsx-pretty'
  Plug 'hashivim/vim-terraform'
  Plug 'dag/vim-fish'
  Plug 'aklt/plantuml-syntax'
  call plug#end()

  " colorscheme
  let g:everforest_background = 'soft'
  set background=dark
  colorscheme everforest

  " easymotion
  let g:EasyMotion_do_mapping = 0
  let g:EasyMotion_smartcase = 1

  " auto-pairs
  " https://github.com/jiangmiao/auto-pairs/issues/104
  let g:AutoPairsMultilineClose = 0
  let g:AutoPairsFlyMode = 0

  " emmet
  augroup vimrc_emmet
    autocmd!
    autocmd FileType html,css,typescriptreact EmmetInstall
  augroup END

  " javascript
  let g:javascript_plugin_jsdoc = 1

  " asyncomplete
  augroup vimrc_asyncomplete
    autocmd!
    autocmd User asyncomplete_setup call asyncomplete#register_source(asyncomplete#sources#buffer#get_source_options({
        \ 'name': 'buffer',
        \ 'allowlist': ['*'],
        \ 'completor': function('asyncomplete#sources#buffer#completor'),
        \ 'config': {
        \    'max_buffer_size': 5000000,
        \  },
    \ }))
    autocmd User asyncomplete_setup call asyncomplete#register_source(asyncomplete#sources#file#get_source_options({
        \ 'name': 'file',
        \ 'allowlist': ['*'],
        \ 'priority': 10,
        \ 'completor': function('asyncomplete#sources#file#completor')
    \ }))
  augroup END

  " lsp
  let g:lsp_diagnostics_virtual_text_enabled = 0
  let g:lsp_diagnostics_echo_cursor = 1
  let g:lsp_diagnostics_signs_delay = 200

  " https://github.com/mattn/vim-lsp-settings
  let g:lsp_settings = {
      \ 'efm-langserver': {'disabled': v:false}
  \ }

  augroup vimrc_format_on_save
    autocmd!
    autocmd BufWritePre *.js,*.jsx call execute('LspDocumentFormatSync --server=efm-langserver')
    autocmd BufWritePre *.ts,*.tsx call execute('LspDocumentFormatSync --server=efm-langserver')
  augroup END

  " spelunker
  highlight SpelunkerSpellBad cterm=underline
  highlight SpelunkerComplexOrCompoundWord cterm=underline

  " --- File types
  augroup vimrc_filetypes
    autocmd!
    autocmd BufNewFile,BufRead *.tsx,*.jsx set filetype=typescriptreact
  augroup END

  " --- Plugin Keymap
  nnoremap s <Plug>(easymotion-overwin-f2)

  nnoremap [buffer]o :<C-u>BufOnly<CR>

  nnoremap [code] <Nop>
  nmap <Leader>c [code]
  nnoremap [code]j :<C-u>LspDefinition<CR>
  nnoremap [code]t :<C-u>LspTypeDefinition<CR>
  nnoremap [code]r :<C-u>LspReferences<CR>
  nnoremap [code]i :<C-u>LspImplementation<CR>
  nnoremap [code]a :<C-u>LspCodeAction<CR>
  nnoremap [code]n :<C-u>LspRename<CR>
  nnoremap [code]h :<C-u>LspHover<CR>
  nnoremap [code]s :<C-u>LspSignatureHelp<CR>
  nnoremap [code]d :<C-u>LspDocumentDiagnostics<CR>
  nnoremap [code]e :<C-u>LspNextError<CR>
  nnoremap [code]f :<C-u>LspDocumentFormat<CR>

  " asyncomplete
  inoremap <expr> <Tab>   pumvisible() ? "\<C-n>" : "\<Tab>"
  inoremap <expr> <S-Tab> pumvisible() ? "\<C-p>" : "\<S-Tab>"
  inoremap <expr> <cr>    pumvisible() ? asyncomplete#close_popup() : "\<cr>"

  " vsnip
  inoremap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  snoremap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  inoremap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'
  snoremap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'
endif " Plugins
