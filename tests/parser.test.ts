import { describe, it, expect } from 'vitest';
import {
  parseNmOutput,
  parseReadelfHeader,
  parseReadelfSections,
  parseSizeOutput,
} from '../src/lib/parser.js';

describe('parseNmOutput', () => {
  it('parses symbols with address and size', () => {
    const output = `0000000000001000 00000050 T main
0000000000001050 00000020 T helper
0000000000002000 00000100 D global_data`;

    const symbols = parseNmOutput(output);

    expect(symbols).toHaveLength(3);
    expect(symbols[0]).toEqual({
      address: '0000000000001000',
      size: 0x50,
      type: 'T',
      binding: 'global',
      name: 'main',
    });
    expect(symbols[1]).toEqual({
      address: '0000000000001050',
      size: 0x20,
      type: 'T',
      binding: 'global',
      name: 'helper',
    });
    expect(symbols[2]).toEqual({
      address: '0000000000002000',
      size: 0x100,
      type: 'D',
      binding: 'global',
      name: 'global_data',
    });
  });

  it('parses local symbols (lowercase type)', () => {
    const output = `0000000000001000 00000030 t local_func
0000000000002000 00000010 d local_data`;

    const symbols = parseNmOutput(output);

    expect(symbols).toHaveLength(2);
    expect(symbols[0].binding).toBe('local');
    expect(symbols[1].binding).toBe('local');
  });

  it('parses undefined symbols', () => {
    const output = `                 U printf
                 U malloc`;

    const symbols = parseNmOutput(output);

    expect(symbols).toHaveLength(2);
    expect(symbols[0]).toEqual({
      address: '0',
      size: 0,
      type: 'U',
      binding: 'unknown',
      name: 'printf',
    });
  });

  it('parses weak symbols', () => {
    const output = `0000000000001000 00000040 W weak_func
                 w weak_undef`;

    const symbols = parseNmOutput(output);

    expect(symbols).toHaveLength(2);
    expect(symbols[0].binding).toBe('weak');
    expect(symbols[1].binding).toBe('weak');
  });

  it('handles empty input', () => {
    const symbols = parseNmOutput('');
    expect(symbols).toHaveLength(0);
  });

  it('handles symbols without size (address type name format)', () => {
    const output = `0000000000001000 T main`;

    const symbols = parseNmOutput(output);

    expect(symbols).toHaveLength(1);
    expect(symbols[0]).toEqual({
      address: '0000000000001000',
      size: 0,
      type: 'T',
      binding: 'global',
      name: 'main',
    });
  });

  it('parses demangled C++ names with spaces', () => {
    const output = `0000000000001000 00000100 T MyClass::method(int, char const*)`;

    const symbols = parseNmOutput(output);

    expect(symbols).toHaveLength(1);
    expect(symbols[0].name).toBe('MyClass::method(int, char const*)');
  });
});

describe('parseReadelfHeader', () => {
  it('parses ELF64 header', () => {
    const output = `ELF Header:
  Magic:   7f 45 4c 46 02 01 01 00 00 00 00 00 00 00 00 00
  Class:                             ELF64
  Data:                              2's complement, little endian
  Version:                           1 (current)
  OS/ABI:                            UNIX - System V
  ABI Version:                       0
  Type:                              DYN (Position-Independent Executable file)
  Machine:                           Advanced Micro Devices X86-64
  Version:                           0x1
  Entry point address:               0x1040
  Start of program headers:          64 (bytes into file)
  Start of section headers:          14328 (bytes into file)
  Flags:                             0x0
  Size of this header:               64 (bytes)
  Size of program headers:           56 (bytes)
  Number of program headers:         13
  Size of section headers:           64 (bytes)
  Number of section headers:         30
  Section header string table index: 29`;

    const header = parseReadelfHeader(output);

    expect(header.format).toBe('ELF64');
    expect(header.machine).toBe('Advanced Micro Devices X86-64');
    expect(header.type).toBe('DYN (Position-Independent Executable file)');
    expect(header.entry).toBe('0x1040');
    expect(header.endianness).toBe('little endian');
  });

  it('parses ELF32 header', () => {
    const output = `ELF Header:
  Class:                             ELF32
  Data:                              2's complement, big endian
  Type:                              EXEC (Executable file)
  Machine:                           ARM
  Entry point address:               0x8000`;

    const header = parseReadelfHeader(output);

    expect(header.format).toBe('ELF32');
    expect(header.machine).toBe('ARM');
    expect(header.endianness).toBe('big endian');
  });

  it('handles missing fields gracefully', () => {
    const output = `ELF Header:
  Class:                             ELF64`;

    const header = parseReadelfHeader(output);

    expect(header.format).toBe('ELF64');
    expect(header.machine).toBe('unknown');
    expect(header.entry).toBe('unknown');
  });
});

describe('parseReadelfSections', () => {
  it('parses section headers', () => {
    const output = `There are 30 section headers, starting at offset 0x37f8:

Section Headers:
  [Nr] Name              Type            Address          Off    Size   ES Flg Lk Inf Al
  [ 0]                   NULL            0000000000000000 000000 000000 00      0   0  0
  [ 1] .text             PROGBITS        0000000000001000 001000 000500 00  AX  0   0 16
  [ 2] .rodata           PROGBITS        0000000000002000 002000 000100 00   A  0   0  8
  [ 3] .data             PROGBITS        0000000000003000 003000 000080 00  WA  0   0  8
  [ 4] .bss              NOBITS          0000000000004000 003080 000200 00  WA  0   0 32
Key to Flags:
  W (write), A (alloc), X (execute)`;

    const sections = parseReadelfSections(output);

    expect(sections).toHaveLength(5);
    // First section (NULL) has empty name which parser handles specially
    expect(sections[0].index).toBe(0);
    expect(sections[1]).toEqual({
      index: 1,
      name: '.text',
      type: 'PROGBITS',
      address: '0000000000001000',
      offset: '001000',
      size: 0x500,
      flags: 'AX',
    });
    expect(sections[4].name).toBe('.bss');
    expect(sections[4].size).toBe(0x200);
  });

  it('handles empty output', () => {
    const sections = parseReadelfSections('');
    expect(sections).toHaveLength(0);
  });
});

describe('parseSizeOutput', () => {
  it('parses size -A output', () => {
    const output = `myapp  :
section            size        addr
.text              1280        4096
.rodata             256        8192
.data               128       12288
.bss                512       16384
Total              2176`;

    const sections = parseSizeOutput(output);

    // Note: Total line may not be parsed if it lacks an address column
    expect(sections.length).toBeGreaterThanOrEqual(4);
    expect(sections[0]).toEqual({ name: '.text', size: 1280, addr: '4096' });
    expect(sections[1]).toEqual({ name: '.rodata', size: 256, addr: '8192' });
    expect(sections[3]).toEqual({ name: '.bss', size: 512, addr: '16384' });
  });

  it('handles empty output', () => {
    const sections = parseSizeOutput('');
    expect(sections).toHaveLength(0);
  });
});
