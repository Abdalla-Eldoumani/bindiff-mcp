# Examples

Requests you can give an MCP client that has bindiff-mcp connected, and the tools that answer them. The client picks the tools; the server only runs binutils and returns the reports. Any judgment on top of that, such as what to optimize, comes from the client's model, not from the server.

## Look at one binary

| Request | Tools |
|---|---|
| "What's in /usr/bin/ls?" | `analyze_binary` |
| "What are the 10 largest functions in ./build/app?" | `list_functions` with `sort_by: "size"` |
| "Which functions have `parse` in the name?" | `list_functions` with `filter: "parse"` |
| "What does this binary import from shared libraries?" | `list_symbols` with `symbol_type: "undefined"` |
| "What does this library export?" | `list_symbols` with `symbol_type: "defined"` |
| "Show me the assembly for `parse_config`." | `disassemble_function` |
| "Dump the start of `.rodata`." | `hexdump_section` with `section: ".rodata"` |

## Find out what changed between builds

| Request | Tools |
|---|---|
| "Compare ./v1.0/app with ./v1.1/app." | `compare_binaries` |
| "The binary grew by 50 KB between releases. Where did it go?" | `compare_binaries`, then `diff_symbols` and `diff_sections` |
| "Only show function changes between old.elf and new.elf." | `diff_symbols` with `symbol_type: "function"` |
| "Did the growth come from code or data?" | `diff_sections` |
| "`process_data` grew by 500 bytes. Show it in both builds." | `disassemble_function` on each binary |

## Fit firmware into flash

Ask for the size of `firmware.elf` and what is taking the space. `analyze_binary` gives the `.text`, `.data`, `.rodata` and `.bss` sizes, and `get_size_breakdown` lists the largest symbols. Flash usage is roughly `.text` plus `.rodata` plus `.data`; the section total in `get_size_breakdown` also counts symbol and debug sections that are never written to flash.

For an ARM microcontroller, register the server with `BINDIFF_TOOLCHAIN_PREFIX=arm-none-eabi-` so `disassemble_function` can disassemble the code.

## Tips

- Use absolute paths.
- Put the older binary first (`binary_a`) in comparisons, so a positive change means growth.
- Symbol names are demangled, so filter and disassemble C++ functions by their demangled names.
- Output lists are capped (100 symbols, 50 functions, 50 per diff category). Narrow the request with `filter` or `symbol_type` when the list is cut.
