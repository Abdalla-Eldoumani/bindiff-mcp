import { describe, it, expect } from 'vitest';
import {
  formatBytes,
  formatPercent,
  formatSizeChange,
  formatTable,
  truncate,
  formatSymbolType,
  formatAddress,
} from '../src/utils/format.js';

describe('formatBytes', () => {
  it('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B');
  });

  it('formats bytes', () => {
    expect(formatBytes(100)).toBe('100 B');
    expect(formatBytes(1023)).toBe('1023 B');
  });

  it('formats kilobytes', () => {
    expect(formatBytes(1024)).toBe('1.00 KB');
    expect(formatBytes(1536)).toBe('1.50 KB');
    expect(formatBytes(10240)).toBe('10.00 KB');
  });

  it('formats megabytes', () => {
    expect(formatBytes(1048576)).toBe('1.00 MB');
    expect(formatBytes(1572864)).toBe('1.50 MB');
  });

  it('formats gigabytes', () => {
    expect(formatBytes(1073741824)).toBe('1.00 GB');
  });

  it('handles negative values', () => {
    expect(formatBytes(-1024)).toBe('-1.00 KB');
    expect(formatBytes(-100)).toBe('-100 B');
  });
});

describe('formatPercent', () => {
  it('formats positive percentages with plus sign', () => {
    expect(formatPercent(50)).toBe('+50.00%');
    expect(formatPercent(100)).toBe('+100.00%');
    expect(formatPercent(0.5)).toBe('+0.50%');
  });

  it('formats negative percentages', () => {
    expect(formatPercent(-25)).toBe('-25.00%');
    expect(formatPercent(-0.1)).toBe('-0.10%');
  });

  it('formats zero', () => {
    expect(formatPercent(0)).toBe('0.00%');
  });
});

describe('formatSizeChange', () => {
  it('formats positive changes with plus sign', () => {
    expect(formatSizeChange(1024)).toBe('+1.00 KB');
    expect(formatSizeChange(100)).toBe('+100 B');
  });

  it('formats negative changes', () => {
    expect(formatSizeChange(-1024)).toBe('-1.00 KB');
    expect(formatSizeChange(-50)).toBe('-50 B');
  });

  it('formats zero', () => {
    expect(formatSizeChange(0)).toBe('0 B');
  });
});

describe('formatTable', () => {
  it('formats a simple table', () => {
    const headers = ['Name', 'Size'];
    const rows = [
      ['foo', '100'],
      ['bar', '200'],
    ];

    const result = formatTable(headers, rows);

    expect(result).toContain('| Name | Size |');
    expect(result).toContain('| ---- | ---- |');
    expect(result).toContain('| foo  | 100  |');
    expect(result).toContain('| bar  | 200  |');
  });

  it('handles varying column widths', () => {
    const headers = ['A', 'Long Header'];
    const rows = [['Short', 'X']];

    const result = formatTable(headers, rows);

    expect(result).toContain('Long Header');
    expect(result).toContain('Short');
  });

  it('returns empty string for empty rows', () => {
    const result = formatTable(['A', 'B'], []);
    expect(result).toBe('');
  });

  it('handles empty cells', () => {
    const headers = ['A', 'B'];
    const rows = [['value', '']];

    const result = formatTable(headers, rows);

    expect(result).toContain('| value |');
  });
});

describe('truncate', () => {
  it('returns short strings unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates long strings with ellipsis', () => {
    expect(truncate('hello world', 8)).toBe('hello...');
  });

  it('handles exact length', () => {
    expect(truncate('hello', 5)).toBe('hello');
  });

  it('handles very short max length', () => {
    expect(truncate('hello', 4)).toBe('h...');
  });
});

describe('formatSymbolType', () => {
  it('formats known types', () => {
    expect(formatSymbolType('T')).toBe('text (code)');
    expect(formatSymbolType('t')).toBe('text (local)');
    expect(formatSymbolType('D')).toBe('initialized data');
    expect(formatSymbolType('B')).toBe('BSS (uninitialized data)');
    expect(formatSymbolType('U')).toBe('undefined');
  });

  it('returns unknown types as-is', () => {
    expect(formatSymbolType('X')).toBe('X');
    expect(formatSymbolType('?')).toBe('?');
  });
});

describe('formatAddress', () => {
  it('formats short addresses with padding', () => {
    expect(formatAddress('1000')).toBe('0x0000000000001000');
  });

  it('handles 0x prefix', () => {
    expect(formatAddress('0x1000')).toBe('0x0000000000001000');
  });

  it('handles full-length addresses', () => {
    expect(formatAddress('ffffffffffffffff')).toBe('0xffffffffffffffff');
  });
});
