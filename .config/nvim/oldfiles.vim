function! Oldfiles(options={'only_cwd': v:false}) abort
  let l:only_cwd = has_key(a:options, 'only_cwd') ? a:options['only_cwd'] : v:false
  let l:files = filter(
  \  deepcopy(v:oldfiles),
  \  {
  \    _, path -> filereadable(expand(path))
  \      && (!l:only_cwd || expand(path) =~# '^' .. getcwd())
  \  }
  \ )
  " omit current directory
  let l:files = map(
  \  l:files,
  \  {_, path -> substitute(expand(path), getcwd() .. '/', './', '')}
  \ )
  " let l:files = sort(l:files)
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
