```sh
which pacman \
  && pacman -Sy fish bash tmux neovim xsel make git tig fzf ripgrep fd 

make install

curl https://bootstrap.pypa.io/get-pip.py | python
~/.local/bin/pip install pynvim
nvim -c 'PlugClean | q | PlugInstall | q | q'
```
