# Configuration

bindiff-mcp runs as an MCP (Model Context Protocol) server. It communicates via stdio and needs to be configured in your MCP client.

## Claude Code

Add to `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "bindiff": {
      "command": "node",
      "args": ["/path/to/bindiff-mcp/dist/index.js"]
    }
  }
}
```

After editing, restart Claude Code. Verify the server is loaded:

```
/mcp
```

You should see "bindiff" listed as a connected server.

## Claude Desktop

Add to your Claude Desktop config file:

**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Linux:** `~/.config/claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "bindiff": {
      "command": "node",
      "args": ["/path/to/bindiff-mcp/dist/index.js"]
    }
  }
}
```

Restart Claude Desktop after editing.

## Environment Variables

### BINDIFF_TOOLCHAIN_PREFIX

Sets a prefix for all binutils commands. Used for cross-compilation toolchains.

**Example: ARM64 cross-toolchain**

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

With this prefix, bindiff-mcp calls:
- `aarch64-linux-gnu-nm` instead of `nm`
- `aarch64-linux-gnu-objdump` instead of `objdump`
- `aarch64-linux-gnu-readelf` instead of `readelf`
- `aarch64-linux-gnu-size` instead of `size`

### Common toolchain prefixes

| Target | Prefix |
|--------|--------|
| ARM64/AArch64 | `aarch64-linux-gnu-` |
| ARM 32-bit | `arm-linux-gnueabihf-` |
| RISC-V 64-bit | `riscv64-linux-gnu-` |
| x86 32-bit (on 64-bit) | `i686-linux-gnu-` |

## Multiple configurations

You can run multiple instances with different toolchain prefixes:

```json
{
  "mcpServers": {
    "bindiff-native": {
      "command": "node",
      "args": ["/path/to/bindiff-mcp/dist/index.js"]
    },
    "bindiff-arm64": {
      "command": "node",
      "args": ["/path/to/bindiff-mcp/dist/index.js"],
      "env": {
        "BINDIFF_TOOLCHAIN_PREFIX": "aarch64-linux-gnu-"
      }
    }
  }
}
```

## Troubleshooting

### Server doesn't start

Check stderr output. Common issues:
- Node.js not found: Ensure Node.js 20+ is installed
- binutils not found: Install GNU binutils and verify they're in PATH

### "Command not found" errors

The server checks tool availability on startup. If tools are missing:
1. Install binutils for your platform (see [Installation](installation.md))
2. Verify tools are in PATH: `which nm objdump readelf size`
3. If using a toolchain prefix, verify prefixed tools exist: `which aarch64-linux-gnu-nm`

### Server connected but tools fail

- Check file paths are absolute or relative to current working directory
- Verify the binary file exists and is readable
- Confirm the binary is a valid ELF file (not a script or Windows PE)

### Analyzing cross-compiled binaries

If analyzing ARM64 binaries on an x86 machine fails:
1. Install the cross-toolchain: `sudo apt install binutils-aarch64-linux-gnu`
2. Set the toolchain prefix in your config
3. Restart your MCP client
