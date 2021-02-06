```sh
apt install fish bash tmux neovim xsel make git tig fzf ripgrep fd-find direnv

make install

curl https://bootstrap.pypa.io/get-pip.py | python3
~/.local/bin/pip install --user pynvim

nvim -c 'PlugClean | q | PlugInstall | q | q'
```
