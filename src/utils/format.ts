/**
 * Format bytes into human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';

  const sign = bytes < 0 ? '-' : '';
  const absBytes = Math.abs(bytes);

  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(absBytes) / Math.log(1024)), units.length - 1);

  if (i === 0) {
    return `${sign}${absBytes} B`;
  }

  const value = absBytes / Math.pow(1024, i);
  return `${sign}${value.toFixed(2)} ${units[i]}`;
}

/**
 * Format a percentage value with sign
 */
export function formatPercent(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

/**
 * Format size change with sign
 */
export function formatSizeChange(bytes: number): string {
  const sign = bytes > 0 ? '+' : '';
  return `${sign}${formatBytes(bytes)}`;
}

/**
 * Create a markdown table from headers and rows
 */
export function formatTable(headers: string[], rows: string[][]): string {
  if (rows.length === 0) {
    return '';
  }

  // Calculate column widths
  const widths = headers.map((h, i) => {
    const maxRowWidth = Math.max(...rows.map(r => (r[i] || '').length));
    return Math.max(h.length, maxRowWidth);
  });

  // Build header row
  const headerRow = '| ' + headers.map((h, i) => h.padEnd(widths[i])).join(' | ') + ' |';

  // Build separator
  const separator = '| ' + widths.map(w => '-'.repeat(w)).join(' | ') + ' |';

  // Build data rows
  const dataRows = rows.map(row =>
    '| ' + row.map((cell, i) => (cell || '').padEnd(widths[i])).join(' | ') + ' |'
  );

  return [headerRow, separator, ...dataRows].join('\n');
}

/**
 * Truncate a string to a maximum length with ellipsis
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + '...';
}

/**
 * Format a symbol type character to a human-readable description
 */
export function formatSymbolType(type: string): string {
  const types: Record<string, string> = {
    'T': 'text (code)',
    't': 'text (local)',
    'D': 'initialized data',
    'd': 'initialized data (local)',
    'B': 'BSS (uninitialized data)',
    'b': 'BSS (local)',
    'R': 'read-only data',
    'r': 'read-only data (local)',
    'U': 'undefined',
    'W': 'weak symbol',
    'w': 'weak (undefined)',
    'A': 'absolute',
    'C': 'common',
    'N': 'debug symbol',
  };
  return types[type] || type;
}

/**
 * Format hex address for display
 */
export function formatAddress(address: string): string {
  // Normalize to 16 chars for 64-bit addresses
  const clean = address.replace(/^0x/i, '');
  return '0x' + clean.padStart(16, '0');
}
