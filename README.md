# config

a.k.a. dotfiles

## Requirements

- zsh
- tmux
- neovim
- ripgrep
- fd
- fzf
- direnv
- fasd
- xsel (Linux)

## How to install

```sh
# Create symlink
zsh link.sh
```

Configure zsh.
```sh
# https://grml.org/zsh/
curl -L -o ~/.zshrc https://git.grml.org/f/grml-etc-core/etc/zsh/zshrc
echo "source ~/.zshrc.global" > ~/.zshrc.local
```

Enable fzf key bindings.
```sh
$(brew --prefix)/opt/fzf/install
```

Enable git config.
```sh
echo -e "\n[include]\n\tpath = ~/.gitconfig-global" >> ~/.gitconfig
```

Install neovim plugins.
```sh
# https://github.com/junegunn/vim-plug#neovim
curl -fLo "${XDG_DATA_HOME:-$HOME/.local/share}/nvim/site/autoload/plug.vim" --create-dirs \
  https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim

nvim -c "PlugClean | q | PlugInstall | q | q"
```
