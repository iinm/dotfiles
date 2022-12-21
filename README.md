# config

a.k.a. dotfiles

Install requirements.

```sh
# Ubuntu
sudo apt install zsh tmux git tig ripgrep fd-find fzf direnv zoxide xsel curl
sudo ln -s /usr/bin/fdfind /usr/local/bin/fd
```

```sh
# Darwin
brew install tmux tig ripgrep fd fzf direnv zoxide
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

# completions
git clone https://github.com/zsh-users/zsh-completions ~/.zsh/zsh-completions
echo 'fpath=(~/.zsh/zsh-completions/src $fpath)' >> ~/.zshrc.local

# autosuggestions
git clone https://github.com/zsh-users/zsh-autosuggestions ~/.zsh/zsh-autosuggestions
echo "source ~/.zsh/zsh-autosuggestions/zsh-autosuggestions.zsh" >> ~/.zshrc.local

# syntax-highlighting
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
```

```sh
# Darwin
$(brew --prefix)/opt/fzf/install
```

Enable git config.
```sh
echo -e "\n[include]\n\tpath = ~/.gitconfig-global" >> ~/.gitconfig
```

Install Python for Vim
```sh
# Ubuntu
sudo apt install libpython3-dev
```

```sh
# Darwin
brew install openssl

mkdir -p $HOME/tools/sources
python_version=3.11.1
curl https://www.python.org/ftp/python/${python_version}/Python-${python_version}.tar.xz \
  | tar -C $HOME/tools/sources -xJf -
cd $HOME/tools/sources/python-${python_version}
./configure --prefix=$HOME/tools/python-${python_version} --with-openssl=/opt/homebrew/opt/openssl@3
make
make install
```

Install Vim & Plugin Manager
```sh
# Ubuntu
sudo apt install libxt-dev
```

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
