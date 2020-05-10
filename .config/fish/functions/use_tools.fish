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
      __tools_bin_dir $link
    end
  end

  function default --argument-names name_pattern --description "Set default version"
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
        __tools_bin_dir $tool_dir
      end \
        | grep "$name_pattern" \
        | fzf
    )
    set -gx PATH "$path" $PATH
  end

  function __tools_bin_dir --argument-names tool_dir --description "Find and show bin directory"
    if test -d $tool_dir/bin
      echo $tool_dir/bin
      return
    end

    set bin_dir (
      find $tool_dir/ -maxdepth 3 -type d -name 'bin' \
        | awk '{ print length, $0 }' \
        | sort -n \
        | awk '{ print $2 }' \
        | head -1 | sed 's,//,/,g'
    )
    if test -n "$bin_dir"
      echo $bin_dir
      return
    end

    echo $tool_dir
  end

  function __tools_trim_version --argument-names name_with_version --description "Trim version string"
    sed -E 's/^([a-zA-Z-]+[a-zA-Z]).*/\1/' \
      | sed -E 's/(.+)-(latest|v)/\1/'
  end

end
