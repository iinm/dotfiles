```sh
pacman -Sy fish bash busybox tmux neovim xsel make git tig fzf ripgrep fd curl jq 
make install
nvim -c 'PlugClean | q | PlugInstall | q | q'
```
