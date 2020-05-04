.PHONY: all
all: ;

install: \
	~/.config/fish/config.fish \
	~/.config/fish/fish_variables \
	~/.config/fish/functions/fzf_key_bindings.fish \
	~/.tmux.conf \
	~/.config/nvim/init.vim \
	~/.config/nvim/colors/base16-eighties.vim \
	~/.gitconfig-global \
	~/.gitignore-global \
	;

~/.config/fish/config.fish: .config/fish/config.fish
	mkdir -p $(@D)
	cp $< $@

~/.config/fish/fish_variables: .config/fish/fish_variables
	mkdir -p $(@D)
	cp $< $@

~/.config/fish/functions/fzf_key_bindings.fish:
	curl --fail --create-dirs --output $@ https://raw.githubusercontent.com/junegunn/fzf/master/shell/key-bindings.fish
	sed -i 's,ct fzf-file-widget,cy fzf-file-widget,g' $@

~/.tmux.conf: .tmux.conf
	cp $< $@

~/.config/nvim/init.vim: .config/nvim/init.vim
	mkdir -p $(@D)
	cp $< $@

~/.config/nvim/colors/base16-eighties.vim:
	curl --fail --create-dirs --output $@ https://raw.githubusercontent.com/chriskempson/base16-vim/master/colors/base16-eighties.vim

~/.gitconfig-global: .gitconfig-global
	if ! grep -q 'path = ~/.gitconfig-global' ~/.gitconfig; then echo -e "\n[include]\n\tpath = ~/.gitconfig-global" | tee -a ~/.gitconfig; fi
	cp $< $@

~/.gitignore-global: .gitignore-global
	cp $< $@
