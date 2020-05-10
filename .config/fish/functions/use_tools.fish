# Example directory structure
#
#   $TOOLS
#     \__ bin/
#     \__ foo -> foo-0.2/
#     \__ foo-0.1/
#     \__ foo-0.2/
#     \__ bar -> bar-latest/
#     \__ bar-latest/

function use_tools

  if test -z "$TOOLS"
    echo 'warning: $TOOLS is not set' >&2
    return 0
  end

  function tools_default_path --description "Show default path"
    echo $TOOLS/bin
    for link in (find $TOOLS -mindepth 1 -maxdepth 1 -type l)
      __tools_bin_path $link
    end
  end

  function default --argument-names name_pattern --description "Set default version by creating symlink"
    # $TOOLS/foo-1.0
    set version_dir (find $TOOLS -mindepth 1 -maxdepth 1 -type d | grep "$name_pattern" | fzf)
    # $TOOLS/foo
    set default_version_link $TOOLS/(basename "$version_dir" | __tools_trim_version)
    # remove if link exists
    test -L "$default_version_link" && rm -vf "$default_version_link"
    # abort if file exists
    test -e "$default_version_link" && return 1
    # link default
    ln -vs (basename "$version_dir") "$default_version_link"
  end

  function use --argument-names name_pattern --description "Set PATH for current shell"
    # $TOOLS/foo-1.0/bin
    set path (
      for tool_dir in (find $TOOLS -mindepth 1 -maxdepth 1 -type d)
        __tools_bin_path $tool_dir
      end \
        | grep "$name_pattern" \
        | fzf
    )
    # $TOOLS/foo-1.0/bin -> $TOOLS/foo-1.0
    set tool_dir (echo "$path" | sed -E 's,(.+)/bin,\1,')
    # $TOOLS/foo-1.0 -> $TOOLS/foo
    set path_pattern \
      (dirname "$tool_dir")/(basename "$tool_dir" | __tools_trim_version)
    set -gx PATH "$path" (echo $PATH | tr ' ' '\n' | grep -vE "^$path_pattern")
  end

  function __tools_bin_path --argument-names tool_dir --description "Show path for a tool directory"
    if test -d $tool_dir/bin
        echo $tool_dir/bin
      else
        echo $tool_dir
      end
  end

  function __tools_trim_version --argument-names name_with_version --description "Trim version e.g. foo-1.0 -> foo"
    sed -E 's/^([a-zA-Z-]+[a-zA-Z]).*/\1/' \
      | sed -E 's/(.+)-(latest|v)/\1/'
  end

end
