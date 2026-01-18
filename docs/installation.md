# Installation

## Requirements

- Node.js 20 or later
- GNU binutils (nm, objdump, readelf, size)

## Installing GNU binutils

bindiff-mcp requires GNU binutils to be installed and available in your PATH.

### Windows

**Option 1: MSYS2 (recommended)**

1. Install [MSYS2](https://www.msys2.org/)
2. Open MSYS2 terminal and run:
   ```bash
   pacman -S binutils
   ```
3. Add MSYS2's bin directory to your PATH (usually `C:\msys64\usr\bin`)

**Option 2: Git Bash**

Git Bash includes basic binutils. If you have Git for Windows installed, the tools may already be available.

**Option 3: WSL**

If you use Windows Subsystem for Linux:
```bash
sudo apt install binutils
```

### macOS

Using Homebrew:
```bash
brew install binutils
```

Note: Homebrew installs binutils with a `g` prefix (e.g., `gnm`, `gobjdump`). You may need to either:
- Add the unprefixed versions to your PATH: `export PATH="/opt/homebrew/opt/binutils/bin:$PATH"`
- Or set the toolchain prefix: `BINDIFF_TOOLCHAIN_PREFIX=g`

### Linux

**Debian/Ubuntu:**
```bash
sudo apt install binutils
```

**Fedora/RHEL:**
```bash
sudo dnf install binutils
```

**Arch Linux:**
```bash
sudo pacman -S binutils
```

## Installing bindiff-mcp

### From source

```bash
git clone <repository-url>
cd bindiff-mcp
npm install
npm run build
```

### Verify installation

After building, run:
```bash
npm start
```

You should see output like:
```
[bindiff-mcp] Starting bindiff-mcp v1.0.0
[bindiff-mcp] Checking binutils availability...
[bindiff-mcp] Available tools: nm, objdump, readelf, size
[bindiff-mcp] Tools registered successfully
[bindiff-mcp] Server connected and ready
```

If any tools are missing, you'll see a warning listing which ones need to be installed.

## Cross-compilation toolchains

To analyze binaries for different architectures (e.g., ARM64 binaries on an x86 machine), install a cross-compilation toolchain.

**Example: ARM64 toolchain on Ubuntu**
```bash
sudo apt install gcc-aarch64-linux-gnu binutils-aarch64-linux-gnu
```

Then set the toolchain prefix:
```bash
export BINDIFF_TOOLCHAIN_PREFIX=aarch64-linux-gnu-
```

This tells bindiff-mcp to use `aarch64-linux-gnu-nm` instead of `nm`, etc.

## Next steps

- [Configuration](configuration.md) - Set up bindiff-mcp with Claude Desktop or Claude Code
- [Tools Reference](tools.md) - Learn about available tools
- [Examples](examples.md) - See practical usage examples
