# config

a.k.a. dotfiles

## Requirements

- fish (login shell)
- bash (for scripting)
- tmux
- neovim
  - vim-plug
- ripgrep
- fd
- fzf
- direnv
- xsel (Linux)

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
    set -xg PATH ~/tools/bin $PATH
  end

  function config_local_last
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
