function fzf_key_bindings
  function fzf_file
    commandline -t (fd --hidden --exclude .git | fzf --reverse)
    commandline -f repaint
  end

  function fzf_history
    commandline -r (history | fzf --reverse)
    commandline -f repaint
  end

  bind \cy fzf_file
  bind \cr fzf_history
end
