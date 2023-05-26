function notify
  argparse 't/title=' 'c/content=' -- $argv; or return 1
  # echo $_flag_title $_flag_content
  if test -n "$TMUX"
    # tmux display-message -d 3000 "$_flag_title: $_flag_content"
    tmux display-popup -x R -y S -h 3 -w '40%' -T $_flag_title echo -n $_flag_content
  else if type --quiet osascript
    # darwin
    set -l escaped_title (printf '%s' $_flag_title | sed -e 's,",\\\\",g')
    set -l escaped_content (printf '%s' $_flag_content | sed -e 's,",\\\\",g')
    echo $escaped_title $escaped_content
    osascript -e "display notification \"$escaped_title\" with title \"$escaped_content\""
  else if type --quiet notify-send
    # linux
    notify-send "$_flag_title" "$_flag_content"
  end
end
