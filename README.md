# config

a.k.a. dotfiles

Install requirements.

```
# Arch Linux
pacman -Syu zsh tmux neovim git tig ripgrep fd fzf direnv fasd xsel

# Darwin
brew install tmux neovim tig ripgrep fd fzf direnv fasd
```

Create symlinks.
```sh
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
# Darwin
$(brew --prefix)/opt/fzf/install

# Arch Linux
cat > ~/.fzf.zsh << EOF
# https://wiki.archlinux.org/title/fzf#Zsh
source /usr/share/fzf/key-bindings.zsh
source /usr/share/fzf/completion.zsh
EOF
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
