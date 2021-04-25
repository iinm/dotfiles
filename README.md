# config

a.k.a. dotfiles

## How to install

```sh
# Create symlink
bash link.sh

# Enable git config
echo -e "\n[include]\n\tpath = ~/.gitconfig-global" >> ~/.gitconfig

# Enable fzf key bindings for fish
curl https://raw.githubusercontent.com/junegunn/fzf/master/shell/key-bindings.fish \
  | sed 's,ct fzf-file-widget,cy fzf-file-widget,g' \
  > ~/.config/fish/functions/fzf_key_bindings.fish
```
