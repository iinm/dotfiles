" --- Cheat Sheet
" open file            :e **/foo.sh
"                      :e %:h/
"                      :sp foo.sh (split)
"                      :vsp foo.sh (vsplit)
" motions              } (next paragraph)
"                      { (previous paragraph)
"                      C-f (next page)
"                      C-b (previous page)
" scroll               zz (center)
"                      zt (top)
"                      zb (bottom)
" search               /foo -> n (next) -> N (previous)
"                      * (next <cword>)
"                      % (previous <cword>)
" marks                :marks
"                      ma (set mark a)
"                      `a (jump to mark a)
"                      `` (jump to previous mark)
"                      :delmarks a (delete mark a)
"                      :delmarks! a (delete all marks)
" jumps                :jumps -> [N] Ctrl-o (older location) or Ctrl-i (newer location)
" recent files         :browse oldfiles
"                      :browse filter /foo.*/ oldfiles
" grep                 :grep! foo -> :cw
"                      :grep! foo % (current buffer)
"                      :grep! <cword> (cursor word)
"                      :grep! \b<cword>\b
" close buffers        :bd foo* -> Ctrl-a (close all matched)
"                      :%bd (close all) -> C-o (back to previous buffer)
" window               C-w C-w (next window)
"                      C-w -> o (close other windows)
"                      C-w -> = (equalize window size)
"                      C-w -> _
"                      C-w -> | (maximize)
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
" terminal             :terminal ls
"                      :terminal -> Ctrl-w -> N  (normal mode)
"                      :terminal -> Ctrl-w -> :  (command mode)
"                      :terminal -> Ctrl-w -> "" (paste)
" open path            gf (goto file), gx (xdg-open)

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
set ttimeoutlen=10
set backspace=indent,eol,start
set mouse=a
set ttymouse=sgr
set showcmd
set laststatus=2
set tabstop=8 expandtab shiftwidth=2 softtabstop=2
set grepprg=grep\ -n\ -H\ -R\ --exclude-dir\ '.git'\ $*\ .
if executable('rg')
  set grepprg=rg\ --vimgrep\ --hidden\ --glob\ '!.git'
endif

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

" --- Keymap
let mapleader = "\<Space>"

nnoremap / /\v
vnoremap / /\v
nnoremap <C-l> :nohlsearch<CR>
nnoremap <leader><leader> :<C-u>call Buffers()<CR>
nnoremap <Leader>w :<C-u>set wrap!<CR>
nnoremap <Leader>n :<C-u>set number!<CR>
vnoremap // y/\V<C-r>=escape(@",'/\')<CR><CR>

nnoremap [file] <Nop>
nmap <Leader>f [file]
nnoremap [file]h :<C-u>call MRU('<C-r>=substitute(getcwd(), '^.*/', '', '')<CR>')<CR>
nnoremap [file]H :<C-u>call MRU()<CR>
nnoremap [file]f :<C-u>terminal ++curwin find . -iname **<Left>
nnoremap [file]s :<C-u>grep! -i<Space>
nnoremap [file]e :<C-u>Explore <bar> /<C-r>=expand("%:t")<CR><CR>:nohlsearch<CR>
if executable('fd')
  nnoremap [file]f :<C-u>terminal ++curwin fd -H -i<Space>
endif

nnoremap [buffer] <Nop>
nmap <Leader>b [buffer]
nnoremap [buffer]b :<C-u>b #<CR>
nnoremap [buffer]d :<C-u>b #<CR>:bd #<CR>
nnoremap [buffer]o :<C-u>%bd<CR><C-o>:bd #<CR>

nnoremap [vim] <Nop>
nmap <Leader>v [vim]
nnoremap [vim]r :<C-u>source $MYVIMRC<CR>

