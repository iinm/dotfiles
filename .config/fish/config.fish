# Host specific configuration
if type --quiet local_config
  local_config
end

if type --quiet local_config_first
  local_config_first
end

# Common PATH entries
fish_add_path /opt/homebrew/sbin
fish_add_path /opt/homebrew/bin

fish_add_path $HOME/tools/bin
fish_add_path $HOME/tools/vim/bin
fish_add_path $HOME/tools/nvim/bin
fish_add_path $HOME/tools/node/bin
fish_add_path $HOME/tools/go/bin
fish_add_path $HOME/tools/lua-language-server/bin
fish_add_path $HOME/tools/google-cloud-sdk/bin
fish_add_path $HOME/go/bin

fish_add_path $HOME/dotfiles/bin
fish_add_path $HOME/dotfiles/agent/bin

# Environment variables
set -x SHELL (which fish)
test -n "$LANG";   or set -x LANG en_US.UTF-8
test -n "$EDITOR"; or type --quiet nvim; and set -x EDITOR nvim

# Aliases for compatibility
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

# Interactive shell configuration
if status is-interactive
  # Appearance
  set -U fish_greeting
  fish_config theme choose 'Base16 Eighties'
  fish_config prompt choose astronaut

  # Aliases
  alias rm 'rm -i'
  alias cp 'cp -i'
  alias mv 'mv -i'

  alias v 'nvim'

  alias gco 'git checkout'
  alias gst 'git status'
  alias gl  'git pull'
  alias gcd 'cd (git rev-parse --show-toplevel)'
  alias gcb 'git rev-parse --abbrev-ref HEAD'
  alias gsm 'git submodule'

  alias d 'docker'
  alias dc 'docker-compose'

  # Utilities
  if type --quiet dir_history
    dir_history
  end

  if type --quiet fzf
    set -x FZF_DEFAULT_COMMAND 'fd --type f --hidden --exclude .git'
    set -x FZF_DEFAULT_OPTS '--layout=reverse'
    function fzf_file
      commandline -t (fd --hidden --exclude .git | fzf --reverse)
      commandline -f repaint
    end

    function fzf_history
      commandline -r (history | fzf --reverse)
      commandline -f repaint
    end

    bind \cy fzf_file
    bind \cr fzf_history
  end

  if type --quiet colima
    # cores: same as the host
    # memory: half of the host
    # disk: 100GB
    alias colima_start 'colima start --cpu (sysctl -n hw.ncpu) --memory (math (sysctl -n hw.memsize) / 1024^3 / 2) --disk 100 --arch aarch64 --vm-type=vz --vz-rosetta --mount-type virtiofs --dns 8.8.8.8 --dns 1.1.1.1'
  end

  if type --quiet gh
    function gh_list_review_requested
      gh pr list --search "is:open is:pr review-requested:@me" --json url,title,author --jq '.[] | .url + " - " + .author.login + ": " + .title'
    end
  end

  if type --quiet csvq
    function csvless
      if test (count $argv) -eq 0
        csvq --format TEXT "select * from STDIN" | less -S
      else
        csvq --format TEXT "select * from `$argv[1]`" | less -S
      end
    end
  end

  if test -e $HOME/tools/anaconda3
    function use_anaconda
      eval "$($HOME/tools/anaconda3/bin/conda shell.fish hook)"
    end
  end

  if test -e $HOME/tools/miniconda3
    function use_miniconda
      eval "$($HOME/tools/miniconda3/bin/conda shell.fish hook)"
    end
  end

  function calculate --description "Calculate mathematical expressions from input"
    sed -E 's,^ +//,,g; s,[^0-9.*+/()-],,g' | tr -s ' ' | tee /dev/stderr | bc -l | sed 's/^/= /'
  end
end

# Host specific configuration
if type --quiet local_config_last
  local_config_last
end

# Remove duplicate PATH entries
set -x PATH (echo "$PATH" | tr ':' '\n' | awk '!a[$0]++')
