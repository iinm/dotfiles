local efm_root_markers = {
  eslint = {
    '.eslintrc.cjs',
    '.eslintrc.js',
    '.eslintrc.json',
  }
}

return {
  linters = {
    shellcheck = {
      lintCommand = 'shellcheck -f gcc -x',
      lintSource = 'shellcheck',
      lintFormats = {
        '%f:%l:%c: %trror: %m',
        '%f:%l:%c: %tarning: %m',
        '%f:%l:%c: %tote: %m',
      },
    },
    eslint = {
      lintCommand = 'bash $HOME/.config/efm-langserver/eslint-stdin.sh ${INPUT}',
      lintIgnoreExitCode = true,
      lintStdin = true,
      lintFormats = {
        '%f(%l,%c): %tarning %m',
        '%f(%l,%c): %trror %m',
        '%f(%l,%c): %tnfo %m',
      },
      rootMarkers = efm_root_markers.eslint,
    },
  },
  formatters = {
    prettier = {
      formatCommand = 'npx --no-install prettier --stdin-filepath ${INPUT}',
      formatStdin = true,
      rootMarkers = {
        '.prettierrc.json'
      },
    },
    eslint_fix = {
      formatCommand = 'bash $HOME/.config/efm-langserver/eslint-format-stdin.sh ${INPUT}',
      formatStdin = true,
      rootMarkers = efm_root_markers.eslint,
    },
    terraform_fmt = {
      formatCommand = 'terraform fmt -',
      formatStdin = true,
    },
    goimports = {
      formatCommand = 'goimports',
      formatStdin = true,
    },
  },
}
