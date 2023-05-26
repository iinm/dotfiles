function with_notify
  set -l cmd $argv
  $cmd
  set -l cmd_status $status

  if test $cmd_status -eq 0
    notify -t "Success 🎉" -c "$cmd"
  else
    notify -t "Failed 🚨" -c "$cmd"
  end

  return $cmd_status
end
