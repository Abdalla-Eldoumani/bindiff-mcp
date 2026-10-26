# Installation

bindiff-mcp needs Node.js 20 or newer and GNU binutils (`nm`, `objdump`, `readelf`, `size`) on `PATH`.

## GNU binutils

Debian or Ubuntu (also inside WSL):

```bash
sudo apt install binutils
```

Fedora:

```bash
sudo dnf install binutils
```

Arch Linux:

```bash
sudo pacman -S binutils
```

macOS with Homebrew:

```bash
brew install binutils
export PATH="$(brew --prefix binutils)/bin:$PATH"
```

Homebrew installs binutils keg-only, so the tools are not linked onto `PATH`. Without the `export`, the server finds the Xcode command line tools' `nm` and `objdump` instead, and there is no `readelf` at all. Put the `export` in your shell profile, or set `PATH` in the client's server config.

Windows with [MSYS2](https://www.msys2.org/): in an MSYS2 shell run `pacman -S binutils`, then add the MSYS2 `usr\bin` directory (`C:\msys64\usr\bin` in a default install) to `PATH`.

Check that all four are found:

```bash
nm --version && objdump --version && readelf --version && size --version
```

## Cross toolchains

To disassemble binaries built for another architecture, install binutils for that target and set `BINDIFF_TOOLCHAIN_PREFIX` (see [configuration.md](configuration.md)). For AArch64 on Debian or Ubuntu:

```bash
sudo apt install binutils-aarch64-linux-gnu
aarch64-linux-gnu-objdump --version
```

## bindiff-mcp

```bash
git clone https://github.com/Abdalla-Eldoumani/bindiff-mcp.git
cd bindiff-mcp
npm install
npm run build
```

Start it once by hand to check that it finds binutils:

```bash
npm start
```

The output ends with:

```
[bindiff-mcp] Starting bindiff-mcp v1.0.0
[bindiff-mcp] Checking binutils availability...
[bindiff-mcp] Available tools: nm, objdump, readelf, size
[bindiff-mcp] Tools registered successfully
[bindiff-mcp] Server connected and ready
```

A missing tool shows up as a `Warning: Missing tools` line. The server then waits for an MCP client on stdin; press Ctrl+C to stop it and [register it with your client](configuration.md).
