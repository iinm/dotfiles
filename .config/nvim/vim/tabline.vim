function MyTabLine()
  let s = ''
  for i in range(tabpagenr('$'))
    " select the highlighting
    if i + 1 == tabpagenr()
      let s ..= '%#TabLineSel#'
    else
      let s ..= '%#TabLine#'
    endif

    " set the tab page number (for mouse clicks)
    let s ..= '%' .. (i + 1) .. 'T'

    " the label is made by MyTabLabel()
    let s ..= ' %{MyTabLabel(' .. (i + 1) .. ')} '
  endfor

  " after the last tab fill with TabLineFill and reset tab page nr
  let s ..= '%#TabLineFill#%T'

  " right-align the label to close the current tab page
  " if tabpagenr('$') > 1
  "   let s ..= '%=%#TabLine#%999X[x]'
  " endif

  return s
endfunction

function MyTabLabel(n)
  let buflist = tabpagebuflist(a:n)
  let winnr = tabpagewinnr(a:n)
  let filename = bufname(buflist[winnr - 1])
  let xs = split(filename, '/')
  let filename = join(xs[len(xs) - 2:], '/')
  if filename == ''
    let filename = '[No Name]'
  endif
  let filecount = ''
  if len(buflist) > 1
    let filecount = '(' .. len(buflist) .. ')'
  endif
  return a:n .. ':' .. filename .. ' ' .. filecount
endfunction
