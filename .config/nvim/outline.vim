function! Outline() abort
  let l:filetype = &filetype

  if l:filetype == 'typescript'
    if expand('%') =~ '\.test\.ts$'
      lvimgrep /\v^\s*(describe|beforeAll|afterAll|beforeEach|afterEach|it[^\w]|\]\)\()/j %
    else
      lvimgrep /\v^(export\s+)?(function|interface|type|enum|const|class)/j %
    endif
  else
    echom 'Not supported for ' .. l:filetype
    return
  endif

  lwindow
  setlocal nowrap

  syntax match ConcealedDetails /\v^[^|]*\|[^|]*\| / conceal
  setlocal conceallevel=2
  setlocal concealcursor=nvic
endfunction
