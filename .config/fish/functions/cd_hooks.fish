function cd_hooks
  set -g DIRECTORY_HISTORY_FILE ~/.directory_history

  function on_pwd_change --on-variable PWD
    if test "$PWD" != "$HOME"
      echo "$PWD" >> "$DIRECTORY_HISTORY_FILE"
    end
  end

  function cdi
    # compaction
    set -l tmpfile (mktemp)
    cat "$DIRECTORY_HISTORY_FILE" | tac | awk '!a[$0]++' | tac > "$tmpfile"
    mv -f "$tmpfile" "$DIRECTORY_HISTORY_FILE"
    rm -f "$tmpfile"

    set -l dest (cat "$DIRECTORY_HISTORY_FILE" | fzf --reverse --tac)
    if test -n "$dest"
      cd "$dest"
    end
  end
end
