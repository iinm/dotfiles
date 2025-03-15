local efm_root_markers = {}

local tools = {
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
  },
  formatters = {
    prettier = {
      formatCommand = 'npx --no-install prettier --stdin-filepath ${INPUT}',
      formatStdin = true,
      rootMarkers = {
        '.prettierrc.json',
        '.prettierrc',
      },
    },
    biome = {
      formatCommand = 'npx --no-install @biomejs/biome format --stdin-file-path ${INPUT}',
      formatStdin = true,
      rootMarkers = {
        'biome.json',
      },
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

local default_settings = {
  rootMarkers = { ".git/" },
  languages = {
    sh = {
      tools.linters.shellcheck,
    },
    javascript = {
      tools.formatters.prettier,
    },
    typescript = {
      tools.formatters.prettier,
    },
    typescriptreact = {
      tools.formatters.prettier,
    },
    go = {
      tools.formatters.gofmt,
    },
    terraform = {
      tools.formatters.terraform_fmt,
    },
    json = {
      tools.formatters.prettier,
    },
  }
}

return {
  tools = tools,
  default_settings = default_settings,
}
