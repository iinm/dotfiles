set hidden
set nobackup
set undofile
set ignorecase
set smartcase
set wildignore=*~,*.swp,.git,*.class,*.o,*.pyc,node_modules
set clipboard+=unnamedplus
set termguicolors


" --- looks
colorscheme desert
let g:netrw_liststyle = 3  " tree style
let g:markdown_fenced_languages = ['sh']


" --- indent
augroup config_indent
  autocmd!
  autocmd Filetype go             setlocal noexpandtab tabstop=4 softtabstop=4 shiftwidth=4
  autocmd Filetype python         setlocal expandtab   tabstop=4 softtabstop=4 shiftwidth=4
  autocmd Filetype java,groovy    setlocal expandtab   tabstop=4 softtabstop=4 shiftwidth=4
  autocmd Filetype scala          setlocal expandtab   tabstop=2 softtabstop=2 shiftwidth=2
  autocmd Filetype sh,zsh         setlocal expandtab   tabstop=2 softtabstop=2 shiftwidth=2
  autocmd Filetype vim            setlocal expandtab   tabstop=2 softtabstop=2 shiftwidth=2
  autocmd Filetype xml,html,css   setlocal expandtab   tabstop=2 softtabstop=2 shiftwidth=2
  autocmd Filetype css            setlocal expandtab   tabstop=2 softtabstop=2 shiftwidth=2
  autocmd Filetype javascript     setlocal expandtab   tabstop=2 softtabstop=2 shiftwidth=2
  autocmd Filetype typescript     setlocal expandtab   tabstop=2 softtabstop=2 shiftwidth=2
  autocmd Filetype php            setlocal expandtab   tabstop=2 softtabstop=2 shiftwidth=2
  autocmd Filetype json,yaml      setlocal expandtab   tabstop=2 softtabstop=2 shiftwidth=2
  autocmd Filetype sql            setlocal expandtab   tabstop=2 softtabstop=2 shiftwidth=2
  autocmd Filetype markdown       setlocal expandtab   tabstop=2 softtabstop=2 shiftwidth=2
  autocmd Filetype plantuml       setlocal expandtab   tabstop=2 softtabstop=2 shiftwidth=2
  autocmd Filetype tf             setlocal expandtab   tabstop=2 softtabstop=2 shiftwidth=2
augroup END

augroup detect_filetyle
  autocmd!
  autocmd BufNewFile,BufRead *.json5 setfiletype javascript
  autocmd BufNewFile,BufRead Fastfile setfiletype ruby
  autocmd BufNewFile,BufRead *.tsx,*.jsx set filetype=typescriptreact
augroup END


" --- highlight keywords
augroup highlight_todostate
  autocmd!
  autocmd WinEnter,BufRead,BufNew,Syntax * :silent! call matchadd('MyTodo', 'TODO:')
  autocmd WinEnter,BufRead,BufNew,Syntax * :silent! call matchadd('MyWip',  'WIP:')
  autocmd WinEnter,BufRead,BufNew,Syntax * :silent! call matchadd('MyDone', 'DONE:')
  autocmd WinEnter,BufRead,BufNew,Syntax * highlight MyTodo guibg=LightRed    guifg=Black
  autocmd WinEnter,BufRead,BufNew,Syntax * highlight MyWip  guibg=LightYellow guifg=Black
  autocmd WinEnter,BufRead,BufNew,Syntax * highlight MyDone guibg=LightGreen  guifg=Black
augroup END

augroup highlight_keywords
  autocmd!
  autocmd WinEnter,BufRead,BufNew,Syntax * :silent! call matchadd('MyDue',  'DUE:')
  autocmd WinEnter,BufRead,BufNew,Syntax * :silent! call matchadd('MyNote', 'NOTE:')
  autocmd WinEnter,BufRead,BufNew,Syntax * highlight MyDue  guibg=White     guifg=Black
  autocmd WinEnter,BufRead,BufNew,Syntax * highlight MyNote guibg=LightBlue guifg=Black
augroup END


" --- grep
if executable('rg')
  set grepprg=rg\ --vimgrep\ --glob\ '!*~'\ --glob\ '!.git'
endif


" --- jump
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


