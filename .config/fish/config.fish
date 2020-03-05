set -x LANG en_US.UTF-8
set -x EDITOR nvim

set -x PATH ~/tools/bin $PATH

if test -L ~/tools/java
  set -x PATH ~/tools/java/bin $PATH
end

if test -L ~/tools/golang
  set -x PATH ~/tools/golang/bin $PATH
end

if test -L ~/tools/nodejs
  set -x PATH ~/tools/nodejs/bin $PATH
end

# --- interactive shell configuration
if status --is-interactive
  set fish_greeting

  alias rm 'rm -i'
  alias cp 'cp -i'
  alias mv 'mv -i'

  alias gco 'git checkout'
  alias gst 'git status'
  alias gl  'git pull'
  alias gcd 'cd (git rev-parse --show-toplevel)'
  alias gcb 'git rev-parse --abbrev-ref HEAD'
  alias gsm 'git submodule'

  alias rg   'rg --hidden'
  alias view 'nvim -R'
  alias dco  'docker-compose'

  if test (uname) = 'Linux'
    alias pbcopy  'xsel -i -p && xsel -o -p | xsel -i -b'
    alias pbpaste 'xsel -o -b'
    alias open    'xdg-open'
  end

  if type -q fzf
    set -x FZF_DEFAULT_COMMAND 'fd --type f --hidden --follow --exclude .git --exclude "*~"'
    set -x FZF_DEFAULT_OPTS    '--reverse'
    set -x FZF_CTRL_T_COMMAND  $FZF_DEFAULT_COMMAND
    set -x FZF_CTRL_T_OPTS     $FZF_DEFAULT_OPTS
  end

  if type -q fzf_key_bindings
    fzf_key_bindings
  end
end
