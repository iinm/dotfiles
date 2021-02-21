function cd
  builtin cd $argv

  if type --quiet activate_python_venv
    activate_python_venv
  end
end
