# Host specific configuration
if type --quiet local_config
  local_config
end

if type --quiet local_config_first
  local_config_first
end

if test -e $HOME/tools/bin
  fish_add_path -g $HOME/tools/bin
end

set -x SHELL (which fish)
test -n "$LANG";   or set -x LANG en_US.UTF-8
test -n "$EDITOR"; or type --quiet nvim; and set -x EDITOR nvim

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

  if type --quiet dir_history
    dir_history
  end
end

# Host specific configuration
if type --quiet local_config_last
  local_config_last
end

# Remove duplicate PATH entries
set -x PATH (echo "$PATH" | tr ':' '\n' | awk '!a[$0]++')
