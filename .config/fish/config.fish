# Host specific configuration
if type --quiet config_local
  config_local
end

if type --quiet config_local_first
  config_local_first
end

test -n "$LANG";   or set -x LANG en_US.UTF-8
test -n "$EDITOR"; or type --quiet vim; and set -x EDITOR vim

if test -e /opt/homebrew
  fish_add_path /opt/homebrew/sbin
  fish_add_path /opt/homebrew/bin
end

if test -e $HOME/.local/bin
  fish_add_path $HOME/.local/bin
end

if test -e $HOME/tools/vim
  fish_add_path $HOME/tools/vim/bin
end

if test (uname) = 'Linux'; and type --quiet xsel
  alias pbcopy  'xsel -i -p && xsel -o -p | xsel -i -b'
  alias pbpaste 'xsel -o -b'
  alias open    'xdg-open'
end

if test (uname) = 'Darwin'; and not type --quiet tac
  alias tac 'tail -r'
end

if status is-interactive
  set -U fish_greeting

  fish_config theme choose 'Base16 Eighties'
  fish_config prompt choose arrow

  alias rm 'rm -i'
  alias cp 'cp -i'
  alias mv 'mv -i'

  alias gco 'git checkout'
  alias gst 'git status'
  alias gl  'git pull'
  alias gcd 'cd (git rev-parse --show-toplevel)'
  alias gcb 'git rev-parse --abbrev-ref HEAD'
  alias gsm 'git submodule'
  alias gi  'vim -c Git'

  if type --quiet fzf; and type --quiet fzf_key_bindings
    fzf_key_bindings
  end

  if type --quiet direnv
    direnv hook fish | source
  end
 
  if type --quiet cd_hooks
    cd_hooks
  end
 end

# Host specific configuration
if type --quiet config_local_last
  config_local_last
end

# Remove duplicate PATH entries
set -x PATH (echo "$PATH" | tr ':' '\n' | awk '!a[$0]++')
