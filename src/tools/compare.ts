import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Binutils } from '../lib/binutils.js';
import { parseNmOutput, parseReadelfHeader, parseReadelfSections } from '../lib/parser.js';
import { diffSymbols, diffSections, filterSymbols, filterDefinedSymbols } from '../lib/differ.js';
import { formatBytes, formatSizeChange, formatPercent, formatTable } from '../utils/format.js';

/**
 * Register comparison tools with the MCP server
 */
export function registerCompareTools(server: McpServer, binutils: Binutils): void {
  // compare_binaries - High-level comparison
  server.tool(
    'compare_binaries',
    'Compare two binary files and show high-level differences',
    {
      binary_a: z.string().describe('Path to first (old) binary'),
      binary_b: z.string().describe('Path to second (new) binary'),
    },
    async ({ binary_a, binary_b }) => {
      try {
        // Get headers for both binaries
        const [headerOutputA, headerOutputB] = await Promise.all([
          binutils.readelf(binary_a, ['-h']),
          binutils.readelf(binary_b, ['-h']),
        ]);
        const headerA = parseReadelfHeader(headerOutputA);
        const headerB = parseReadelfHeader(headerOutputB);

        // Get sections for both binaries
        const [sectionsOutputA, sectionsOutputB] = await Promise.all([
          binutils.readelf(binary_a, ['-S', '-W']),
          binutils.readelf(binary_b, ['-S', '-W']),
        ]);
        const sectionsA = parseReadelfSections(sectionsOutputA);
        const sectionsB = parseReadelfSections(sectionsOutputB);

        // Get symbols for both binaries
        const [symbolsOutputA, symbolsOutputB] = await Promise.all([
          binutils.nm(binary_a, ['--print-size', '-C']),
          binutils.nm(binary_b, ['--print-size', '-C']),
        ]);
        const symbolsA = parseNmOutput(symbolsOutputA);
        const symbolsB = parseNmOutput(symbolsOutputB);

        // Calculate diffs
        const symbolDiff = diffSymbols(
          filterDefinedSymbols(symbolsA),
          filterDefinedSymbols(symbolsB)
        );
        const sectionDiff = diffSections(sectionsA, sectionsB);

        // Get function counts
        const functionsA = symbolsA.filter(s => s.type === 'T' || s.type === 't');
        const functionsB = symbolsB.filter(s => s.type === 'T' || s.type === 't');

        // Calculate total sizes
        const textA = sectionsA.find(s => s.name === '.text')?.size ?? 0;
        const textB = sectionsB.find(s => s.name === '.text')?.size ?? 0;
        const totalA = sectionsA.reduce((sum, s) => sum + s.size, 0);
        const totalB = sectionsB.reduce((sum, s) => sum + s.size, 0);

        const sizeChange = totalB - totalA;
        const percentChange = totalA > 0 ? (sizeChange / totalA) * 100 : 0;
        const textChange = textB - textA;
        const textPercentChange = textA > 0 ? (textChange / textA) * 100 : 0;

        let result = `## Binary Comparison\n\n`;
        result += `| | Old | New |\n`;
        result += `|---|---|---|\n`;
        result += `| **File** | ${binary_a} | ${binary_b} |\n`;
        result += `| **Architecture** | ${headerA.machine} | ${headerB.machine} |\n`;
        result += `| **Format** | ${headerA.format} | ${headerB.format} |\n\n`;

        result += `### Size Changes\n\n`;
        result += `| Metric | Old | New | Change |\n`;
        result += `|--------|-----|-----|--------|\n`;
        result += `| Total Size | ${formatBytes(totalA)} | ${formatBytes(totalB)} | ${formatSizeChange(sizeChange)} (${formatPercent(percentChange)}) |\n`;
        result += `| .text (code) | ${formatBytes(textA)} | ${formatBytes(textB)} | ${formatSizeChange(textChange)} (${formatPercent(textPercentChange)}) |\n`;
        result += `| Functions | ${functionsA.length} | ${functionsB.length} | ${functionsB.length - functionsA.length >= 0 ? '+' : ''}${functionsB.length - functionsA.length} |\n\n`;

        result += `### Symbol Summary\n\n`;
        result += `- **Added**: ${symbolDiff.summary.totalAdded} symbols\n`;
        result += `- **Removed**: ${symbolDiff.summary.totalRemoved} symbols\n`;
        result += `- **Modified**: ${symbolDiff.summary.totalModified} symbols\n`;
        result += `- **Net size change**: ${formatSizeChange(symbolDiff.summary.netSizeChange)}\n\n`;

        // Show top changes
        if (symbolDiff.modified.length > 0) {
          result += `### Top Size Changes\n\n`;
          const topChanges = symbolDiff.modified.slice(0, 10);
          const rows = topChanges.map(m => [
            m.name,
            formatBytes(m.oldSize),
            formatBytes(m.newSize),
            formatSizeChange(m.sizeChange),
          ]);
          result += formatTable(['Symbol', 'Old', 'New', 'Change'], rows);
        }

        if (symbolDiff.added.length > 0) {
          result += `\n\n### New Symbols (top 10)\n\n`;
          const topAdded = symbolDiff.added.sort((a, b) => b.size - a.size).slice(0, 10);
          const rows = topAdded.map(s => [s.name, formatBytes(s.size)]);
          result += formatTable(['Symbol', 'Size'], rows);
        }

        if (symbolDiff.removed.length > 0) {
          result += `\n\n### Removed Symbols (top 10)\n\n`;
          const topRemoved = symbolDiff.removed.sort((a, b) => b.size - a.size).slice(0, 10);
          const rows = topRemoved.map(s => [s.name, formatBytes(s.size)]);
          result += formatTable(['Symbol', 'Size'], rows);
        }

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error comparing binaries: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // diff_symbols - Detailed symbol diff
  server.tool(
    'diff_symbols',
    'Get detailed symbol-level differences between two binaries',
    {
      binary_a: z.string().describe('Path to first (old) binary'),
      binary_b: z.string().describe('Path to second (new) binary'),
      symbol_type: z
        .enum(['function', 'object', 'all'])
        .optional()
        .default('all')
        .describe('Filter by symbol type'),
    },
    async ({ binary_a, binary_b, symbol_type }) => {
      try {
        // Get symbols for both binaries
        const [symbolsOutputA, symbolsOutputB] = await Promise.all([
          binutils.nm(binary_a, ['--print-size', '-C']),
          binutils.nm(binary_b, ['--print-size', '-C']),
        ]);

        let symbolsA = filterDefinedSymbols(parseNmOutput(symbolsOutputA));
        let symbolsB = filterDefinedSymbols(parseNmOutput(symbolsOutputB));

        // Filter by type
        symbolsA = filterSymbols(symbolsA, symbol_type ?? 'all');
        symbolsB = filterSymbols(symbolsB, symbol_type ?? 'all');

        const diff = diffSymbols(symbolsA, symbolsB);

        let result = `## Symbol Diff: ${binary_a} → ${binary_b}\n\n`;
        result += `Filter: **${symbol_type}**\n\n`;

        result += `### Summary\n`;
        result += `- Added: ${diff.summary.totalAdded}\n`;
        result += `- Removed: ${diff.summary.totalRemoved}\n`;
        result += `- Modified: ${diff.summary.totalModified}\n`;
        result += `- Net size change: ${formatSizeChange(diff.summary.netSizeChange)}\n\n`;

        if (diff.modified.length > 0) {
          result += `### Modified Symbols (${diff.modified.length})\n\n`;
          const rows = diff.modified.slice(0, 50).map(m => [
            m.name,
            formatBytes(m.oldSize),
            formatBytes(m.newSize),
            formatSizeChange(m.sizeChange),
            formatPercent(m.percentChange),
          ]);
          result += formatTable(['Symbol', 'Old Size', 'New Size', 'Change', '%'], rows);

          if (diff.modified.length > 50) {
            result += `\n_... and ${diff.modified.length - 50} more_`;
          }
        }

        if (diff.added.length > 0) {
          result += `\n\n### Added Symbols (${diff.added.length})\n\n`;
          const sortedAdded = [...diff.added].sort((a, b) => b.size - a.size);
          const rows = sortedAdded.slice(0, 50).map(s => [s.name, formatBytes(s.size)]);
          result += formatTable(['Symbol', 'Size'], rows);

          if (diff.added.length > 50) {
            result += `\n_... and ${diff.added.length - 50} more_`;
          }
        }

        if (diff.removed.length > 0) {
          result += `\n\n### Removed Symbols (${diff.removed.length})\n\n`;
          const sortedRemoved = [...diff.removed].sort((a, b) => b.size - a.size);
          const rows = sortedRemoved.slice(0, 50).map(s => [s.name, formatBytes(s.size)]);
          result += formatTable(['Symbol', 'Size'], rows);

          if (diff.removed.length > 50) {
            result += `\n_... and ${diff.removed.length - 50} more_`;
          }
        }

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error diffing symbols: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // diff_sections - Section comparison
  server.tool(
    'diff_sections',
    'Compare sections between two binaries',
    {
      binary_a: z.string().describe('Path to first (old) binary'),
      binary_b: z.string().describe('Path to second (new) binary'),
    },
    async ({ binary_a, binary_b }) => {
      try {
        // Get sections for both binaries
        const [sectionsOutputA, sectionsOutputB] = await Promise.all([
          binutils.readelf(binary_a, ['-S', '-W']),
          binutils.readelf(binary_b, ['-S', '-W']),
        ]);
        const sectionsA = parseReadelfSections(sectionsOutputA);
        const sectionsB = parseReadelfSections(sectionsOutputB);

        const diff = diffSections(sectionsA, sectionsB);

        let result = `## Section Diff: ${binary_a} → ${binary_b}\n\n`;

        result += `### Summary\n`;
        result += `- Added sections: ${diff.summary.totalAdded}\n`;
        result += `- Removed sections: ${diff.summary.totalRemoved}\n`;
        result += `- Modified sections: ${diff.summary.totalModified}\n`;
        result += `- Net size change: ${formatSizeChange(diff.summary.netSizeChange)}\n\n`;

        if (diff.modified.length > 0) {
          result += `### Modified Sections\n\n`;
          const rows = diff.modified.map(m => [
            m.name,
            formatBytes(m.oldSize),
            formatBytes(m.newSize),
            formatSizeChange(m.sizeChange),
            formatPercent(m.percentChange),
          ]);
          result += formatTable(['Section', 'Old Size', 'New Size', 'Change', '%'], rows);
        }

        if (diff.added.length > 0) {
          result += `\n\n### Added Sections\n\n`;
          const rows = diff.added.map(s => [s.name, s.type, formatBytes(s.size)]);
          result += formatTable(['Section', 'Type', 'Size'], rows);
        }

        if (diff.removed.length > 0) {
          result += `\n\n### Removed Sections\n\n`;
          const rows = diff.removed.map(s => [s.name, s.type, formatBytes(s.size)]);
          result += formatTable(['Section', 'Type', 'Size'], rows);
        }

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error diffing sections: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // hexdump_section - Hex dump of a section
  server.tool(
    'hexdump_section',
    'Get a hex dump of a specific section or address range',
    {
      binary_path: z.string().describe('Path to the binary file'),
      section: z.string().optional().describe('Section name (e.g., .text, .data)'),
      start_address: z.string().optional().describe('Start address (hex)'),
      length: z.number().optional().default(256).describe('Number of bytes to dump'),
    },
    async ({ binary_path, section, start_address, length }) => {
      try {
        const args = ['-s'];

        if (section) {
          args.push(`-j`, section);
        }

        if (start_address) {
          args.push(`--start-address=${start_address}`);
        }

        if (length) {
          // objdump doesn't have a direct length option, so we'll truncate output
        }

        const output = await binutils.objdump(binary_path, args);

        // Limit output to approximately the requested length
        const lines = output.split('\n');
        const headerLines = lines.filter(
          l => l.includes(':') === false || l.includes('file format')
        );
        const dataLines = lines.filter(
          l => l.includes(':') && !l.includes('file format')
        );

        // Each line is typically 16 bytes
        const maxLines = Math.ceil(length / 16);
        const truncatedData = dataLines.slice(0, maxLines);

        let result = `## Hex Dump: ${binary_path}`;
        if (section) {
          result += ` (section: ${section})`;
        }
        result += `\n\n`;

        result += '```\n';
        result += [...headerLines.slice(0, 2), ...truncatedData].join('\n');
        result += '\n```';

        if (dataLines.length > maxLines) {
          result += `\n\n_Showing ${maxLines * 16} of ${dataLines.length * 16} bytes_`;
        }

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error dumping section: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
