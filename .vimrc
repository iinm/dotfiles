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
set wildignore+=.git/,node_modules/
set clipboard=unnamed,unnamedplus,autoselect
set timeoutlen=500
set ttimeoutlen=10
set backspace=indent,eol,start
set mouse=a
set ttymouse=sgr
set showcmd

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
  autocmd Filetype go setlocal tabstop=4 noexpandtab softtabstop=4 shiftwidth=4
augroup END

" --- etc.
set grepprg=grep\ -n\ -H\ -R\ --exclude-dir\ '.git'\ $*\ .
if executable('rg')
  set grepprg=rg\ --vimgrep\ --hidden\ --glob\ '!.git'
endif

augroup vimrc_quickfix
  autocmd!
  autocmd FileType qf setlocal nowrap
  autocmd QuickFixCmdPost *grep* cwindow
augroup END

let g:markdown_fenced_languages = ['sh']

" --- Keymap
let mapleader = "\<Space>"

nnoremap <C-l> :nohlsearch<CR>
nnoremap <leader><leader> :<C-u>buffers<CR>:b<Space>
nnoremap <Leader>w :<C-u>set wrap!<CR>

nnoremap [file] <Nop>
nmap <Leader>f [file]
nnoremap [file]f :<C-u>terminal ++curwin find . -iname *
if executable('fd')
  nnoremap [file]f :<C-u>terminal ++curwin fd --hidden --ignore-case<Space>
endif
nnoremap [file]h :<C-u>browse oldfiles<CR>
nnoremap [file]H :<C-u>browse filter /<C-r>=substitute(getcwd(), '^.*/', '', '')<CR>\/.*/ oldfiles<CR>
nnoremap [file]s :<C-u>grep! -i<Space>
nnoremap [file]e :<C-u>Explore <bar> /<C-r>=expand("%:t")<CR><CR> <bar> :nohlsearch<CR>

nnoremap [buffer] <Nop>
nmap <Leader>b [buffer]
nnoremap [buffer]b :<C-u>b #<CR>
" close all buffers except current buffer (close all -> back to last position -> close empty)
nnoremap [buffer]o :<C-u>%bd<CR><C-o>:bd #<CR>
" close all terminal buffers
nnoremap [buffer]c :<C-u>bd !*<C-a><CR>

" --- Plugins
if filereadable(expand('~/.vim/autoload/plug.vim'))
  call plug#begin()
  " colorscheme
  Plug 'sainnhe/everforest'

  " utilities
  Plug 'easymotion/vim-easymotion'
  Plug 'tpope/vim-commentary'
  Plug 'tpope/vim-fugitive'
  Plug 'tpope/vim-sleuth'
  Plug 'kamykn/spelunker.vim'
  Plug 'github/copilot.vim'

  " lsp
  Plug 'prabirshrestha/vim-lsp'
  Plug 'mattn/vim-lsp-settings'

  " completion
  Plug 'prabirshrestha/asyncomplete.vim'
  Plug 'prabirshrestha/asyncomplete-lsp.vim'

  " snippets
  Plug 'hrsh7th/vim-vsnip'
  Plug 'hrsh7th/vim-vsnip-integ'
  Plug 'rafamadriz/friendly-snippets'

  " languages
  Plug 'pangloss/vim-javascript'
  Plug 'maxmellon/vim-jsx-pretty'
  Plug 'jparise/vim-graphql'
  Plug 'hashivim/vim-terraform'
  Plug 'dag/vim-fish'
  call plug#end()

  " colorscheme
  let g:everforest_background = 'soft'
  set background=dark
  colorscheme everforest

  " easymotion
  let g:EasyMotion_do_mapping = 0
  let g:EasyMotion_smartcase = 1

  " javascript
  let g:javascript_plugin_jsdoc = 1

  " lsp
  let g:lsp_diagnostics_virtual_text_enabled = 0
  let g:lsp_diagnostics_echo_cursor = 1
  let g:lsp_settings = {
      \ 'efm-langserver': {'disabled': v:false}
  \ }

  augroup vimrc_format_on_save
    autocmd!
    autocmd BufWritePre *.js,*.jsx,*.ts,*.tsx call execute('LspDocumentFormatSync --server=efm-langserver')
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
  inoremap <expr> <cr> pumvisible() ? asyncomplete#close_popup() : "\<cr>"

  " vsnip
  inoremap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  snoremap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  inoremap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'
  snoremap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'
endif " Plugins
