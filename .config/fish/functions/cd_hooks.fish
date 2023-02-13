function cd_hooks
  set -g DIRECTORY_HISTORY_FILE ~/.directory_history
  set -g TAC (which tac || echo 'tail -r')

  function cd
    builtin cd $argv
    emit cd $PWD
  end

  function on_cd --on-event cd
    if test "$argv" != "$HOME"
      echo "$argv" >> "$DIRECTORY_HISTORY_FILE"
    end
  end

  function cdi
    # complaction
    set -l tmpfile (mktemp)
    cat "$DIRECTORY_HISTORY_FILE" | $TAC | awk '!a[$0]++' | $TAC > "$tmpfile"
    mv -f "$tmpfile" "$DIRECTORY_HISTORY_FILE"
    rm -f "$tmpfile"
    set -l dest (cat "$DIRECTORY_HISTORY_FILE" | fzf --tac)
    if test -n "$dest"
      cd "$dest"
    end
  end
end
