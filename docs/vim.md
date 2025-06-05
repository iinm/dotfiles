# Vim / Nvim

| Category      | Command/Operation                    | Description                                                                                                    |
| ------------- | ------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| start         | `vim -u NONE`                        | does not load init.lua                                                                                         |
| open file     | `:e **/foo.sh`                       |                                                                                                                |
|               | `:e %:h/`                            | open directory of current file                                                                                 |
|               | `:sp foo.sh`                         | split                                                                                                          |
|               | `:vsp foo.sh`                        | vsplit                                                                                                         |
| motions       | `}`                                  | next paragraph                                                                                                 |
|               | `{`                                  | previous paragraph                                                                                             |
|               | `gj`                                 | move down by display line (wrapped line aware)                                                                |
|               | `gk`                                 | move up by display line (wrapped line aware)                                                                  |
|               | `C-f`                                | next page                                                                                                      |
|               | `C-b`                                | previous page                                                                                                  |
| scroll        | `zz`                                 | center                                                                                                         |
|               | `zt`                                 | top                                                                                                            |
|               | `zb`                                 | bottom                                                                                                         |
| search        | `/foo` -> `n` -> `N`                 | next -> previous                                                                                               |
|               | `*`                                  | next <cword>                                                                                                   |
|               | `#`                                  | previous <cword>                                                                                               |
| command       | `:foo`                               |                                                                                                                |
|               | `:execute "normal! ..."`             | execute normal mode command (`execute` will handle special characters like `<CR>`, `normal!` ignores mappings) |
|               | `:foo <C-r>"`                        | paste from register                                                                                            |
| replace       | `:%s/foo/bar/g`                      |                                                                                                                |
|               | `:%s/<C-r>//bar/g`                   | replace last search                                                                                            |
| marks         | `:marks`                             |                                                                                                                |
|               | `ma`                                 | set mark a                                                                                                     |
|               | `` `a``                              | jump to mark a                                                                                                 |
|               | `` ` ` ``                            | jump to previous mark                                                                                          |
|               | `:delmarks a`                        | delete mark a                                                                                                  |
|               | `:delmarks!`                         | delete all marks                                                                                               |
| jumps         | `:jumps` -> `[N] Ctrl-o` or `Ctrl-i` | older location or newer location                                                                               |
| recent files  | `:browse oldfiles`                   |                                                                                                                |
|               | `:browse filter /foo.*/ oldfiles`    |                                                                                                                |
| grep          | `:grep! foo` -> `:cw`                |                                                                                                                |
|               | `:grep! foo %`                       | current buffer                                                                                                 |
|               | `:grep! <cword>`                     | cursor word                                                                                                    |
|               | `:grep! \b<cword>\b`                 |                                                                                                                |
| close buffers | `:bd foo*` -> `Ctrl-a`               | close all matched                                                                                              |
|               | `:%bd` -> `C-o`                      | close all -> back to previous buffer                                                                           |
| window        | `C-w C-w`                            | next window                                                                                                    |
|               | `C-w` -> `o`                         | close other windows                                                                                            |
|               | `C-w` -> `=`                         | equalize window size                                                                                           |
|               | `C-w` -> `_`                         | maximize height                                                                                                |
|               | `C-w` -> `\|`                        | maximize width                                                                                                 |
|               | `C-w` -> `c`                         | close                                                                                                          |
| netrw         | `:e .`                               |                                                                                                                |
|               | `:e .` -> `i` -> `i` -> `i`          | tree view                                                                                                      |
|               | `:e .` -> `p`                        | preview                                                                                                        |
|               | `:e .` -> `d`                        | make directory                                                                                                 |
|               | `:e .` -> `%`                        | new file                                                                                                       |
|               | `:e .` -> `D`                        | delete                                                                                                         |
|               | `:e .` -> `R`                        | rename                                                                                                         |
|               | `:e .` -> `mt` -> `mf` -> `mm`       | mark target -> markfile -> move                                                                                |
|               | `:e .` -> `mt` -> `mf` -> `mc`       | mark target -> markfile -> copy                                                                                |
|               | `:e .` -> `mu`                       | unmark all                                                                                                     |
| quickfix      | `:cw(indow)`                         | open quickfix window                                                                                           |
|               | `:colder`                            | older quickfix list                                                                                            |
|               | `:cnewer`                            | newer quickfix list                                                                                            |
|               | `:cdo %s/foo/bar/g`                  | replace in quickfix list                                                                                       |
| open path     | `gf`                                 | goto file                                                                                                      |
|               | `gx`                                 | xdg-open                                                                                                       |
|               | `C-w gf`                             | open in new tab                                                                                                |
| folding       | `zc`, `zo`, `zO`                     | close, open, open all                                                                                          |
| spell         | `]s`, `[s`                           | next, previous                                                                                                 |
|               | `z=`                                 | suggestions                                                                                                    |
|               | `zg`                                 | add word to spellfile                                                                                          |
|               | `zw`                                 | remove word from spellfile                                                                                     |
