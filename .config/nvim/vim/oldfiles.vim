function! Oldfiles(options={'only_cwd': v:false}) abort
  let l:only_cwd = has_key(a:options, 'only_cwd') ? a:options['only_cwd'] : v:false
  let l:files = filter(
  \  deepcopy(v:oldfiles),
  \  {
  \    _, path ->
  \      path !~# 'dap-repl'
  \      && path !~# 'COMMIT_EDITMSG$'
  \      && filereadable(expand(path))
  \      && (!l:only_cwd || expand(path) =~# '^' .. getcwd() .. '/')
  \  }
  \ )

  " omit current directory
  let l:files = map(
  \  l:files,
  \  {_, path -> substitute(expand(path), getcwd() .. '/', './', '')}
  \ )

  " write to buffer
  enew
  file [Oldfiles]
  setlocal buftype=nofile
  setlocal nobuflisted
  setlocal bufhidden=wipe
  setlocal nospell
  sil 0put =l:files
  setlocal readonly

  syntax match Grey /\v^.+\// " directory
  nnoremap <buffer> <CR> :<C-u>e <C-r>=getline('.')<CR><CR>
  nnoremap <buffer> <Esc> :<C-u>b #<CR>
  nnoremap <buffer> <C-o> :<C-u>b #<CR>

  " set cursor to the first line
  normal! 1gg
endfunction

function! UpdateOldfiles(file) abort
  if !exists('v:oldfiles')
    return
  endif
  let idx = index(v:oldfiles, a:file)
  if idx != -1
    call remove(v:oldfiles, idx)
  endif
  call insert(v:oldfiles, a:file, 0)
endfunction
