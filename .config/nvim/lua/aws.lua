local M = {}

function M.use_aws_credential(aws_profile)
  local cached_aws_creds = nil

  local update_aws_creds_from_json = function(output)
    local ok, creds = pcall(vim.json.decode, output)
    if not ok or not creds then
      vim.schedule(function()
        vim.notify("Failed to parse AWS credentials JSON: " .. tostring(creds), vim.log.levels.ERROR)
      end)
      return nil
    end

    local expire_at = 0
    if creds.Expiration then
      local year, month, day, hour, min, sec = creds.Expiration:match("(%d+)-(%d+)-(%d+)T(%d+):(%d+):(%d+)")
      if year then
        local local_expire = os.time({
          year = tonumber(year) --[[@as number]],
          month = tonumber(month) --[[@as number]],
          day = tonumber(day) --[[@as number]],
          hour = tonumber(hour),
          min = tonumber(min),
          sec = tonumber(sec),
        })
        local utc_now = os.time(os.date("!*t") --[[@as osdateparam]])
        local local_now = os.time()
        local timezone_offset = os.difftime(local_now, utc_now)
        expire_at = local_expire + timezone_offset
      end
    else
      -- If no expiration is provided (e.g. static IAM credentials), cache for 1 day
      expire_at = os.time() + 86400
    end

    cached_aws_creds = {
      access_key = creds.AccessKeyId,
      secret_key = creds.SecretAccessKey,
      session_token = creds.SessionToken,
      expire_at = expire_at,
    }

    return cached_aws_creds
  end

  local refresh_aws_credentials = function()
    vim.schedule(function()
      vim.notify("Refreshing AWS credentials for minuet", vim.log.levels.INFO)
    end)
    vim.system({ 'aws', 'configure', 'export-credentials', '--profile', aws_profile }, { text = true }, function(obj)
      if obj.code ~= 0 then
        vim.schedule(function()
          vim.notify("Failed to retrieve AWS credentials: " .. (obj.stderr or ""), vim.log.levels.WARN)
        end)
        return
      end
      update_aws_creds_from_json(obj.stdout)
      vim.schedule(function()
        vim.notify("AWS credentials refreshed", vim.log.levels.INFO)
      end)
    end)
  end

  local get_aws_credentials = function()
    if cached_aws_creds and os.time() < cached_aws_creds.expire_at then
      return cached_aws_creds
    end
    refresh_aws_credentials()
    return nil
  end

  refresh_aws_credentials()

  return {
    get_aws_credentials = get_aws_credentials
  }
end

return M
