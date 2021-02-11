# Expected directory structure
#
# .config/fish/
#   \__ config.fish
#   \__ functions/
#         \__ config_local.fish (Host specific configuration)
#               \__ function config_local_first
#               \__ function config_local_last

# Host specific configuration
if type --quiet config_local
  config_local
end

if type --quiet config_local_first
  config_local_first
end

# Environment
test -n "$LANG";   or set -x LANG en_US.UTF-8
test -n "$EDITOR"; or type --quiet nvim; and set -x EDITOR nvim

# For compatibility
if test (uname) = 'Linux'; and type --quiet xsel
  alias pbcopy  'xsel -i -p && xsel -o -p | xsel -i -b'
  alias pbpaste 'xsel -o -b'
  alias open    'xdg-open'
end

# direnv
if type --quiet direnv
  direnv hook fish | source
end

# Interactive shell configuration
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

  alias dco  'docker-compose'
  alias be 'bundle exec'

  if type --quiet fzf
    if type --quiet fd
      set -x FZF_DEFAULT_COMMAND 'fd --type f --hidden --follow --exclude .git --exclude "*~"'
    end
    set -x FZF_DEFAULT_OPTS    '--reverse'
    set -x FZF_CTRL_T_COMMAND  $FZF_DEFAULT_COMMAND
    set -x FZF_CTRL_T_OPTS     $FZF_DEFAULT_OPTS
  end

  if type --quiet fzf_key_bindings
    fzf_key_bindings
  end
end

# Host specific configuration
if type --quiet config_local_last
  config_local_last
end

# Removing duplicate PATH entries
set -x PATH (echo "$PATH" | tr ':' '\n' | awk '!a[$0]++')
