# config

a.k.a. dotfiles

## Install Utilities

```sh
# Ubuntu
sudo apt install zsh tmux git tig ripgrep fd-find fzf direnv zoxide curl xsel jq
sudo ln -s /usr/bin/fdfind /usr/local/bin/fd
```

```sh
# Darwin
brew install tmux tig ripgrep fd fzf direnv zoxide jq
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

## Install Golang

```sh
go_version=1.19.4
platform=$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/amd64/')
go_bin_url=https://go.dev/dl/go${go_version}.${platform}.tar.gz

curl -L $go_bin_url | tar -C ~/tools -xzf -
mv ~/tools/go ~/tools/go-$go_version
echo "export PATH=\$HOME/tools/go-${go_version}/bin:\$PATH" >> ~/.zshrc.local
```

## Install Node.js

```sh
nodejs_version=18.12.1
platform=$(uname -s | tr '[:upper:]' '[:lower:]')-$(uname -m | sed 's/x86_64/x64/')
nodejs_bin_url=https://nodejs.org/dist/v${nodejs_version}/node-v${nodejs_version}-${platform}.tar.xz

curl -L $nodejs_bin_url | tar -C ~/tools -xJf -
echo "export PATH=\$HOME/tools/node-v${nodejs_version}-${platform}/bin:\$PATH" >> ~/.zshrc.local
```
