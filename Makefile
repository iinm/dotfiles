.PHONY: all
all: ;

install: \
	~/.config/fish/config.fish \
	~/.config/fish/fish_variables \
	~/.tmux.conf \
	~/.config/nvim/init.vim \
	~/.gitconfig-global \
	~/.gitignore-global \
	;

~/.config/fish/config.fish: .config/fish/config.fish
	mkdir -p ~/.config/fish
	cp .config/fish/config.fish ~/.config/fish/config.fish

~/.config/fish/fish_variables: .config/fish/fish_variables
	mkdir -p ~/.config/fish
	cp .config/fish/fish_variables ~/.config/fish/fish_variables

~/.tmux.conf: .tmux.conf
	cp .tmux.conf ~/.tmux.conf

~/.config/nvim/init.vim: .config/nvim/init.vim
	mkdir -p ~/.config/nvim
	cp .config/nvim/init.vim ~/.config/nvim/init.vim

~/.gitconfig-global: .gitconfig-global
	if ! grep -q 'path = ~/.gitconfig-global' ~/.gitconfig; then echo -e "\n[include]\n\tpath = ~/.gitconfig-global" | tee -a ~/.gitconfig; fi
	cp .gitconfig-global ~/.gitconfig-global

~/.gitignore-global: .gitignore-global
	cp .gitignore-global ~/.gitignore-global
