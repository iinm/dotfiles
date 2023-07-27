function! Buffers() abort
  let l:cwd_name = substitute(getcwd(), '^.*/', '', '')
  let l:buffers = execute('ls')
  let l:buffers = substitute(l:buffers, '^\n', '', '')
  let l:buffers = substitute(l:buffers, '\v[^"]{-}/' .. l:cwd_name .. '/', '', 'g')
  enew
  execute 'file [Buffers]'
  setlocal buftype=nofile
  setlocal nobuflisted
  setlocal bufhidden=wipe
  0put =l:buffers
  syntax match Grey /\v[^"]+\// " directory
  syntax match Grey /\vline\s+\d+/ " line number
  syntax match Aqua /\v\s.?a\s/ " active
  syntax match Red /\v\+\s/ " modified
  nnoremap <buffer> <CR> :<C-u>b <C-r>=matchstr(getline('.'), '\v^\s*\d+')<CR><CR>
  nnoremap <buffer> dd :<C-u>bd <C-r>=matchstr(getline('.'), '\v^\s*\d+')<CR><CR>dd
  nnoremap <buffer> <Esc> :<C-u>b #<CR>
  nnoremap <buffer> <C-o> :<C-u>b #<CR>
endfunction

