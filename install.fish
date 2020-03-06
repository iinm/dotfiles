set -q HOME

echo "--- Make directories"
find . -type d -name '.git' -prune -o -type d -print0 | xargs -0 -L 1 -I {} mkdir -pv $HOME/{}

echo "--- Make symbolic links"
find . -type d -name '.git' -prune -o -type f -not -name '.gitignore' -not -name 'README.md' -not -name 'install.fish' -print0 | xargs -0 -L 1 -I {} ln -v -f -s (pwd)/{} $HOME/{}

echo "--- Configure git"
if ! grep -q 'path = ~/.gitconfig-global' ~/.gitconfig
  echo -e "\n[include]\n\tpath = ~/.gitconfig-global" | tee -a ~/.gitconfig
end
