# Tools Reference

bindiff-mcp provides 10 tools for binary analysis and comparison.

---

## Analysis Tools

### analyze_binary

Provides a comprehensive overview of a binary file including format, architecture, sections, and symbol statistics.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `binary_path` | string | yes | Path to the binary file |
| `detailed` | boolean | no | Include top functions and data objects |

**Output includes:**
- File format (ELF32/ELF64)
- Architecture (x86-64, AArch64, ARM, etc.)
- Entry point address
- Endianness
- Section sizes (.text, .data, .rodata, .bss)
- Symbol counts (functions, data objects, undefined)

When `detailed` is true, also shows:
- Top 10 largest functions by size
- Top 10 largest data objects by size

---

### list_symbols

Lists symbols from a binary with optional filtering.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `binary_path` | string | yes | Path to the binary file |
| `symbol_type` | string | no | Filter: "defined", "undefined", or "all" (default: "all") |
| `demangle` | boolean | no | Demangle C++ names (default: true) |

**Output includes:**
- Address (hex)
- Size in bytes
- Symbol type (text, data, BSS, etc.)
- Symbol name

Limited to first 100 symbols to avoid overwhelming output.

---

### list_functions

Lists functions in a binary with sorting and filtering options.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `binary_path` | string | yes | Path to the binary file |
| `sort_by` | string | no | "name", "size", or "address" (default: "size") |
| `filter` | string | no | Regex pattern to filter function names |

**Output includes:**
- Total function count
- Total code size
- Per-function: address, size, name

Limited to first 50 functions.

**Filter examples:**
- `"^main"` - Functions starting with "main"
- `"init"` - Functions containing "init"
- `"^_Z"` - Mangled C++ functions

---

### get_sections

Lists all sections in an ELF binary.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `binary_path` | string | yes | Path to the binary file |

**Output includes:**
- Section index
- Name (.text, .data, .rodata, etc.)
- Type (PROGBITS, NOBITS, SYMTAB, etc.)
- Address
- Size
- Flags (AX = allocate+execute, WA = write+allocate, etc.)

---

### disassemble_function

Disassembles a specific function from a binary.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `binary_path` | string | yes | Path to the binary file |
| `function_name` | string | yes | Exact function name to disassemble |
| `syntax` | string | no | "att" or "intel" (default: "intel", x86 only) |

**Notes:**
- Function name must match exactly (case-sensitive)
- For C++ functions, use the demangled name
- Output is formatted as an assembly code block

---

### get_size_breakdown

Shows detailed size analysis with largest symbols and section breakdown.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `binary_path` | string | yes | Path to the binary file |
| `top_n` | number | no | Number of top symbols to show (default: 20) |
| `by_section` | boolean | no | Group results by section type (default: false) |

**Output includes:**
- Section sizes sorted by size
- Total size

When `by_section` is false:
- Top N largest symbols overall

When `by_section` is true:
- Top N largest functions
- Top N largest data objects

---

## Comparison Tools

### compare_binaries

High-level comparison between two binaries showing size changes and symbol differences.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `binary_a` | string | yes | Path to first (old/baseline) binary |
| `binary_b` | string | yes | Path to second (new) binary |

**Output includes:**
- Side-by-side file info (architecture, format)
- Size changes (total, .text section)
- Function count changes
- Symbol summary (added, removed, modified counts)
- Top 10 size changes
- Top 10 new symbols
- Top 10 removed symbols

---

### diff_symbols

Detailed symbol-level diff between two binaries.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `binary_a` | string | yes | Path to first (old) binary |
| `binary_b` | string | yes | Path to second (new) binary |
| `symbol_type` | string | no | "function", "object", or "all" (default: "all") |

**Output includes:**
- Summary (added, removed, modified counts, net size change)
- Modified symbols with old size, new size, change, and percentage
- Added symbols with sizes
- Removed symbols with sizes

Limited to 50 symbols per category.

---

### diff_sections

Compares sections between two binaries.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `binary_a` | string | yes | Path to first (old) binary |
| `binary_b` | string | yes | Path to second (new) binary |

**Output includes:**
- Summary (added, removed, modified section counts)
- Net size change
- Modified sections with size changes
- Added sections
- Removed sections

---

### hexdump_section

Produces a hex dump of a section or address range.

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `binary_path` | string | yes | Path to the binary file |
| `section` | string | no | Section name (e.g., ".text", ".rodata") |
| `start_address` | string | no | Start address in hex (e.g., "0x1000") |
| `length` | number | no | Bytes to dump (default: 256) |

**Notes:**
- Specify either `section` or `start_address`, not both
- Output is formatted as a hex dump with ASCII representation

---

## Symbol Types

When working with symbols, the following type codes are used:

| Code | Meaning |
|------|---------|
| T/t | Text (code) section - functions |
| D/d | Initialized data |
| B/b | BSS (uninitialized data) |
| R/r | Read-only data |
| U | Undefined (external reference) |
| W/w | Weak symbol |
| A | Absolute |
| C | Common |

Uppercase = global, lowercase = local.
