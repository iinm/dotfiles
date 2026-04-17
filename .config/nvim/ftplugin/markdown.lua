-- Preview markdown with previm
vim.keymap.set('n', '<leader>p', '<Cmd>PrevimOpen<CR>', { buffer = true })

-- Open plain-agent memory directory
vim.keymap.set('n', '<leader>m', '<Cmd>e .plain-agent/memory<CR>', { buffer = true })
