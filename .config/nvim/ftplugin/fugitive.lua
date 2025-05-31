-- Remap F1 (help) to ToggleTerm
vim.keymap.set('n', '<F1>', '<Cmd>CloseTerms<CR><Cmd>1ToggleTerm<CR>', { buffer = true })
