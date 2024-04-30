function! Outline() abort
  cclose

  let l:filetype = &filetype
  if l:filetype == 'typescript'
    " - Top level functions, interfaces, ...
    " - Test blocks
    vimgrep /\v(^(export\s+)?(function|interface|type|enum|const|class))|(^\s{0,4}(describe|beforeAll|afterAll|beforeEach|afterEach|it[^\w]|['"].+['"],))/j %
  elseif l:filetype == 'markdown'
    " - Headings
    vimgrep /\v^#{1,3}\s+.+/j %
  else
    echom 'Not supported for ' .. l:filetype
    return
  endif

  syntax match ConcealedDetails /\v^[^|]*\|[^|]*\| / conceal
  setlocal conceallevel=2
  setlocal concealcursor=nvic
endfunction
