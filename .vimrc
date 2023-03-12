" --- Cheat Sheet
" start                vim -u NONE (no plugins)
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
" command              :foo
"                      :foo <C-r>" (paste from register)
" replace              :%s/foo/bar/g
"                      :%s/<C-r>/bar/g (replace last search)
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
"                      C-w -> c (close)
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
" quickfix             :cw(indow) (open quickfix window)
"                      :colder (older quickfix list)
"                      :cnewer (newer quickfix list)
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
set wildoptions=fuzzy,pum
set wildignore=.git/,node_modules/
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
set cursorline
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
nnoremap <Leader>w :<C-u>set wrap!<CR>
nnoremap <Leader>n :<C-u>set number!<CR>
vnoremap // y/\V<C-r>=escape(@",'/\')<CR><CR>
nnoremap <leader>f :<C-u>terminal ++curwin find . -iname **<Left>
if executable('fd')
  nnoremap <leader>f :<C-u>terminal ++curwin fd -H -i<Space>
endif
nnoremap <leader>b :<C-u>Buffers<CR>
nnoremap gO :<C-u>Outline<CR>
nnoremap <C-w>m <C-w>_<C-w><bar>

nnoremap [vim] <Nop>
nmap <Leader>v [vim]
nnoremap [vim]r :<C-u>source $MYVIMRC<CR>

" --- Command
command -nargs=0 Buffers call Buffers()
command -nargs=0 BD call BufferDelete()
command -nargs=0 BOnly call BufferOnly()
command -nargs=0 Oldfiles call Oldfiles()
command -nargs=0 OldfilesLocal call Oldfiles('\v^' .. getcwd())
command -nargs=0 Outline call Outline()

" --- Function
function! BufferDelete() abort
  execute('b # | bd #')
endfunction

function! BufferOnly() abort
  execute('%bd | e # | bd #')
endfunction

