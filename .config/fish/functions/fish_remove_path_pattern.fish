function fish_remove_path_pattern --description "Remove PATH entries matching a regex pattern"
  if test (count $argv) -lt 1
    return 1
  end

  set -l pattern $argv[1]
  set -gx PATH (string match -rv -- $pattern $PATH)
end
