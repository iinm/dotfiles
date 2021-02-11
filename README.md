```sh
apt install fish bash tmux neovim xsel make git tig fzf ripgrep fd-find direnv

make install

# Python
apt install build-essential zlib1g-dev libreadline-dev libssl-dev libsqlite3-dev libbz2-dev libffi-dev
curl https://www.python.org/ftp/python/3.9.1/Python-3.9.1.tar.xz | tar -C ~/Downloads -xJf -
cd ~/Downloads/Python-3.9.1
./configure --prefix=$HOME/tools/python-3.9.1
make
make install

# Neovim
pip3 install pynvim
nvim -c 'PlugClean | q | PlugInstall | q | q'

# AWS cli
pip3 install https://github.com/boto/botocore/archive/v2.tar.gz
pip3 install https://github.com/aws/aws-cli/archive/v2.tar.gz
```
