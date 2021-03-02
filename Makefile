.PHONY: all
all: ;

install: \
	~/.config/fish/config.fish \
	~/.config/fish/fish_variables \
	~/.config/fish/functions/cd.fish \
	~/.config/fish/functions/activate_python_venv.fish \
	~/.config/fish/functions/fzf_key_bindings.fish \
	~/.tmux.conf \
	~/.config/nvim/init.vim \
	~/.local/share/nvim/site/autoload/plug.vim \
	~/.gitconfig-global \
	~/.gitignore-global \
	;

~/.config/fish/config.fish: .config/fish/config.fish
	mkdir -p $(@D)
	cp $< $@

~/.config/fish/fish_variables: .config/fish/fish_variables
	mkdir -p $(@D)
	cp $< $@

~/.config/fish/functions/cd.fish: .config/fish/functions/cd.fish
	mkdir -p $(@D)
	cp $< $@

~/.config/fish/functions/activate_python_venv.fish: .config/fish/functions/activate_python_venv.fish
	mkdir -p $(@D)
	cp $< $@

~/.config/fish/functions/fzf_key_bindings.fish:
	curl --fail --create-dirs --output $@ \
		https://raw.githubusercontent.com/junegunn/fzf/master/shell/key-bindings.fish
	sed -i -E 's,ct fzf-file-widget,cy fzf-file-widget,g' $@

~/.tmux.conf: .tmux.conf
	cp $< $@

~/.config/nvim/init.vim: .config/nvim/init.vim
	mkdir -p $(@D)
	cp $< $@

~/.local/share/nvim/site/autoload/plug.vim:
	curl --fail --location --create-dirs --output $@ \
		https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim

~/.gitconfig-global: .gitconfig-global
	grep --quiet 'path = ~/.gitconfig-global' ~/.gitconfig \
		|| bash -c 'echo -e "\n[include]\n\tpath = ~/.gitconfig-global" | tee --append ~/.gitconfig'
	cp $< $@

~/.gitignore-global: .gitignore-global
	cp $< $@
