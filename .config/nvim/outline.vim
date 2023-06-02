function! Outline() abort
  let l:filetype = &filetype

  if l:filetype == 'typescript'
    if expand('%') =~ '\.test\.ts$'
      vimgrep /\v^\s*(describe|beforeAll|afterAll|beforeEach|afterEach|it[^\w]|\]\)\()/j %
    else
      vimgrep /\v^(export\s+)?(function|interface|type|enum|const|class)/j %
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
