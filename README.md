# bindiff-mcp

A Model Context Protocol (MCP) server that provides AI-powered binary analysis and comparison capabilities. This server wraps GNU binutils (`objdump`, `nm`, `readelf`, `size`) to enable semantic understanding of binary changes between builds.

## Features

- **Binary Analysis**: Comprehensive analysis of ELF binaries (architecture, sections, symbols)
- **Symbol Listing**: List and filter symbols with demangling support
- **Function Analysis**: List functions sorted by size, name, or address
- **Binary Comparison**: Compare two binaries and show size changes
- **Symbol Diffing**: Detailed symbol-level differences between binaries
- **Section Diffing**: Compare sections between binaries
- **Disassembly**: Disassemble specific functions
- **Hex Dumps**: Hex dump sections or address ranges

## Documentation

- [Installation](docs/installation.md) - Detailed setup instructions
- [Configuration](docs/configuration.md) - Claude Desktop and Claude Code setup
- [Tools Reference](docs/tools.md) - Complete tool documentation
- [Examples](docs/examples.md) - Usage examples and prompts

## Prerequisites

- Node.js 20+
- GNU binutils (`nm`, `objdump`, `readelf`, `size`)

### Installing binutils

**Windows (MSYS2/Git Bash):**
```bash
pacman -S binutils
```

**Windows (WSL):**
```bash
sudo apt install binutils
```

**macOS:**
```bash
brew install binutils
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt install binutils
```

## Installation

```bash
npm install
npm run build
```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration (`~/.config/claude/claude_desktop_config.json` on Linux/macOS or `%APPDATA%\Claude\claude_desktop_config.json` on Windows):

```json
{
  "mcpServers": {
    "bindiff": {
      "command": "node",
      "args": ["/path/to/bindiff-mcp/dist/index.js"],
      "env": {
        "BINDIFF_TOOLCHAIN_PREFIX": ""
      }
    }
  }
}
```

### Cross-compilation Support

For analyzing ARM64 binaries on an x86 machine, use a cross-toolchain:

```json
{
  "mcpServers": {
    "bindiff": {
      "command": "node",
      "args": ["/path/to/bindiff-mcp/dist/index.js"],
      "env": {
        "BINDIFF_TOOLCHAIN_PREFIX": "aarch64-linux-gnu-"
      }
    }
  }
}
```

## Available Tools

### Analysis Tools

#### `analyze_binary`
Comprehensive analysis of a binary file.

```
Input:
- binary_path: Path to the binary file
- detailed: (optional) Include detailed breakdown

Output: File format, architecture, entry point, section sizes, symbol counts
```

#### `list_symbols`
List symbols from a binary.

```
Input:
- binary_path: Path to the binary file
- symbol_type: (optional) "defined", "undefined", or "all"
- demangle: (optional) Demangle C++ names (default: true)
```

#### `list_functions`
List all functions with their sizes.

```
Input:
- binary_path: Path to the binary file
- sort_by: (optional) "name", "size", or "address"
- filter: (optional) Regex pattern to filter names
```

#### `get_sections`
List all sections in an ELF binary.

```
Input:
- binary_path: Path to the binary file
```

#### `disassemble_function`
Disassemble a specific function.

```
Input:
- binary_path: Path to the binary file
- function_name: Name of the function
- syntax: (optional) "att" or "intel" (x86 only)
```

#### `get_size_breakdown`
Detailed size analysis showing largest symbols.

```
Input:
- binary_path: Path to the binary file
- top_n: (optional) Number of top symbols (default: 20)
- by_section: (optional) Group by section type
```

### Comparison Tools

#### `compare_binaries`
High-level comparison of two binaries.

```
Input:
- binary_a: Path to first (old) binary
- binary_b: Path to second (new) binary

Output: Size changes, function counts, symbol summary, top changes
```

#### `diff_symbols`
Detailed symbol-level diff between binaries.

```
Input:
- binary_a: Path to first (old) binary
- binary_b: Path to second (new) binary
- symbol_type: (optional) "function", "object", or "all"
```

#### `diff_sections`
Compare sections between binaries.

```
Input:
- binary_a: Path to first (old) binary
- binary_b: Path to second (new) binary
```

#### `hexdump_section`
Hex dump of a section or address range.

```
Input:
- binary_path: Path to the binary file
- section: (optional) Section name (e.g., ".text")
- start_address: (optional) Start address (hex)
- length: (optional) Bytes to dump (default: 256)
```

## Example Prompts

Once configured with Claude, you can ask questions like:

- "Analyze the binary at /path/to/myapp"
- "Compare /build/v1/app with /build/v2/app and tell me what changed"
- "What are the largest functions in this binary?"
- "Show me the disassembly of the main function"
- "Which symbols were added between these two builds?"
- "Why did the binary size increase by 50KB?"

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `BINDIFF_TOOLCHAIN_PREFIX` | Prefix for binutils commands (e.g., `aarch64-linux-gnu-`) | (none) |

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode (auto-rebuild)
npm run dev

# Run tests
npm test
```

## License

ISC