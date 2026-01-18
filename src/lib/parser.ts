import { Symbol, Section, ElfHeader } from './types.js';

/**
 * Determine symbol binding from type character
 */
function getBinding(type: string): Symbol['binding'] {
  const upper = type.toUpperCase();
  if (type === type.toLowerCase()) {
    return 'local';
  }
  if (upper === 'W' || upper === 'V') {
    return 'weak';
  }
  if (upper === type) {
    return 'global';
  }
  return 'unknown';
}

/**
 * Parse output from `nm --print-size` command
 *
 * Format variations:
 * - address size type name (defined symbols with size)
 * - address type name (defined symbols without size)
 * -          U name (undefined symbols)
 */
export function parseNmOutput(output: string): Symbol[] {
  const symbols: Symbol[] = [];

  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Try format: address size type name
    const withSize = trimmed.match(/^([0-9a-f]+)\s+([0-9a-f]+)\s+(\S)\s+(.+)$/i);
    if (withSize) {
      symbols.push({
        address: withSize[1],
        size: parseInt(withSize[2], 16),
        type: withSize[3],
        binding: getBinding(withSize[3]),
        name: withSize[4],
      });
      continue;
    }

    // Try format: address type name (no size)
    const withoutSize = trimmed.match(/^([0-9a-f]+)\s+(\S)\s+(.+)$/i);
    if (withoutSize) {
      symbols.push({
        address: withoutSize[1],
        size: 0,
        type: withoutSize[2],
        binding: getBinding(withoutSize[2]),
        name: withoutSize[3],
      });
      continue;
    }

    // Try format: U name (undefined symbols, no address)
    const undefined = trimmed.match(/^\s*U\s+(.+)$/);
    if (undefined) {
      symbols.push({
        address: '0',
        size: 0,
        type: 'U',
        binding: 'unknown',
        name: undefined[1],
      });
      continue;
    }

    // Try format: w name (weak undefined symbols)
    const weakUndef = trimmed.match(/^\s*w\s+(.+)$/);
    if (weakUndef) {
      symbols.push({
        address: '0',
        size: 0,
        type: 'w',
        binding: 'weak',
        name: weakUndef[1],
      });
    }
  }

  return symbols;
}

/**
 * Parse output from `readelf -h` command
 */
export function parseReadelfHeader(output: string): ElfHeader {
  const getValue = (pattern: RegExp): string => {
    const match = output.match(pattern);
    return match ? match[1].trim() : 'unknown';
  };

  const classValue = getValue(/Class:\s+(.+)/);
  const dataValue = getValue(/Data:\s+(.+)/);
  const machineValue = getValue(/Machine:\s+(.+)/);
  const typeValue = getValue(/Type:\s+(.+)/);
  const entryValue = getValue(/Entry point address:\s+(.+)/);

  return {
    format: classValue.includes('64') ? 'ELF64' : 'ELF32',
    machine: machineValue,
    type: typeValue,
    entry: entryValue,
    endianness: dataValue.toLowerCase().includes('little') ? 'little endian' : 'big endian',
  };
}

/**
 * Parse output from `readelf -S -W` command
 *
 * Format:
 * Section Headers:
 *   [Nr] Name              Type            Address          Off    Size   ES Flg Lk Inf Al
 *   [ 0]                   NULL            0000000000000000 000000 000000 00      0   0  0
 *   [ 1] .text             PROGBITS        0000000000001000 001000 000100 00  AX  0   0 16
 */
export function parseReadelfSections(output: string): Section[] {
  const sections: Section[] = [];

  // Match section lines with flexible whitespace
  // [Nr] Name Type Address Offset Size EntSize Flags Link Info Align
  const lines = output.split('\n');

  for (const line of lines) {
    // Skip header lines and empty lines
    if (!line.includes('[') || line.includes('Section Headers') || line.includes('[Nr]')) {
      continue;
    }

    // Parse section entry
    // Format: [Nr] Name Type Addr Off Size ES Flg Lk Inf Al
    const match = line.match(
      /\[\s*(\d+)\]\s+(\S*)\s+(\S+)\s+([0-9a-f]+)\s+([0-9a-f]+)\s+([0-9a-f]+)\s+[0-9a-f]+\s*(\S*)/i
    );

    if (match) {
      sections.push({
        index: parseInt(match[1], 10),
        name: match[2] || '(null)',
        type: match[3],
        address: match[4],
        offset: match[5],
        size: parseInt(match[6], 16),
        flags: match[7] || '',
      });
    }
  }

  return sections;
}

/**
 * Parse output from `size -A` command
 *
 * Format:
 * filename  :
 * section            size        addr
 * .text              1234        0x1000
 */
export function parseSizeOutput(output: string): Array<{ name: string; size: number; addr: string }> {
  const sections: Array<{ name: string; size: number; addr: string }> = [];

  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.includes(':') || trimmed.startsWith('section')) {
      continue;
    }

    // Format: .section_name  size  address
    const match = trimmed.match(/^(\S+)\s+(\d+)\s+(\d+|0x[0-9a-f]+)?/i);
    if (match) {
      sections.push({
        name: match[1],
        size: parseInt(match[2], 10),
        addr: match[3] || '0',
      });
    }
  }

  return sections;
}

/**
 * Parse objdump disassembly output to extract a specific function
 */
export function parseDisassembly(output: string, functionName: string): string | null {
  const lines = output.split('\n');
  const functionLines: string[] = [];
  let inFunction = false;

  for (const line of lines) {
    // Function start: address <function_name>:
    if (line.includes(`<${functionName}>:`)) {
      inFunction = true;
      functionLines.push(line);
      continue;
    }

    if (inFunction) {
      // End of function: empty line or new function
      if (line.trim() === '' || (line.includes('<') && line.includes('>:'))) {
        break;
      }
      functionLines.push(line);
    }
  }

  return functionLines.length > 0 ? functionLines.join('\n') : null;
}
