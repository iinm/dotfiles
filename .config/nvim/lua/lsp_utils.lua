--- @class ItemTreeNode
--- @field item table
--- @field level number
--- @field children table<string, ItemTreeNode>

--- @param direction string: 'incoming' or 'outgoing'
--- @param max_depth number: The maximum depth to trace the call hierarchy
local function lsp_call_hierarchy_recursive(direction, max_depth)
  local lsp = require('vim.lsp')
  local params = lsp.util.make_position_params()

  lsp.buf_request(0, 'textDocument/prepareCallHierarchy', params, function(err, result)
    if err or not result or vim.tbl_isempty(result) then
      vim.notify('No call hierarchy found', vim.log.levels.INFO)
      return
    end

    --- @type ItemTreeNode
    local item_tree_root = {
      item = result[1],
      level = 0,
      children = {},
    }
    local pending_requests = 0

    --- @param item table: The call hierarchy item
    --- @param parent_node ItemTreeNode: The parent node in the item tree
    --- @param on_trace_complete function: The function to call when the hierarchy is fully traced
    local function trace_hierachy(item, parent_node, on_trace_complete)
      if parent_node.level >= max_depth then
        vim.notify('Max depth reached ' .. max_depth, vim.log.levels.WARN)
        return
      end

      vim.notify(string.format('Tracing %s (Level: %d)', item.name, parent_node.level), vim.log.levels.INFO)
      local method = direction == 'incoming' and 'callHierarchy/incomingCalls' or 'callHierarchy/outgoingCalls'
      pending_requests = pending_requests + 1
      lsp.buf_request(0, method, { item = item }, function(call_err, call_result)
        pending_requests = pending_requests - 1
        if call_err then
          vim.notify('Error while tracing call hierarchy: ' .. call_err, vim.log.levels.ERROR)
          -- stop recursion
        elseif not call_result then
          vim.notify('No call hierarchy found', vim.log.levels.ERROR)
          -- stop recursion
        else
          for _, call in ipairs(call_result) do
            local call_target = direction == 'incoming' and call.from or call.to
            local item_key = string.format(
              '%s:%d,%d',
              call_target.uri,
              call_target.selectionRange.start.line,
              call_target.selectionRange.start.character
            )
            parent_node.children[item_key] = {
              item = call_target,
              level = parent_node.level + 1,
              children = {},
            }
            trace_hierachy(
              call_target,
              parent_node.children[item_key],
              on_trace_complete
            )
          end
        end

        if pending_requests == 0 then
          vim.notify('Trace complete', vim.log.levels.INFO)
          on_trace_complete(item_tree_root)
        end
      end)
    end

    local function trace_item_tree(item_tree, nodes)
      -- depth-first search
      table.insert(nodes, { item = item_tree.item, level = item_tree.level })
      for _, child_node in pairs(item_tree.children) do
        trace_item_tree(child_node, nodes)
      end
    end

    local function on_trace_complete(item_tree)
      local nodes = {}
      trace_item_tree(item_tree, nodes)

      local quickfix_items = {}
      for _, node in ipairs(nodes) do
        local item = node.item
        local indent = string.rep('　　', node.level)
        local filename = vim.uri_to_fname(item.uri)
        local filename_relative = vim.fn.fnamemodify(filename, ':~:.')
        table.insert(quickfix_items, {
          text = string.format('%s└ %s (%s)', indent, item.name, filename_relative),
          filename = filename,
          lnum = item.selectionRange.start.line + 1,
          col = item.selectionRange.start.character + 1,
        })
      end

      vim.fn.setqflist({}, ' ', { title = 'Call Hierarchy Recursive', items = quickfix_items })
      vim.cmd [[
        cwindow
        setlocal nowrap
        syntax match ConcealedDetails /\v^[^|]*\|[^|]*\| / conceal
        setlocal conceallevel=2
        setlocal concealcursor=nvic
        syntax match Grey /\v\(.+\)/ " filename
      ]]
    end

    trace_hierachy(
      item_tree_root.item,
      item_tree_root,
      on_trace_complete
    )
  end)
end

return {
  lsp_call_hierarchy_recursive = lsp_call_hierarchy_recursive,
}
