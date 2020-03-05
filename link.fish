set -q HOME

find . -type d -name '.git' -prune -o -type d -print0 | xargs -0 -L 1 -I {} mkdir -pv $HOME/{}
find . -type d -name '.git' -prune -o -type f -print0 | xargs -0 -L 1 -I {} ln -f -s (pwd)/{} $HOME/{}
