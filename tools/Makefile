.PHONY: all
all: ;

install: bin/fzf bin/ripgrep bin/fd bin/nvim bin/tmux

bin/fzf:
	mkdir -pv ~/.config/fish/functions
	wget -O ~/.config/fish/functions/fzf_key_bindings.fish https://raw.githubusercontent.com/junegunn/fzf/0.20.0/shell/key-bindings.fish
	wget -O - https://github.com/junegunn/fzf-bin/releases/download/0.20.0/fzf-0.20.0-linux_amd64.tgz | tar -C bin -xzvf -
	chmod +x bin/fzf

bin/ripgrep:
	wget -O - https://github.com/BurntSushi/ripgrep/releases/download/11.0.2/ripgrep-11.0.2-x86_64-unknown-linux-musl.tar.gz | tar xzvf -
	ln -s ../ripgrep-11.0.2-x86_64-unknown-linux-musl/rg bin/ripgrep

bin/fd:
	wget -O - https://github.com/sharkdp/fd/releases/download/v7.4.0/fd-v7.4.0-x86_64-unknown-linux-musl.tar.gz | tar xzvf -
	ln -s ../fd-v7.4.0-x86_64-unknown-linux-musl/fd bin/fd

bin/direnv:
	wget -O bin/direnv https://github.com/direnv/direnv/releases/download/v2.21.2/direnv.linux-amd64
	chmod +x bin/direnv

bin/nvim:
	mkdir -pv ~/.config/nvim/colors
	wget -O ~/.config/nvim/colors/base16-eighties.vim https://raw.githubusercontent.com/chriskempson/base16-vim/master/colors/base16-eighties.vim
	wget -O - https://github.com/neovim/neovim/releases/download/v0.4.3/nvim-linux64.tar.gz | tar xzvf -
	ln -s ../nvim-linux64/bin/nvim bin/nvim

bin/tmux:
	wget -O bin/tmux https://github.com/nelsonenzo/tmux-appimage/releases/download/3.0a-appimage0.1.0/tmux-3.0a-x86_64.AppImage
	chmod +x bin/tmux
