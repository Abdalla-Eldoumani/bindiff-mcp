# Tools

The server registers 10 tools. Each returns one Markdown text block. Errors (missing file, missing binutils, a tool exiting with an error) come back as a text block with `isError` set.

Paths can be absolute or relative to the server's working directory. Absolute paths avoid surprises, because the client decides the working directory.

How symbols are classified, here and below:

- Functions: `nm` type `T` or `t`.
- Data objects: `D`, `d`, `B`, `b`, `R` or `r`.
- Undefined: `U` or `w`. Everything else counts as defined.

Symbol names are demangled with `nm -C` unless a tool says otherwise. Sizes come from `nm --print-size`; a symbol with no recorded size counts as 0 bytes.

## Analysis of one binary

### analyze_binary

| Input | Type | Default | Notes |
|---|---|---|---|
| `binary_path` | string | required | |
| `detailed` | boolean | false | Add the 10 largest functions and 10 largest data objects |

Runs `readelf -h`, `readelf -S -W` and `nm --print-size -C`. Reports the ELF class (ELF32 or ELF64), machine, file type, entry point, endianness, the sizes of `.text`, `.data`, `.rodata` and `.bss` (0 when a section is absent), and counts of functions, data objects, defined symbols and undefined symbols.

### list_symbols

| Input | Type | Default | Notes |
|---|---|---|---|
| `binary_path` | string | required | |
| `symbol_type` | `defined`, `undefined`, `all` | `all` | |
| `demangle` | boolean | true | Pass `-C` to `nm` |

Prints the total count and a table of address, size, type and name for the first 100 symbols, in `nm` order.

### list_functions

| Input | Type | Default | Notes |
|---|---|---|---|
| `binary_path` | string | required | |
| `sort_by` | `size`, `name`, `address` | `size` | `size` sorts largest first |
| `filter` | string | none | JavaScript regular expression matched against the demangled name |

Prints the number of matching functions, their total size, and the first 50 with address, size and name. An invalid regular expression returns an error.

Filter examples: `^main` (names starting with `main`), `init` (names containing `init`), `^std::` (C++ standard library functions, since names are demangled).

### get_sections

| Input | Type | Default |
|---|---|---|
| `binary_path` | string | required |

Runs `readelf -S -W` and prints every section header: index, name, type, address, size and flags.

### disassemble_function

| Input | Type | Default | Notes |
|---|---|---|---|
| `binary_path` | string | required | |
| `function_name` | string | required | Exact, case-sensitive, as `objdump -C` prints it |
| `syntax` | `intel`, `att` | `intel` | Passed to `objdump` as `--disassembler-options`; only x86 uses it |

Runs `objdump -d -C` on the whole binary and keeps the lines from `<function_name>:` to the next blank line or function label. For C++ functions the demangled name includes the parameter list, for example `parse(char const*)`.

Because it disassembles everything first, it is slow on large binaries. Disassembling a binary for another architecture needs `BINDIFF_TOOLCHAIN_PREFIX` (see [configuration.md](configuration.md)).

### get_size_breakdown

| Input | Type | Default | Notes |
|---|---|---|---|
| `binary_path` | string | required | |
| `top_n` | number | 20 | |
| `by_section` | boolean | false | Split the symbol list into functions and data objects |

Lists every non-empty section by size and the sum of all section sizes. The sum includes non-loaded sections such as `.symtab`, `.strtab` and debug sections, so it is larger than what the program occupies in memory. Then it lists the `top_n` largest defined symbols, or with `by_section` the `top_n` largest functions and the `top_n` largest data objects.

### hexdump_section

| Input | Type | Default | Notes |
|---|---|---|---|
| `binary_path` | string | required | |
| `section` | string | none | Passed as `objdump -j` |
| `start_address` | string | none | Hex, passed as `objdump --start-address` |
| `length` | number | 256 | Approximate number of bytes to show |

Runs `objdump -s` with the options given. With neither `section` nor `start_address` it dumps every section. Both can be given together.

`objdump` has no length option, so the tool keeps the first `length / 16` lines (rounded up) that contain a colon. The `Contents of section` heading counts as one of those lines, so the dump shows up to 16 bytes fewer than asked, and the "Showing N of M bytes" note at the end is an estimate.

## Comparison of two binaries

Put the older or baseline binary in `binary_a` and the newer one in `binary_b`. Symbols are matched by name and sections by name. A symbol is "modified" when its size changed; changes to its code with the same size are not detected. If two symbols share a name (for example two `static` functions in different files), only one of them is compared.

### compare_binaries

| Input | Type | Default |
|---|---|---|
| `binary_a` | string | required |
| `binary_b` | string | required |

Reports, old against new:

- Machine and ELF class of each file.
- Total size (sum of all section sizes, including non-loaded ones) and `.text` size, with the change in bytes and percent.
- Function count change.
- Counts of added, removed and modified defined symbols, and the net size change across them.
- The 10 largest size changes, the 10 largest added symbols and the 10 largest removed symbols.

### diff_symbols

| Input | Type | Default | Notes |
|---|---|---|---|
| `binary_a` | string | required | |
| `binary_b` | string | required | |
| `symbol_type` | `function`, `object`, `all` | `all` | `function` here includes weak symbols (`W`, `w`) as well as `T` and `t` |

Lists modified symbols (old size, new size, change, percent), added symbols and removed symbols, up to 50 of each, with a summary of the counts and the net size change. Modified symbols are sorted by the size of the change; added and removed symbols by size.

### diff_sections

| Input | Type | Default |
|---|---|---|
| `binary_a` | string | required |
| `binary_b` | string | required |

Lists sections whose size changed (with change and percent), sections only in `binary_b`, sections only in `binary_a`, and the net size change.

## nm symbol types

| Code | Meaning |
|---|---|
| `T` / `t` | Code (global / local) |
| `D` / `d` | Initialized data |
| `B` / `b` | Uninitialized data (BSS) |
| `R` / `r` | Read-only data |
| `U` | Undefined, resolved from another object or library |
| `W` / `w` | Weak symbol; `w` is a weak symbol with no definition here |
| `A` | Absolute |
| `C` | Common |
| `N` | Debugging symbol |

Uppercase is global, lowercase is local, except for `w`.
