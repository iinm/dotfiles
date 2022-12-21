# config

a.k.a. dotfiles

## Install Basic Utilities

```sh
# Ubuntu
sudo apt install zsh tmux git tig ripgrep fd-find fzf direnv zoxide curl xsel jq shellcheck
sudo ln -s /usr/bin/fdfind /usr/local/bin/fd
```

```sh
# Darwin
brew install tmux tig ripgrep fd fzf direnv zoxide jq shellcheck
```

## Create Symlinks

```sh
zsh link.sh
```

## Configure zsh

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

## Enable fzf Key Bindings

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

## Enable Git Config

```sh
echo -e "\n[include]\n\tpath = ~/.gitconfig-global" >> ~/.gitconfig
```

## Install Python (for Vim)

```sh
# Ubuntu
sudo apt install libpython3-dev
```

```sh
# Darwin
brew install openssl
```

```sh
python_version=3.11.1
mkdir -p ~/tools/sources
curl https://www.python.org/ftp/python/${python_version}/Python-${python_version}.tar.xz \
  | tar -C ~/tools/sources -xJf -

cd ~/tools/sources/python-${python_version}
./configure --prefix=$HOME/tools/python-${python_version} --with-openssl=/opt/homebrew/opt/openssl@3
make
make install

echo "export PATH=\$HOME/tools/python-${python_version}/bin:\$PATH" >> ~/.zshrc.local
```

## Install Vim & Plugin Manager

```sh
# Ubuntu
sudo apt install libxt-dev # to enable clipboard
```

```sh
git clone https://github.com/vim/vim.git ~/tools/sources/vim
cd ~/tools/sources/vim/src

make distclean
./configure --prefix=$HOME/tools/vim --enable-python3interp
make
make install

echo "export PATH=\$HOME/tools/vim/bin:\$PATH" >> ~/.zshrc.local

curl -fLo ~/.vim/autoload/plug.vim --create-dirs \
  https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
```

## Install Golang

Required to install efm-langserver.

```sh
go_version=1.19.4
# Linux
go_bin_url=https://go.dev/dl/go1.19.4.linux-amd64.tar.gz
# Darwin
go_bin_url=https://go.dev/dl/go1.19.4.darwin-arm64.tar.gz

curl -L $go_bin_url | tar -C ~/tools -xzf -
mv ~/tools/go ~/tools/go-$go_version
echo "export PATH=\$HOME/tools/go-${go_version}/bin:\$PATH" >> ~/.zshrc.local
```

## Install Node Version Manager

```sh
git clone https://github.com/nvm-sh/nvm.git ~/tools/nvm
cat >> ~/.zshrc.local << 'EOF'
export NVM_DIR=$HOME/tools/nvm
source $NVM_DIR/nvm.sh
EOF
```
