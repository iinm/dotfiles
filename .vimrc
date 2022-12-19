" --- Cheat Sheet
" open file            :e **/main.go
"                      :e %:h/
" jump                 :jumps -> [N] Ctrl-O (older location) or Ctrl-I (newer location)
" recent files         :browse oldfiles
"                      :browse filter /pattern/ oldfiles
" open path            gf (goto file), gx (xdg-open)
" grep current dir     :grep! hoge -> :cw
" grep current buffer  :grep! hoge %

" --- Options
set hidden
set undofile
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
if has('mouse_sgr')
  set ttymouse=sgr
endif

" --- Appearance
set number
if has('termguicolors')
  set termguicolors
endif
if has('syntax') && !exists('g:syntax_on')
  syntax enable
endif

" cursor
let &t_SI = "\<Esc>[6 q"
let &t_SR = "\<Esc>[4 q"
let &t_EI = "\<Esc>[2 q"

" italic
let &t_ZH="\<Esc>[3m"
let &t_ZR="\<Esc>[23m"

" undercurl
let &t_Cs = "\e[4:3m"
let &t_Ce = "\e[4:0m"

" --- Indent
set tabstop=8 expandtab shiftwidth=2 softtabstop=2

augroup set_indent
  autocmd!
  autocmd Filetype go     setlocal tabstop=4 noexpandtab softtabstop=4 shiftwidth=4
  autocmd Filetype python setlocal tabstop=4 expandtab   softtabstop=4 shiftwidth=4
augroup END

" --- File types
augroup set_filetype
  autocmd!
  autocmd BufNewFile,BufRead *.tsx,*.jsx set filetype=typescriptreact
  autocmd BufNewFile,BufRead *.json5 setfiletype javascript
  autocmd BufNewFile,BufRead Fastfile setfiletype ruby
augroup END

" --- Utilities
" http://vim.wikia.com/wiki/Jumping_to_previously_visited_locations
function! GotoJump()
  jumps
  let j = input("Select your jump: ")
  if j != ''
    let pattern = '\v\c^\+'
    if j =~ pattern
      let j = substitute(j, pattern, '', 'g')
      execute "normal " . j . "\<c-i>"
    else
      execute "normal " . j . "\<c-o>"
    endif
  endif
endfunction

" https://vim.fandom.com/wiki/Automatically_fittig_a_quickfix_window_height
function! AdjustWindowHeight(minheight, maxheight)
  exe max([min([line("$"), a:maxheight]), a:minheight]) . "wincmd _"
endfunction

augroup set_quickfix_window_size
  autocmd!
  autocmd FileType qf call AdjustWindowHeight(3, 15)
  autocmd FileType qf setlocal nowrap
  autocmd QuickFixCmdPost *grep* cwindow
augroup END

" --- etc.
let g:netrw_banner = 0
let g:netrw_liststyle = 3 " tree style
let g:netrw_winsize = 25 " %

let g:markdown_fenced_languages = ['sh']

if executable('rg')
  set grepprg=rg\ --vimgrep\ --glob\ '!*~'\ --glob\ '!.git'
endif

" --- Keymap
let mapleader = "\<Space>"

nnoremap <C-l> :nohlsearch<CR>
nnoremap <Leader>w :<C-u>set wrap!<CR>
nnoremap <Leader>j :<C-u>call GotoJump()<CR>
" https://vim.fandom.com/wiki/Search_for_visually_selected_text
vnoremap // y/\V<C-r>=escape(@",'/\')<CR><CR>

nnoremap [file] <Nop>
nmap <Leader>f [file]
nnoremap [file]e :<C-u>Lexplore!<CR>
nnoremap [file]t :<C-u>Lexplore! %:h<CR><CR>

nnoremap [grep] <Nop>
nmap <Leader>g [grep]
nnoremap [grep]g :<C-u>grep! 
nnoremap [grep]c :grep! <cword><CR>
nnoremap [grep]w :grep! '\b<cword>\b'<CR>

