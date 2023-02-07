# Host specific configuration
if type --quiet config_local
  config_local
end

if type --quiet config_local_first
  config_local_first
end

test -n "$LANG";   or set -x LANG en_US.UTF-8
test -n "$EDITOR"; or type --quiet nvim; and set -x EDITOR nvim

if test (uname) = 'Linux'; and type --quiet xsel
  alias pbcopy  'xsel -i -p && xsel -o -p | xsel -i -b'
  alias pbpaste 'xsel -o -b'
  alias open    'xdg-open'
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

  if type --quiet fzf
    if type --quiet fd
      set -x FZF_DEFAULT_COMMAND 'fd --type f --hidden --follow --exclude .git --exclude "*~"'
    end
    set -x FZF_DEFAULT_OPTS   '--reverse'
    set -x FZF_CTRL_T_COMMAND $FZF_DEFAULT_COMMAND
    set -x FZF_CTRL_T_OPTS    $FZF_DEFAULT_OPTS
  end

  if type --quiet fzf_key_bindings
    fzf_key_bindings
  end

  if type --quiet direnv
    direnv hook fish | source
  end

  if type --quiet zoxide
    zoxide init fish | source
  end
 end

# Host specific configuration
if type --quiet config_local_last
  config_local_last
end

# Remove duplicate PATH entries
set -x PATH (echo "$PATH" | tr ':' '\n' | awk '!a[$0]++')
