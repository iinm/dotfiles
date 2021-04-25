# config

a.k.a. dotfiles

## Requirements

- fish (Login shell)
- bash (for scripting)
- tmux
- neovim
- ripgrep
- fd
- fzf
- xsel (for Linux)

## How to install

```sh
# Create symlink
bash link.sh
```

## Tips

Configure fish
```sh
cat > .config/fish/functions/config_local.fish << 'EOF'
function config_local --description "Host specific configuration"
  function config_local_first
  end

  function config_local_last
    set -xg PATH ~/tools/bin $PATH
  end
end
EOF
```

Enable git config
```sh
echo -e "\n[include]\n\tpath = ~/.gitconfig-global" >> ~/.gitconfig
```

Enable fzf key bindings for fish.
```sh
curl https://raw.githubusercontent.com/junegunn/fzf/master/shell/key-bindings.fish \
  | sed 's,ct fzf-file-widget,cy fzf-file-widget,g' \
  > .config/fish/functions/fzf_key_bindings.fish
```

Install neovim plugins.
```sh
nvim -c 'PlugClean | q | PlugInstall | q | q'
```
