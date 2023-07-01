function TabLine()
  let s = ''
  for i in range(tabpagenr('$'))
    if i + 1 == tabpagenr()
      " select the highlighting
      let s ..= '%#TabLineSel#'
    else
      let s ..= '%#TabLine#'
    endif

    " set the tab page number (for mouse clicks)
    let s ..= '%' .. (i + 1) .. 'T'
    " show tab number
    let s ..= ' ' .. (i + 1) .. ' '
  endfor

  " after the last tab fill with TabLineFill and reset tab page nr
  let s ..= '%#TabLineFill#%T'
  return s
endfunction
