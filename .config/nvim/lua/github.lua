local function git(args)
  local out = vim.system(vim.list_extend({ "git" }, args), { text = true }):wait()
  if out.code ~= 0 then
    error(out.stderr)
  end
  return vim.trim(out.stdout)
end

local function github_url(file, start_line, end_line)
  local root = git({ "-C", vim.fs.dirname(file), "rev-parse", "--show-toplevel" })
  local remote = git({ "-C", root, "remote", "get-url", "origin" })
  local branch = git({ "-C", root, "branch", "--show-current" })
  local relpath = vim.fs.relpath(root, file)

  remote = remote
      :gsub("^git@github.com:", "https://github.com/")
      :gsub("%.git$", "")

  local url = ("%s/blob/%s/%s"):format(remote, branch, relpath)

  if start_line then
    if end_line and end_line ~= start_line then
      url = url .. ("#L%d-L%d"):format(start_line, end_line)
    else
      url = url .. ("#L%d"):format(start_line)
    end
  end

  return url
end

local open_in_github_command = function(file_getter)
  return function(opts)
    local file = file_getter()
    local url = github_url(
      file,
      opts.range > 0 and opts.line1 or nil,
      opts.range > 1 and opts.line2 or nil
    )
    vim.ui.open(url)
  end
end

return {
  open_in_github_command = open_in_github_command
}
