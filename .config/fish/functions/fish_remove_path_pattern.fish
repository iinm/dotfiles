function fish_remove_path_pattern
  set -l pattern $argv[1]
  for path in (string match -r $pattern $PATH)
    set -l index (contains -i $path $PATH)
    set -e PATH[$index]
  end
end
