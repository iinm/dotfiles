```sh
apt install fish bash tmux xsel make git tig
make install

# ripgrep
curl -L -o - https://github.com/BurntSushi/ripgrep/releases/download/12.1.1/ripgrep-12.1.1-x86_64-unknown-linux-musl.tar.gz | tar -C ~/tools -xzf -

# fd
curl -L -o - https://github.com/sharkdp/fd/releases/download/v8.2.1/fd-v8.2.1-x86_64-unknown-linux-musl.tar.gz | tar -C ~/tools -xzf -

# fzf
curl -L -o - https://github.com/junegunn/fzf/releases/download/0.25.1/fzf-0.25.1-linux_amd64.tar.gz | tar -C ~/tools/bin -xzf -

# direnv
curl -L -o ~/tools/bin/direnv https://github.com/direnv/direnv/releases/download/v2.27.0/direnv.linux-amd64
chmod +x ~/tools/bin/direnv

# Node.js
curl -o - https://nodejs.org/dist/v14.16.0/node-v14.16.0-linux-x64.tar.xz | tar -C ~/tools -xJf -

# Python
apt install build-essential zlib1g-dev libreadline-dev libssl-dev libsqlite3-dev libbz2-dev libffi-dev
curl https://www.python.org/ftp/python/3.9.1/Python-3.9.1.tar.xz | tar -C ~/Downloads -xJf -
cd ~/Downloads/Python-3.9.1
./configure --prefix=$HOME/tools/python-3.9.1
make
make install

# Fish
cp .config/fish/functions/config_local.template.fish ~/.config/fish/functions/config_local.fish
nvim ~/.config/fish/functions/config_local.fish

# Neovim
(
  cd ~/tools/bin
  curl -LO https://github.com/neovim/neovim/releases/latest/download/nvim.appimage
  chmod +x nvim.appimage
  ln -s nvim.appimage nvim
)
pip3 install pynvim
nvim -c 'PlugClean | q | PlugInstall | q | q'

# AWS cli
pip3 install https://github.com/boto/botocore/archive/v2.tar.gz
pip3 install https://github.com/aws/aws-cli/archive/v2.tar.gz
```
