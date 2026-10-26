# bindiff-mcp

An MCP (Model Context Protocol) server for inspecting and comparing ELF binaries. It runs GNU binutils (`nm`, `objdump`, `readelf`, `size`) on the files you point it at, parses their output, and returns Markdown reports: what a binary contains, and what changed between two builds.

## Tools

Analysis of one binary:

| Tool | Inputs | Returns |
|------|--------|---------|
| `analyze_binary` | `binary_path`, `detailed?` | Format, architecture, entry point, section sizes, symbol counts |
| `list_symbols` | `binary_path`, `symbol_type?` (`defined`, `undefined`, `all`), `demangle?` (default true) | Symbol table |
| `list_functions` | `binary_path`, `sort_by?` (`size` default, `name`, `address`), `filter?` (regex) | Functions with sizes |
| `get_sections` | `binary_path` | Section headers |
| `disassemble_function` | `binary_path`, `function_name`, `syntax?` (`intel` default, `att`; x86 only) | `objdump` disassembly of that function |
| `get_size_breakdown` | `binary_path`, `top_n?` (default 20), `by_section?` | Largest symbols |
| `hexdump_section` | `binary_path`, `section?`, `start_address?` (hex), `length?` (default 256) | Hex dump |

Comparison of an old and a new binary:

| Tool | Inputs | Returns |
|------|--------|---------|
| `compare_binaries` | `binary_a`, `binary_b` | Total and `.text` size change, function count change, added, removed and resized symbols |
| `diff_symbols` | `binary_a`, `binary_b`, `symbol_type?` (`function`, `object`, `all`) | Symbol-level diff |
| `diff_sections` | `binary_a`, `binary_b` | Section-by-section size diff |

[docs/tools.md](docs/tools.md) has the full reference, and [docs/examples.md](docs/examples.md) has example requests.

## Requirements

- Node.js 20 or newer
- GNU binutils on `PATH`: `sudo apt install binutils` on Debian or Ubuntu, `pacman -S binutils` in MSYS2 on Windows, or `brew install binutils` on macOS. Homebrew installs it keg-only, so add `$(brew --prefix binutils)/bin` to `PATH`, otherwise the system `nm` and `objdump` are found instead.

The server checks for the four tools at startup. It exits if none are found and logs a warning for any that are missing.

## Build

```bash
git clone https://github.com/Abdalla-Eldoumani/bindiff-mcp.git
cd bindiff-mcp
npm install
npm run build
```

This compiles `src/` to `dist/`. The server talks MCP over stdio, so it is started by a client, not run on its own.

## Configure a client

Register `dist/index.js` as a stdio server in your MCP client's configuration. Most clients accept an `mcpServers` block like this:

```json
{
  "mcpServers": {
    "bindiff": {
      "command": "node",
      "args": ["/absolute/path/to/bindiff-mcp/dist/index.js"],
      "env": {
        "BINDIFF_TOOLCHAIN_PREFIX": ""
      }
    }
  }
}
```

`BINDIFF_TOOLCHAIN_PREFIX` is prepended to every binutils command. Set it to `aarch64-linux-gnu-` (or another cross prefix) to analyze binaries for a different architecture than the host. [docs/configuration.md](docs/configuration.md) covers client setup and troubleshooting.

## Development

```bash
npm run dev     # run src/index.ts with tsx, restarting on changes
npm test        # vitest in watch mode; npm test -- --run runs once
npm start       # run the built server
```

## Limitations

- ELF only. Sections and headers come from `readelf`, which does not read Mach-O or PE files.
- `disassemble_function` disassembles the whole binary and then cuts out the requested function, so it is slow on large binaries. Every binutils call has a 30 second timeout and a 50 MB output limit.
- Output is a Markdown report, not structured JSON, and long lists are cut: `list_symbols` shows the first 100 rows, and `list_functions` and each section of `diff_symbols` show the first 50.

## License

MIT. See [LICENSE](LICENSE).
