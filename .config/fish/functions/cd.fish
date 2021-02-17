function cd
  builtin cd $argv

  set git_root (git rev-parse --show-toplevel 2> /dev/null; or true)
  
  # Find virtualenv.
  if test -n "$git_root"
    # e.g., $git_root/venv/bin/activate.fish
    set venv_activate_script \
        (find $git_root -mindepth 3 -maxdepth 3 ! -path '*.git/*' -name activate.fish | head -1)
  end
  
  # Activate virtualenv if not activated.
  if test -n "$venv_activate_script"; and test -z "$VIRTUAL_ENV"
    source "$venv_activate_script"
  end
  
  # Deactivate virtualenv if current directory is out of virtualenv.
  if test -n "$VIRTUAL_ENV"; and not pwd | grep -qE "^"(dirname "$VIRTUAL_ENV")
    deactivate
  end
end
