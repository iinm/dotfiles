# Expected directory structure
#
# .config/fish/
#   \__ config.fish
#   \__ functions/
#         \__ configure_local.fish (Host specific configuration)
#               \__ function configure_local_before_default
#               \__ function configure_local_after_default
#         \__ use_tools.fish

# Host specific configuration
if type --quiet configure_local
  configure_local
end

if type --quiet configure_local_before_default
  configure_local_before_default
end

# Environment
test -n "$LANG";   or set -x LANG en_US.UTF-8
test -n "$EDITOR"; or set -x EDITOR nvim

# For compatibility
if test (uname) = 'Linux'
  alias pbcopy  'xsel -i -p && xsel -o -p | xsel -i -b'
  alias pbpaste 'xsel -o -b'
  alias open    'xdg-open'
end

# Use user installed tools
if type --quiet use_tools
  test -n "$TOOLS"; or set -x TOOLS ~/tools
  use_tools
end

if type --quiet tools_default_path
  set -gx PATH (tools_default_path) $PATH
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

  alias rg   'rg --hidden'
  alias view 'nvim -R'
  alias dco  'docker-compose'

  if type --quiet fzf
    set -x FZF_DEFAULT_COMMAND 'fd --type f --hidden --follow --exclude .git --exclude "*~"'
    set -x FZF_DEFAULT_OPTS    '--reverse'
    set -x FZF_CTRL_T_COMMAND  $FZF_DEFAULT_COMMAND
    set -x FZF_CTRL_T_OPTS     $FZF_DEFAULT_OPTS
  end

  if type --quiet fzf_key_bindings
    fzf_key_bindings
  end
end

# Host specific configuration
if type --quiet configure_local_after_default
  configure_local_after_default
end

# Removing duplicate PATH entries
set -x PATH (echo $PATH | tr ' ' '\n' | awk '!a[$0]++')