" --- Plugins
if filereadable(expand('~/.vim/autoload/plug.vim'))
  call plug#begin()
  " colorscheme
  Plug 'sainnhe/everforest'

  " utilities
  Plug 'easymotion/vim-easymotion'
  Plug 'junegunn/fzf'
  Plug 'junegunn/fzf.vim'
  Plug 'tpope/vim-commentary'
  Plug 'jiangmiao/auto-pairs'
  Plug 'godlygeek/tabular'
  Plug 'mattn/emmet-vim'
  Plug 'skywind3000/vim-preview'
  Plug 'vim-scripts/BufOnly.vim'
  Plug 'tpope/vim-sleuth'
  Plug 'tpope/vim-fugitive'
  Plug 'tpope/vim-surround'
  Plug 'kamykn/spelunker.vim'
  Plug 'markonm/traces.vim'

  " completion, lsp
  Plug 'prabirshrestha/vim-lsp'
  Plug 'mattn/vim-lsp-settings'
  Plug 'prabirshrestha/asyncomplete.vim'
  Plug 'prabirshrestha/asyncomplete-lsp.vim'
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

  " debugger
  Plug 'puremourning/vimspector'
  call plug#end()

  " colorscheme
  set background=dark
  colorscheme everforest

  " easymotion
  let g:EasyMotion_do_mapping = 0
  let g:EasyMotion_smartcase = 1

  " fzf
  let g:fzf_tags_command = 'ctags -R'
  let g:fzf_preview_window = ['right:40%:hidden', 'ctrl-/']

  " emmet
  autocmd FileType html,css,typescriptreact EmmetInstall

  " javascript
  let g:javascript_plugin_jsdoc = 1

  " lsp
  let g:lsp_settings = {
  \  'efm-langserver': {'disabled': v:false}
  \}
  let g:lsp_diagnostics_highlights_enabled = 0
  let g:lsp_diagnostics_echo_cursor = 1
  " let g:lsp_diagnostics_float_cursor = 1
  " highlight LspErrorHighlight gui=underline

  " format on save
  augroup format_on_save
    autocmd!
    autocmd BufWritePre *.js,*.jsx call execute('LspDocumentFormatSync --server=efm-langserver')
    autocmd BufWritePre *.ts,*.tsx call execute('LspDocumentFormatSync --server=efm-langserver')
  augroup END

  " vimspector
  " https://github.com/puremourning/vimspector#human-mode
  let g:vimspector_enable_mappings = 'HUMAN'
  let g:vimspector_bottombar_height = 2

  " spelunker
  highlight SpelunkerSpellBad cterm=underline
  highlight SpelunkerComplexOrCompoundWord cterm=underline

  " --- Plugin Keymap
  nnoremap <Leader><Leader> :<C-u>Commands<CR>

  " easymotion
  nnoremap s <Plug>(easymotion-overwin-f2)

  " preview quickfix
  augroup preview_quickfix
    autocmd!
    autocmd FileType qf nnoremap <silent><buffer> p :PreviewQuickfix<CR>
    autocmd FileType qf nnoremap <silent><buffer> P :PreviewClose<CR>
  augroup END

  " asyncomplete
  inoremap <expr> <Tab>   pumvisible() ? "\<C-n>" : "\<Tab>"
  inoremap <expr> <S-Tab> pumvisible() ? "\<C-p>" : "\<S-Tab>"
  inoremap <expr> <cr>    pumvisible() ? asyncomplete#close_popup() : "\<cr>"

  " vsnip
  inoremap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  snoremap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  inoremap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'
  snoremap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'

  nnoremap <Leader>b :<C-u>Buffers<CR>

  nnoremap [file] <Nop>
  nmap <Leader>f [file]
  nnoremap [file]f :<C-u>Files<CR>
  nnoremap [file]h :<C-u>History<CR>
  nnoremap [file]g :<C-u>GitFiles<CR>

  nnoremap [grep] <Nop>
  nmap <Leader>g [grep]
  nnoremap [grep]r :<C-u>Rg 

  nnoremap [spell] <Nop>
  nmap <Leader>s [spell]
  nnoremap [spell]t <Plug>(spelunker-toggle)
  nnoremap [spell]l <Plug>(spelunker-correct-from-list)
  nnoremap [spell]L <Plug>(spelunker-correct-all-from-list)
  nnoremap [spell]f <Plug>(spelunker-correct)
  nnoremap [spell]F <Plug>(spelunker-correct-all)

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

  nnoremap [debug] <Nop>
  nmap <Leader>d [debug]
  nnoremap [debug]b :<C-u>VimspectorBreakpoints<CR>
  nnoremap [debug]r :<C-u>VimspectorReset<CR>
endif " Plugins
