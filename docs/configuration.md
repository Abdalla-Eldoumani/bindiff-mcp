# Configuration

bindiff-mcp is a stdio MCP server. Your MCP client starts it as a child process with `node /path/to/bindiff-mcp/dist/index.js` and talks to it over stdin and stdout. Build it first (`npm install && npm run build`); the path must point at the built `dist/index.js`, and an absolute path is safest.

## Generic client configuration

Most MCP clients take a JSON block like this:

```json
{
  "mcpServers": {
    "bindiff": {
      "command": "node",
      "args": ["/absolute/path/to/bindiff-mcp/dist/index.js"]
    }
  }
}
```

Where that block goes depends on the client. Two examples follow.

### Claude Code

Add the server from a terminal:

```bash
claude mcp add bindiff -- node /absolute/path/to/bindiff-mcp/dist/index.js
```

Everything after `--` is the command that starts the server. By default the server is saved for the current project and only for you. Add `--scope user` to make it available in every project, or `--scope project` to write it to a `.mcp.json` file in the project root so everyone who clones the project gets it. A `.mcp.json` file uses the same `mcpServers` block shown above.

Check it with `claude mcp list`, or run `/mcp` inside a session.

### Claude Desktop

Add the `mcpServers` block to `claude_desktop_config.json`:

- macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Windows: `%APPDATA%\Claude\claude_desktop_config.json`

On Windows, escape backslashes in the path (`"C:\\tools\\bindiff-mcp\\dist\\index.js"`) or use forward slashes. Restart Claude Desktop after editing.

## Cross-architecture binaries: `BINDIFF_TOOLCHAIN_PREFIX`

The only setting is the `BINDIFF_TOOLCHAIN_PREFIX` environment variable. Its value is prepended to every binutils command, so with `aarch64-linux-gnu-` the server runs `aarch64-linux-gnu-nm`, `aarch64-linux-gnu-objdump`, `aarch64-linux-gnu-readelf` and `aarch64-linux-gnu-size`. Leave it unset to use the host tools.

The host `nm` and `readelf` usually read ELF files for other architectures, but the host `objdump` cannot disassemble them, so `disassemble_function` needs a matching toolchain.

In a JSON config:

```json
{
  "mcpServers": {
    "bindiff-arm64": {
      "command": "node",
      "args": ["/absolute/path/to/bindiff-mcp/dist/index.js"],
      "env": {
        "BINDIFF_TOOLCHAIN_PREFIX": "aarch64-linux-gnu-"
      }
    }
  }
}
```

With Claude Code:

```bash
claude mcp add bindiff-arm64 --env BINDIFF_TOOLCHAIN_PREFIX=aarch64-linux-gnu- -- node /absolute/path/to/bindiff-mcp/dist/index.js
```

The prefix applies to the whole server process. To work with host binaries and cross binaries in the same client, register the server twice under different names, one with the prefix and one without.

Common prefixes on Debian and Ubuntu, each from the matching `binutils-<prefix without the trailing dash>` package:

| Target | Prefix |
|--------|--------|
| AArch64 | `aarch64-linux-gnu-` |
| 32-bit ARM, hard float | `arm-linux-gnueabihf-` |
| RISC-V 64-bit | `riscv64-linux-gnu-` |

## Troubleshooting

The server logs to stderr. Run it by hand to see that output:

```bash
node /absolute/path/to/bindiff-mcp/dist/index.js
```

It prints which binutils tools it found, then waits for a client on stdin. Press Ctrl+C to stop it.

- `Error: No binutils tools found`: none of `nm`, `objdump`, `readelf` or `size` (with the prefix, if set) is on the `PATH` the client gives the server. Check with `which nm objdump readelf size`, or `which aarch64-linux-gnu-nm` for a prefix. A client started from a desktop launcher may have a shorter `PATH` than your shell.
- `Warning: Missing tools`: the server runs, but tools that need the missing program fail.
- `File not found or not accessible`: relative paths resolve against the server's working directory, which the client chooses. Use absolute paths.
- `readelf` errors such as "Not an ELF file": the file is Mach-O, PE or not a binary. Only ELF is supported.
- `can't disassemble for architecture UNKNOWN!` from `disassemble_function`: the host `objdump` cannot disassemble that architecture. Set `BINDIFF_TOOLCHAIN_PREFIX` to a matching toolchain and restart the client.