function! Buffers() abort
  let l:cwd_name = substitute(getcwd(), '^.*/', '', '')
  let l:buffers = execute('ls')
  let l:buffers = substitute(l:buffers, '^\n', '', '')
  let l:buffers = substitute(l:buffers, '\v[^"]{-}/' .. l:cwd_name .. '/', '', 'g')
  enew
  setlocal buftype=nofile
  setlocal nobuflisted
  setlocal bufhidden=wipe
  0put =l:buffers
  syntax match Grey /\v[^"]+\// " directory
  syntax match Grey /\vline\s+\d+/ " line number
  syntax match Aqua /\v\s.?a\s/ " active
  syntax match Red /\v\+\s/ " modified
  nnoremap <buffer> <CR> :<C-u>b <C-r>=matchstr(getline('.'), '\v^\s+\d+')<CR><CR>
  nnoremap <buffer> dd :<C-u>bd <C-r>=matchstr(getline('.'), '\v^\s+\d+')<CR><CR>dd
  nnoremap <buffer> <Esc> :<C-u>b #<CR>
  nnoremap <buffer> <C-o> :<C-u>b #<CR>
endfunction

function! Oldfiles(pattern='') abort
  let l:files = filter(
  \  deepcopy(v:oldfiles),
  \  {_, path -> a:pattern == '' || expand(path) =~ a:pattern}
  \ )
  " omit current directory
  let l:files = map(
  \  l:files,
  \  {_, path -> substitute(expand(path), getcwd() .. '/', '', '')}
  \ )
  enew
  setlocal buftype=nofile
  setlocal nobuflisted
  setlocal bufhidden=wipe
  0put =l:files
  goto 1
  setlocal readonly
  syntax match Grey /\v^.+\// " directory
  nnoremap <buffer> <CR> :<C-u>e <C-r>=getline('.')<CR><CR>
  nnoremap <buffer> <Esc> :<C-u>b #<CR>
  nnoremap <buffer> <C-o> :<C-u>b #<CR>
endfunction

function! Outline() abort
  let l:filetype = &filetype

  if l:filetype == 'typescript'
    if expand('%') =~ '\.test\.ts$'
      vimgrep /\v^\s*(describe|beforeAll|afterAll|beforeEach|afterEach|it[^\w]|")/j %
    else
      vimgrep /\v^(export\s+)?(function|interface|type|enum|const)/j %
    endif
  else
    echom 'Not supported for ' .. l:filetype
    return
  endif

  call setqflist([], 'r', {'title': 'Outline'})
  syntax match ConcealedDetails /\v^[^|]*\|[^|]*\| / conceal
  setlocal conceallevel=2
  setlocal concealcursor=nvic
endfunction

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

" https://vim.fandom.com/wiki/Fix_syntax_highlighting
augroup vimrc_fix_syntax_highlighting
  autocmd!
  autocmd BufEnter,InsertLeave * :syntax sync fromstart
augroup END

augroup vimrc_file_finder
  autocmd!
  autocmd TerminalWinOpen !find*,!fd* call s:on_file_finder_open()
augroup END

function! s:on_file_finder_open() abort
  setlocal nobuflisted
  nnoremap <buffer> <CR> :<C-u>e <C-r>=getline('.')<CR><CR><CR>:bw #<CR>:nohlsearch<CR>
  nnoremap <buffer> <Esc> :<C-u>b #<CR>:bw<CR>
  nnoremap <buffer> <C-o> :<C-u>b #<CR>:bw<CR>
endfunction

let g:markdown_fenced_languages = ['sh']

" --- Plugins
if filereadable(expand('~/.vim/autoload/plug.vim'))
  call plug#begin()
  " colorscheme
  Plug 'sainnhe/everforest'

  " utilities
  Plug 'ctrlpvim/ctrlp.vim'
  Plug 'easymotion/vim-easymotion'
  Plug 'tpope/vim-commentary'
  Plug 'tpope/vim-fugitive'
  Plug 'tpope/vim-sleuth'
  Plug 'mattn/vim-maketable'
  Plug 'mattn/emmet-vim'
  Plug 'mattn/vim-molder'
  Plug 'kamykn/spelunker.vim'
  Plug 'previm/previm'
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

  " appearance
  let g:everforest_background = 'soft'
  set background=dark
  colorscheme everforest

  set statusline=%<%f\ %h%m%r%{FugitiveStatusline()}%=%-14.(%l,%c%V%)\ %P

  " spelunker
  highlight SpelunkerSpellBad cterm=underline
  highlight SpelunkerComplexOrCompoundWord cterm=underline

  " ctrlp
  let g:ctrlp_user_command = 'fd --hidden --exclude .git --type f --color=never "" %s'
  let g:ctrlp_use_caching = 0
  let g:ctrlp_mruf_relative = 1

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

  " previm
  let g:previm_open_cmd = 'open -a "Google Chrome"'

  " --- File types
  augroup vimrc_filetypes_with_plugin
    autocmd!
    autocmd BufNewFile,BufRead *.tsx,*.jsx set filetype=typescriptreact
  augroup END

  " --- Plugin Keymap
  nnoremap s <Plug>(easymotion-overwin-f2)

  nnoremap <leader>f :<C-u>CtrlPMixed<CR>

  nnoremap [git] <Nop>
  nmap <Leader>g [git]
  nnoremap [git]f :<C-u>Git fetch --prune<CR>
  nnoremap [git]c :<C-u>Git checkout<Space>
  nnoremap [git]p :<C-u>Git pull origin <C-r>=FugitiveHead()<CR><CR>
  nnoremap [git]P :<C-u>terminal git push origin <C-r>=FugitiveHead()<CR><Space>
  nnoremap [git]b :<C-u>Git blame<CR>

  function! s:enable_lsp_keymap() abort
    nnoremap <buffer> <leader>a <plug>(lsp-code-action)
    nnoremap <buffer> gd <plug>(lsp-definition)
    nnoremap <buffer> gt <plug>(lsp-type-definition)
    nnoremap <buffer> gr <plug>(lsp-references)
    nnoremap <buffer> gi <plug>(lsp-implementation)
    nnoremap <buffer> [g <plug>(lsp-previous-diagnostic)
    nnoremap <buffer> ]g <plug>(lsp-next-diagnostic)
    nnoremap <buffer> K <plug>(lsp-hover)
  endfunction

  " asyncomplete
  inoremap <expr> <cr> pumvisible() ? asyncomplete#close_popup() : "\<cr>"

  " vsnip
  inoremap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  snoremap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  inoremap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'
  snoremap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'
endif " Plugins

" --- Local configuration
if filereadable(expand('~/.local.vimrc'))
  source ~/.local.vimrc
endif
