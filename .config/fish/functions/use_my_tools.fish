# Example directory structure
#
#   $MY_TOOLS
#     \__ bin/
#     \__ foo -> foo-0.2/
#     \__ foo-0.1/
#     \__ foo-0.2/
#     \__ bar -> bar-latest/
#     \__ bar-latest/

function use_my_tools

  if test -z "$MY_TOOLS"
    echo 'warning: $MY_TOOLS is not set' >&2
    return 0
  end

  function my_tools_default_path --description "Show default path"
    echo $MY_TOOLS/bin
    for link in (find $MY_TOOLS -mindepth 1 -maxdepth 1 -type l)
      __my_tools_bin_path $link
    end
  end

  function my_tools_link_default --argument-names name_pattern --description "Set default version by creating symlink"
    # $MY_TOOLS/foo-1.0
    set version_dir (find $MY_TOOLS -mindepth 1 -maxdepth 1 -type d | grep "$name_pattern" | fzf)
    # $MY_TOOLS/foo
    set default_version_link $MY_TOOLS/(basename "$version_dir" | __my_tools_trim_version)
    # remove if link exists
    test -L "$default_version_link" && rm -vf "$default_version_link"
    # abort if file exists
    test -e "$default_version_link" && return 1
    # link default
    ln -vs (basename "$version_dir") "$default_version_link"
  end

  function my_tools_use --argument-names name_pattern --description "Set PATH for current shell"
    # $MY_TOOLS/foo-1.0/bin
    set path (
      for tool_dir in (find $MY_TOOLS -mindepth 1 -maxdepth 1 -type d)
        __my_tools_bin_path $tool_dir
      end \
        | grep "$name_pattern" \
        | fzf
    )
    # $MY_TOOLS/foo-1.0/bin -> $MY_TOOLS/foo-1.0
    set tool_dir (echo "$path" | sed -E 's,(.+)/bin,\1,')
    # $MY_TOOLS/foo-1.0 -> $MY_TOOLS/foo
    set path_pattern \
      (dirname "$tool_dir")/(basename "$tool_dir" | __my_tools_trim_version)
    set -gx PATH "$path" (echo $PATH | tr ' ' '\n' | grep -vE "^$path_pattern")
  end

  function __my_tools_bin_path --argument-names tool_dir --description "Show path for a tool directory"
    if test -d $tool_dir/bin
        echo $tool_dir/bin
      else
        echo $tool_dir
      end
  end

  function __my_tools_trim_version --argument-names name_with_version --description "Trim version e.g. foo-1.0 -> foo"
    sed -E 's/^([a-zA-Z-]+[a-zA-Z]).*/\1/' \
      | sed -E 's/(.+)-(latest|v)/\1/'
  end

end
