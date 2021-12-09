" --- Cheat Sheet
" open file            :e **/main.go
"                      :e %:h/
" jump                 :jumps -> [N] Ctrl-O (older location) or Ctrl-I (newer location)
" recent files         :browse oldfiles
"                      :browse filter /pattern/ oldfiles
" open path            gf (goto file), gx (xdg-open)
" grep current dir     :grep! hoge -> :cw
" grep current buffer  :grep! hoge %

set undofile
set ignorecase
set smartcase
set wildignore=.git,node_modules
set clipboard+=unnamedplus

" --- appearance
if $COLORTERM =~ 'truecolor\|24bit'
  set termguicolors
end
colorscheme desert

" --- indent
set tabstop=8 expandtab shiftwidth=2 softtabstop=2

augroup set_indent
  autocmd!
  autocmd Filetype go     setlocal tabstop=4 noexpandtab softtabstop=4 shiftwidth=4
  autocmd Filetype python setlocal tabstop=4 expandtab   softtabstop=4 shiftwidth=4
augroup END

" --- filetype
augroup set_filetype
  autocmd!
  autocmd BufNewFile,BufRead *.tsx,*.jsx set filetype=typescriptreact
  autocmd BufNewFile,BufRead *.json5 setfiletype javascript
  autocmd BufNewFile,BufRead Fastfile setfiletype ruby
augroup END

" --- utilities
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
let g:netrw_liststyle = 3  " tree style
let g:netrw_browse_split = 4
let g:netrw_altv = 1
let g:netrw_alto = 1
let g:netrw_winsize = 25

let g:markdown_fenced_languages = ['sh']

if executable('rg')
  set grepprg=rg\ --vimgrep\ --glob\ '!*~'\ --glob\ '!.git'
endif

" --- key map
let mapleader = "\<Space>"

" https://vim.fandom.com/wiki/Search_for_visually_selected_text
vnoremap // y/\V<C-r>=escape(@",'/\')<CR><CR>

nnoremap [file] <Nop>
nmap <Leader>f [file]
nnoremap [file]e :<C-u>Explore<CR>

nnoremap [jump] <Nop>
nmap <Leader>j [jump]
nnoremap [jump]j :<C-u>call GotoJump()<CR>

nnoremap [grep] <Nop>
nmap <Leader>g [grep]
nnoremap [grep]g :<C-u>grep! 
nnoremap [grep]c :grep! <cword><CR>
nnoremap [grep]w :grep! '\b<cword>\b'<CR>

" --- plugins
if filereadable(expand('~/.local/share/nvim/site/autoload/plug.vim'))

  call plug#begin(stdpath('data') . '/plugged')
  " colorscheme
  Plug 'chriskempson/base16-vim'

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
  Plug 'iamcco/markdown-preview.nvim', { 'do': 'cd app && npm install'  }
  Plug 'weirongxu/plantuml-previewer.vim' " requires Java, Graphviz
  Plug 'tyru/open-browser.vim' " required by plantuml-previewer.vim

  " completion & lsp
  Plug 'prabirshrestha/vim-lsp'
  Plug 'mattn/vim-lsp-settings'
  Plug 'prabirshrestha/asyncomplete.vim'
  Plug 'prabirshrestha/asyncomplete-lsp.vim'

  " snippets
  Plug 'hrsh7th/vim-vsnip'
  Plug 'hrsh7th/vim-vsnip-integ'
  Plug 'rafamadriz/friendly-snippets'

  " language
  Plug 'jparise/vim-graphql'
  Plug 'leafgarland/typescript-vim'
  Plug 'maxmellon/vim-jsx-pretty'
  Plug 'aklt/plantuml-syntax'
  Plug 'dag/vim-fish'

  call plug#end()

  " --- looks
  colorscheme base16-eighties

  " -- easymotion
  let g:EasyMotion_do_mapping = 0
  let g:EasyMotion_smartcase = 1

  " --- fzf
  let g:fzf_tags_command = 'ctags -R'
  let g:fzf_preview_window = ['right:40%:hidden', 'ctrl-/']

  " --- emmet
  autocmd FileType html,css,typescriptreact EmmetInstall

  " --- lsp
  " let g:lsp_diagnostics_enabled = 0
  let g:lsp_diagnostics_virtual_text_enabled = 0
  let g:lsp_document_highlight_enabled = 0

  " --- key map
  nnoremap <Leader><Leader> :<C-u>Commands<CR>

  " easymotion
  nmap s <Plug>(easymotion-overwin-f2)

  " preview quickfix
  autocmd FileType qf nnoremap <silent><buffer> p :PreviewQuickfix<CR>
  autocmd FileType qf nnoremap <silent><buffer> P :PreviewClose<CR>

  " asyncomplete
  inoremap <expr> <Tab>   pumvisible() ? "\<C-n>" : "\<Tab>"
  inoremap <expr> <S-Tab> pumvisible() ? "\<C-p>" : "\<S-Tab>"
  inoremap <expr> <cr>    pumvisible() ? asyncomplete#close_popup() : "\<cr>"

  " vsnip
  imap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  smap <expr> <C-f> vsnip#jumpable(1)  ? '<Plug>(vsnip-jump-next)' : '<C-f>'
  imap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'
  smap <expr> <C-b> vsnip#jumpable(-1) ? '<Plug>(vsnip-jump-prev)' : '<C-b>'

  nnoremap [file] <Nop>
  nmap <Leader>f [file]
  nnoremap [file]e :<C-u>Vexplore<CR>
  nnoremap [file]f :<C-u>Files<CR>
  nnoremap [file]h :<C-u>History<CR>
  nnoremap [file]g :<C-u>GitFiles<CR>

  nnoremap [buffer] <Nop>
  nmap <Leader>b [buffer]
  nnoremap [buffer]b :<C-u>Buffers<CR>
  nnoremap [buffer]o :<C-u>BufOnly<CR>

  nnoremap [grep] <Nop>
  nmap <Leader>g [grep]
  nnoremap [grep]g :<C-u>grep! 
  nnoremap [grep]c :grep! <cword><CR>
  nnoremap [grep]w :grep! '\b<cword>\b'<CR>
  nnoremap [grep]r :<C-u>Rg 

  nnoremap [jump] <Nop>
  nmap <Leader>j [jump]
  nnoremap [jump]j :<C-u>call GotoJump()<CR>

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
endif " plugins
