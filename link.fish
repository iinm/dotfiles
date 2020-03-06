set -q HOME

find . -type d -name '.git' -prune -o -type d -print0 | xargs -0 -L 1 -I {} mkdir -pv $HOME/{}
find . -type d -name '.git' -prune -o -type f -not -name '.gitignore' -not -name 'README.md' -not -name 'link.fish' -print0 | xargs -0 -L 1 -I {} ln -v -f -s (pwd)/{} $HOME/{}