" --- quickfix
" https://vim.fandom.com/wiki/Automatically_fittig_a_quickfix_window_height
function! AdjustWindowHeight(minheight, maxheight)
  exe max([min([line("$"), a:maxheight]), a:minheight]) . "wincmd _"
endfunction

augroup config_quickfix
  autocmd!
  autocmd FileType qf call AdjustWindowHeight(3, 15)
  autocmd FileType qf setlocal nowrap
  autocmd QuickFixCmdPost *grep* cwindow
augroup END


" --- key bind
let mapleader = ","

" https://vim.fandom.com/wiki/Search_for_visually_selected_text
vnoremap // y/\V<C-r>=escape(@",'/\')<CR><CR>
nnoremap <C-l> :<C-u>nohlsearch<CR>:<C-u>redraw!<CR>

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


" --- Cheat Sheet
" open file            :e **/main.go
" open new buffer      :enew -> :r! find . -t f
" jump                 :jumps -> [N] Ctrl-O (older location) or Ctrl-I (newer location)
" recent files         :browse oldfiles
" recent files         :browse filter /pattern/ oldfiles
" open path            gf (goto file), gx (xdg-open)
" grep current dir     :grep! hoge -> :cw
" grep current buffer  :grep! hoge %


" --- plugin config
if filereadable(expand('~/.local/share/nvim/site/autoload/plug.vim'))

  call plug#begin(stdpath('data') . '/plugged')
  Plug 'chriskempson/base16-vim'
  Plug 'junegunn/fzf'
  Plug 'junegunn/fzf.vim'
  Plug 'skywind3000/vim-preview'
  Plug 'godlygeek/tabular'
  Plug 'jiangmiao/auto-pairs'
  Plug 'tpope/vim-commentary'
  Plug 'vim-scripts/BufOnly.vim'
  Plug 'tpope/vim-sleuth'
  Plug 'tpope/vim-fugitive'
  Plug 'iamcco/markdown-preview.nvim', { 'do': 'cd app && npm install'  }
  Plug 'aklt/plantuml-syntax'
  Plug 'weirongxu/plantuml-previewer.vim' " requires Java, Graphviz
  Plug 'tyru/open-browser.vim' " required by plantuml-previewer.vim
  Plug 'mattn/emmet-vim'
  Plug 'SirVer/ultisnips'
  Plug 'honza/vim-snippets'
  Plug 'prabirshrestha/async.vim'
  Plug 'prabirshrestha/vim-lsp'
  Plug 'mattn/vim-lsp-settings'
  Plug 'prabirshrestha/asyncomplete.vim'
  Plug 'prabirshrestha/asyncomplete-lsp.vim'
  Plug 'mattn/vim-goimports'
  Plug 'dag/vim-fish'
  Plug 'peitalin/vim-jsx-typescript'
  Plug 'leafgarland/typescript-vim'
  Plug 'jparise/vim-graphql'
  call plug#end()

  " --- looks
  colorscheme base16-eighties

  " --- fzf
  let g:fzf_tags_command = 'ctags -R'

  " --- lsp
  " let g:lsp_diagnostics_enabled = 0
  let g:lsp_diagnostics_virtual_text_enabled = 0
  let g:lsp_document_highlight_enabled = 0

  " --- key bind
  nnoremap <Leader><Leader> :<C-u>Commands<CR>

  " preview quickfix
  autocmd FileType qf nnoremap <silent><buffer> p :PreviewQuickfix<CR>
  autocmd FileType qf nnoremap <silent><buffer> P :PreviewClose<CR>

  " snippets
  let g:UltiSnipsExpandTrigger = "<c-k>"
  let g:UltiSnipsJumpForwardTrigger = "<c-f>"
  let g:UltiSnipsJumpBackwardTrigger = "<c-b>"

  " asyncomplete
  inoremap <expr> <Tab>   pumvisible() ? "\<C-n>" : "\<Tab>"
  inoremap <expr> <S-Tab> pumvisible() ? "\<C-p>" : "\<S-Tab>"
  inoremap <expr> <cr>    pumvisible() ? "\<C-y>" : "\<cr>"

  nnoremap [file] <Nop>
  nmap <Leader>f [file]
  nnoremap [file]e :<C-u>Explore<CR>
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
  nnoremap [code]f :<C-u>LspDocumentFormat<CR>

endif
