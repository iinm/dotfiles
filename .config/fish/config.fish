# Host specific configuration
if type --quiet config_local
  config_local
end

if type --quiet config_local_first
  config_local_first
end

set -x SHELL (which fish)
test -n "$LANG";   or set -x LANG en_US.UTF-8
test -n "$EDITOR"; or type --quiet nvim; and set -x EDITOR nvim

if test -e /opt/homebrew
  fish_add_path /opt/homebrew/sbin
  fish_add_path /opt/homebrew/bin
end

if test -e $HOME/tools/bin
  fish_add_path $HOME/tools/bin
end

if test (uname) = 'Linux'
  alias open 'xdg-open'
  if xsel -o &> /dev/null
    alias pbcopy  'xsel -i -p && xsel -o -p | xsel -i -b'
    alias pbpaste 'xsel -o -b'
  else
    set -x CLIPBOARD_FILE $HOME/.clipboard
    function pbcopy
      read input
      # OSC52
      printf "\e]52;c;%s\a" (echo -n "$input" | openssl base64 -A)
      echo -n "$input" > $CLIPBOARD_FILE
    end
    alias pbpaste "cat $CLIPBOARD_FILE"
  end
end

if test (uname) = 'Darwin'; and not type --quiet tac
  alias tac 'tail -r'
end

if status is-interactive
  set -U fish_greeting

  fish_config theme choose 'Base16 Eighties'
  fish_config prompt choose astronaut

  alias rm 'rm -i'
  alias cp 'cp -i'
  alias mv 'mv -i'

  alias g   'nvim -c Git'
  alias gco 'git checkout'
  alias gst 'git status'
  alias gl  'git pull'
  alias gcd 'cd (git rev-parse --show-toplevel)'
  alias gcb 'git rev-parse --abbrev-ref HEAD'
  alias gsm 'git submodule'

  if type --quiet fzf; and type --quiet fzf_key_bindings
    fzf_key_bindings
  end

  if type --quiet direnv
    direnv hook fish | source
  end
 
  if type --quiet cd_hooks
    cd_hooks
  end

  if type --quiet colima
    test -n "$COLIMA_START_OPTIONS"; \
      or set -x COLIMA_START_OPTIONS '--cpu 2 --memory 4 --disk 30'
    alias colima-start "colima start $COLIMA_START_OPTIONS"
  end

  if test -e $HOME/tools/anaconda3
    function use_anaconda
      eval "$($HOME/tools/anaconda3/bin/conda shell.fish hook)"
    end
  end
end

# Host specific configuration
if type --quiet config_local_last
  config_local_last
end

# Remove duplicate PATH entries
set -x PATH (echo "$PATH" | tr ':' '\n' | awk '!a[$0]++')
