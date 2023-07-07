function setup_tools
  fish_add_path -g /opt/homebrew/sbin
  fish_add_path -g /opt/homebrew/bin

  set -l tools $HOME/tools
  fish_add_path -g $tools/bin
  fish_add_path -g $tools/nvim/bin
  fish_add_path -g $tools/node/bin
  fish_add_path -g $tools/google-cloud-sdk/bin

  if status is-interactive
    if type --quiet colima
      alias colima_start 'colima start --cpu 2 --memory 4 --disk 30'
    end

    if test -e $tools/anaconda3
      function use_anaconda
        eval "$($tools/anaconda3/bin/conda shell.fish hook)"
      end
    end
  end
end
