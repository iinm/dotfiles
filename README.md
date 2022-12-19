# config

a.k.a. dotfiles

Install requirements.

```
# Ubuntu
sudo apt install zsh tmux git tig ripgrep fd-find fzf direnv fasd xsel curl
sudo ln -s /usr/bin/fdfind /usr/local/bin/fd

# Darwin
brew install tmux tig ripgrep fd fzf direnv fasd
```

Create symlinks.
```sh
zsh link.sh
```

Configure zsh.
```sh
# https://grml.org/zsh/
curl -L -o ~/.zshrc https://git.grml.org/f/grml-etc-core/etc/zsh/zshrc
echo "source ~/.zshrc.global" >> ~/.zshrc.local

# https://github.com/zsh-users/zsh-completions
git clone https://github.com/zsh-users/zsh-completions ~/.zsh/zsh-completions
echo 'fpath=(~/.zsh/zsh-completions/src $fpath)' >> ~/.zshrc.local
rm -f ~/.zcompdump; compinit

# https://github.com/zsh-users/zsh-autosuggestions/blob/master/INSTALL.md#manual-git-clone
git clone https://github.com/zsh-users/zsh-autosuggestions ~/.zsh/zsh-autosuggestions
echo "source ~/.zsh/zsh-autosuggestions/zsh-autosuggestions.zsh" >> ~/.zshrc.local

# https://github.com/zsh-users/zsh-syntax-highlighting/blob/master/INSTALL.md
git clone https://github.com/zsh-users/zsh-syntax-highlighting ~/.zsh/zsh-syntax-highlighting
echo "source ~/.zsh/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh" >> ~/.zshrc.local
```

Enable fzf key bindings.
```sh
# Ubuntu
cat > ~/.fzf.zsh << EOF
source /usr/share/doc/fzf/examples/completion.zsh
source /usr/share/doc/fzf/examples/key-bindings.zsh
EOF

# Darwin
$(brew --prefix)/opt/fzf/install
```

Enable git config.
```sh
echo -e "\n[include]\n\tpath = ~/.gitconfig-global" >> ~/.gitconfig
```

Install Python
```sh
# Download Python source
./configure --prefix=$HOME/tools/python --with-openssl=/opt/homebrew/opt/openssl@3
make
make install
```

Install Vim
```sh
git clone https://github.com/vim/vim.git ~/tools/sources/vim
cd ~/tools/sources/vim/src
make distclean
./configure --prefix=$HOME/tools/vim --enable-python3interp
make
make install

curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
    https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
```
