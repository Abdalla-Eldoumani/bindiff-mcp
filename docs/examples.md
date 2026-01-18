# Examples

Practical examples of using bindiff-mcp with Claude.

## Basic binary analysis

**Prompt:**
> Analyze /usr/bin/ls and tell me about its structure

Claude will use `analyze_binary` to report:
- File format and architecture
- Section sizes
- Function and symbol counts

**Prompt:**
> What are the 10 largest functions in /usr/bin/grep?

Claude will use `list_functions` with `sort_by: "size"` to identify the biggest functions.

## Comparing builds

**Prompt:**
> Compare ./build/v1.0/myapp with ./build/v1.1/myapp. What changed?

Claude will use `compare_binaries` to show:
- Total size change
- Code size change
- New, removed, and modified symbols
- Which functions grew or shrank

**Prompt:**
> The binary size increased by 50KB between releases. What's causing it?

Claude will use `compare_binaries` and `diff_symbols` to:
- Identify the largest new symbols
- Find functions that grew significantly
- Pinpoint where the size increase came from

## Investigating specific changes

**Prompt:**
> Show me only the function changes between old.elf and new.elf

Claude will use `diff_symbols` with `symbol_type: "function"` to filter out data objects and focus on code changes.

**Prompt:**
> Which sections changed between these builds?

Claude will use `diff_sections` to show per-section size changes, useful for identifying whether growth is in code, data, or read-only data.

## Size optimization

**Prompt:**
> I need to reduce the binary size. Show me what's taking up the most space.

Claude will use `get_size_breakdown` to list:
- Section sizes
- Largest functions
- Largest data objects

**Prompt:**
> Show me all functions larger than 1KB in my binary

Claude will use `list_functions` and filter the results to show only large functions that might be candidates for optimization.

## Debugging and reverse engineering

**Prompt:**
> Disassemble the parse_config function in myapp

Claude will use `disassemble_function` to show the assembly code for that specific function.

**Prompt:**
> What external libraries does this binary depend on?

Claude will use `list_symbols` with `symbol_type: "undefined"` to show unresolved symbols that must come from shared libraries.

**Prompt:**
> Show me the string constants in the .rodata section

Claude will use `hexdump_section` with `section: ".rodata"` to dump read-only data, which typically contains string literals.

## Embedded development

**Prompt:**
> Analyze my firmware.elf and tell me if it will fit in 256KB of flash

Claude will use `analyze_binary` and `get_size_breakdown` to:
- Calculate total code and data size
- Identify what's consuming the most space
- Suggest optimization targets if needed

**Prompt:**
> Compare the debug and release builds of my firmware

Claude will use `compare_binaries` to show how compiler optimizations affected:
- Overall binary size
- Individual function sizes
- Section layout

## Security analysis

**Prompt:**
> List all the functions in this binary that handle user input

Claude will use `list_functions` with a filter pattern to find functions with names like `parse`, `read`, `input`, `recv`, etc.

**Prompt:**
> What symbols does this binary export?

Claude will use `list_symbols` with `symbol_type: "defined"` to show the binary's public interface.

## Workflow example: tracking size regressions

1. Build baseline:
   ```
   > Analyze ./baseline.elf and save the function sizes for comparison
   ```

2. After changes:
   ```
   > Compare ./baseline.elf with ./current.elf. Did any functions grow by more than 10%?
   ```

3. Investigate specific regression:
   ```
   > The process_data function grew by 500 bytes. Disassemble it in both versions so I can see what changed.
   ```

## Tips

- Use absolute paths to avoid ambiguity
- For C++ binaries, function names are automatically demangled
- When comparing, always put the older/baseline binary first (binary_a)
- Filter results with regex patterns when looking for specific functions
- Use `detailed: true` with `analyze_binary` for a quick overview of what's large