function! Buffers() abort
  let l:cwd_name = substitute(getcwd(), '^.*/', '', '')
  let l:buffers = execute('ls')
  let l:buffers = substitute(l:buffers, '^\n', '', '')
  let l:buffers = substitute(l:buffers, '\v[^"]{-}/' . l:cwd_name . '/', '', 'g')
  enew
  setlocal buftype=nofile
  setlocal nobuflisted
  0put =l:buffers
  goto 1
  setlocal readonly
  syntax match Grey /\v[^"]+\// " directory
  syntax match Grey /\vline\s+\d+/ " line number
  syntax match Aqua /\v\s.?a\s/ " active
  syntax match Red /\v\+\s/ " modified
  nnoremap <buffer> <CR> :<C-u>b <C-r>=matchstr(getline('.'), '\v^\s+\d+')<CR><CR>:bw #<CR>
  nnoremap <buffer> dd :<C-u>bd <C-r>=matchstr(getline('.'), '\v^\s+\d+')<CR><CR>dd
  nnoremap <buffer> <Esc> :<C-u>bw<CR>
  nnoremap <buffer> <C-o> :<C-u>bw<CR>
endfunction

function! MRU(pattern='') abort
  let l:files = filter(
  \  deepcopy(v:oldfiles),
  \  {_, path -> a:pattern == '' || path =~ '\v' . a:pattern}
  \ )
  " omit current directory
  let l:files = map(
  \  l:files,
  \  {_, path -> substitute(expand(path), getcwd() . '/', '', '')}
  \ )
  enew
  setlocal buftype=nofile
  setlocal nobuflisted
  0put =files
  goto 1
  setlocal readonly
  syntax match Grey /\v^.+\// " directory
  nnoremap <buffer> <CR> :<C-u>e <C-r>=getline('.')<CR><CR><CR>:bw #<CR>
  nnoremap <buffer> <Esc> :<C-u>bw<CR>
  nnoremap <buffer> <C-o> :<C-u>bw<CR>
endfunction

augroup vimrc_file_finder
  autocmd!
  autocmd TerminalWinOpen !find*,!fd* setlocal nobuflisted
  autocmd TerminalWinOpen !find*,!fd* nnoremap <buffer> <CR> :<C-u>e <C-r>=getline('.')<CR><CR><CR>:bw #<CR>
  autocmd TerminalWinOpen !find*,!fd* nnoremap <buffer> <Esc> :<C-u>bw<CR>
  autocmd TerminalWinOpen !find*,!fd* nnoremap <buffer> <C-o> :<C-u>bw<CR>
augroup END

" --- etc.
augroup vimrc_quickfix
  autocmd!
  autocmd FileType qf setlocal nowrap
  autocmd QuickFixCmdPost *grep* cwindow
augroup END

augroup vimrc_indent
  autocmd!
  autocmd Filetype go setlocal tabstop=4 noexpandtab softtabstop=4 shiftwidth=4
augroup END

let g:markdown_fenced_languages = ['sh']

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
  let g:lsp_document_code_action_signs_enabled = 0
  let g:lsp_settings = {
  \  'efm-langserver': {'disabled': v:false}
  \ }

  function! s:on_lsp_buffer_enabled() abort
    if exists('+tagfunc') | setlocal tagfunc=lsp#tagfunc | endif
    autocmd! BufWritePre *.js,*.jsx,*.ts,*.tsx call execute('LspDocumentFormatSync --server=efm-langserver')
    call s:enable_lsp_keymap()
  endfunction

  augroup vimrc_lsp
    autocmd!
    autocmd User lsp_buffer_enabled call s:on_lsp_buffer_enabled()
  augroup END

  " spelunker
  highlight SpelunkerSpellBad cterm=underline
  highlight SpelunkerComplexOrCompoundWord cterm=underline

  " fugitive
  set statusline=%<%f\ %h%m%r%{FugitiveStatusline()}%=%-14.(%l,%c%V%)\ %P

  " --- File types
  augroup vimrc_filetypes_with_plugin
    autocmd!
    autocmd BufNewFile,BufRead *.tsx,*.jsx set filetype=typescriptreact
  augroup END

  " --- Plugin Keymap
  nnoremap s <Plug>(easymotion-overwin-f2)

  nnoremap [git] <Nop>
  nmap <Leader>g [git]
  nnoremap [git]g :<C-u>Git<CR>
  nnoremap [git]f :<C-u>Git fetch --prune<CR>
  nnoremap [git]c :<C-u>Git checkout<Space>
  nnoremap [git]p :<C-u>Git pull origin <C-r>=FugitiveHead()<CR><CR>
  nnoremap [git]P :<C-u>terminal git push origin <C-r>=FugitiveHead()<CR><Space>

  function! s:enable_lsp_keymap() abort
    nnoremap [code] <Nop>
    nmap <Leader>c [code]
    nnoremap <buffer> [code]t <plug>(lsp-type-definition)
    nnoremap <buffer> [code]r <plug>(lsp-references)
    nnoremap <buffer> [code]i <plug>(lsp-implementation)
    nnoremap <buffer> [code]a <plug>(lsp-code-action)
    nnoremap <buffer> [code]c <plug>(lsp-rename)
    nnoremap <buffer> [code]h <plug>(lsp-hover)
    nnoremap <buffer> [code]d <plug>(lsp-document-diagnostic)
    nnoremap <buffer> [code]e <plug>(lsp-next-error)
    nnoremap <buffer> [code]f <plug>(lsp-format)
  endfunction

  " asyncomplete
  inoremap <expr> <cr> pumvisible() ? asyncomplete#close_popup() : "\<cr>"

  " vsnip
  inoremap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  snoremap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  inoremap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'
  snoremap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'
endif " Plugins
