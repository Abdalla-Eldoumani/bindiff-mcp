import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Binutils } from '../lib/binutils.js';
import { parseNmOutput, parseReadelfHeader, parseReadelfSections } from '../lib/parser.js';
import { filterDefinedSymbols, filterUndefinedSymbols } from '../lib/differ.js';
import { formatBytes, formatTable, formatSymbolType } from '../utils/format.js';

/**
 * Register analysis tools with the MCP server
 */
export function registerAnalyzeTools(server: McpServer, binutils: Binutils): void {
  // analyze_binary - Comprehensive binary analysis
  server.tool(
    'analyze_binary',
    'Analyze a binary file and return comprehensive information about its structure',
    {
      binary_path: z.string().describe('Path to the binary file to analyze'),
      detailed: z.boolean().optional().describe('Include detailed symbol breakdown'),
    },
    async ({ binary_path, detailed }) => {
      try {
        // Get ELF header info
        const headerOutput = await binutils.readelf(binary_path, ['-h']);
        const header = parseReadelfHeader(headerOutput);

        // Get sections
        const sectionsOutput = await binutils.readelf(binary_path, ['-S', '-W']);
        const sections = parseReadelfSections(sectionsOutput);

        // Get symbols
        const symbolsOutput = await binutils.nm(binary_path, ['--print-size', '-C']);
        const symbols = parseNmOutput(symbolsOutput);

        const definedSymbols = filterDefinedSymbols(symbols);
        const functionSymbols = definedSymbols.filter(s => s.type === 'T' || s.type === 't');
        const dataSymbols = definedSymbols.filter(s =>
          ['D', 'd', 'B', 'b', 'R', 'r'].includes(s.type)
        );

        // Calculate total size from sections
        const textSection = sections.find(s => s.name === '.text');
        const dataSection = sections.find(s => s.name === '.data');
        const bssSection = sections.find(s => s.name === '.bss');
        const rodataSection = sections.find(s => s.name === '.rodata');

        let result = `## Binary Analysis: ${binary_path}\n\n`;
        result += `**Format**: ${header.format}\n`;
        result += `**Architecture**: ${header.machine}\n`;
        result += `**Type**: ${header.type}\n`;
        result += `**Entry Point**: ${header.entry}\n`;
        result += `**Endianness**: ${header.endianness}\n\n`;

        result += `### Size Summary\n`;
        result += `| Section | Size |\n`;
        result += `|---------|------|\n`;
        result += `| .text (code) | ${formatBytes(textSection?.size ?? 0)} |\n`;
        result += `| .data (initialized) | ${formatBytes(dataSection?.size ?? 0)} |\n`;
        result += `| .rodata (read-only) | ${formatBytes(rodataSection?.size ?? 0)} |\n`;
        result += `| .bss (uninitialized) | ${formatBytes(bssSection?.size ?? 0)} |\n\n`;

        result += `### Symbol Summary\n`;
        result += `- **Functions**: ${functionSymbols.length}\n`;
        result += `- **Data objects**: ${dataSymbols.length}\n`;
        result += `- **Total defined symbols**: ${definedSymbols.length}\n`;
        result += `- **Undefined symbols**: ${symbols.length - definedSymbols.length}\n`;

        if (detailed) {
          // Top 10 largest functions
          const sortedFunctions = [...functionSymbols].sort((a, b) => b.size - a.size).slice(0, 10);

          if (sortedFunctions.length > 0) {
            result += `\n### Largest Functions\n`;
            const rows = sortedFunctions.map(fn => [fn.name, formatBytes(fn.size)]);
            result += formatTable(['Function', 'Size'], rows);
          }

          // Top 10 largest data objects
          const sortedData = [...dataSymbols].sort((a, b) => b.size - a.size).slice(0, 10);

          if (sortedData.length > 0) {
            result += `\n\n### Largest Data Objects\n`;
            const rows = sortedData.map(d => [d.name, formatBytes(d.size)]);
            result += formatTable(['Symbol', 'Size'], rows);
          }
        }

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error analyzing binary: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // list_symbols - List symbols from a binary
  server.tool(
    'list_symbols',
    'List symbols from a binary file',
    {
      binary_path: z.string().describe('Path to the binary file'),
      symbol_type: z
        .enum(['defined', 'undefined', 'all'])
        .optional()
        .describe('Filter by symbol type'),
      demangle: z.boolean().optional().default(true).describe('Demangle C++ symbol names'),
    },
    async ({ binary_path, symbol_type, demangle }) => {
      try {
        const args = ['--print-size'];
        if (demangle) {
          args.push('-C');
        }

        const output = await binutils.nm(binary_path, args);
        let symbols = parseNmOutput(output);

        // Filter by type
        if (symbol_type === 'defined') {
          symbols = filterDefinedSymbols(symbols);
        } else if (symbol_type === 'undefined') {
          symbols = filterUndefinedSymbols(symbols);
        }

        let result = `## Symbols in ${binary_path}\n\n`;
        result += `Total: ${symbols.length} symbols\n\n`;

        if (symbols.length === 0) {
          result += '_No symbols found._\n';
        } else {
          const rows = symbols.slice(0, 100).map(s => [
            s.address === '0' ? '' : `0x${s.address}`,
            formatBytes(s.size),
            formatSymbolType(s.type),
            s.name,
          ]);

          result += formatTable(['Address', 'Size', 'Type', 'Name'], rows);

          if (symbols.length > 100) {
            result += `\n\n_... and ${symbols.length - 100} more symbols_`;
          }
        }

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error listing symbols: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // list_functions - List functions with their sizes
  server.tool(
    'list_functions',
    'List all functions in a binary with their sizes',
    {
      binary_path: z.string().describe('Path to the binary file'),
      sort_by: z
        .enum(['name', 'size', 'address'])
        .optional()
        .default('size')
        .describe('Sort order for functions'),
      filter: z.string().optional().describe('Regex pattern to filter function names'),
    },
    async ({ binary_path, sort_by, filter }) => {
      try {
        const output = await binutils.nm(binary_path, ['--print-size', '-C']);
        let symbols = parseNmOutput(output);

        // Filter to functions only (T, t types)
        let functions = symbols.filter(s => s.type === 'T' || s.type === 't');

        // Apply regex filter if provided
        if (filter) {
          try {
            const regex = new RegExp(filter);
            functions = functions.filter(f => regex.test(f.name));
          } catch {
            return {
              content: [{ type: 'text', text: `Invalid regex pattern: ${filter}` }],
              isError: true,
            };
          }
        }

        // Sort
        if (sort_by === 'name') {
          functions.sort((a, b) => a.name.localeCompare(b.name));
        } else if (sort_by === 'size') {
          functions.sort((a, b) => b.size - a.size);
        } else if (sort_by === 'address') {
          functions.sort((a, b) => a.address.localeCompare(b.address));
        }

        const totalSize = functions.reduce((sum, f) => sum + f.size, 0);

        let result = `## Functions in ${binary_path}\n\n`;
        result += `**Total functions**: ${functions.length}\n`;
        result += `**Total code size**: ${formatBytes(totalSize)}\n\n`;

        if (functions.length === 0) {
          result += '_No functions found._\n';
        } else {
          const rows = functions.slice(0, 50).map(f => [
            `0x${f.address}`,
            formatBytes(f.size),
            f.name,
          ]);

          result += formatTable(['Address', 'Size', 'Name'], rows);

          if (functions.length > 50) {
            result += `\n\n_... and ${functions.length - 50} more functions_`;
          }
        }

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error listing functions: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // get_sections - List sections in a binary
  server.tool(
    'get_sections',
    'List all sections in an ELF binary',
    {
      binary_path: z.string().describe('Path to the binary file'),
    },
    async ({ binary_path }) => {
      try {
        const output = await binutils.readelf(binary_path, ['-S', '-W']);
        const sections = parseReadelfSections(output);

        let result = `## Sections in ${binary_path}\n\n`;
        result += `Total: ${sections.length} sections\n\n`;

        if (sections.length === 0) {
          result += '_No sections found._\n';
        } else {
          const rows = sections.map(s => [
            s.index.toString(),
            s.name,
            s.type,
            `0x${s.address}`,
            formatBytes(s.size),
            s.flags,
          ]);

          result += formatTable(['#', 'Name', 'Type', 'Address', 'Size', 'Flags'], rows);
        }

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error getting sections: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // disassemble_function - Disassemble a specific function
  server.tool(
    'disassemble_function',
    'Disassemble a specific function from a binary',
    {
      binary_path: z.string().describe('Path to the binary file'),
      function_name: z.string().describe('Name of the function to disassemble'),
      syntax: z
        .enum(['att', 'intel'])
        .optional()
        .default('intel')
        .describe('Assembly syntax (x86 only)'),
    },
    async ({ binary_path, function_name, syntax }) => {
      try {
        const args = ['-d', '-C', `--disassembler-options=${syntax}`];
        const output = await binutils.objdump(binary_path, args);

        // Extract the specific function
        const lines = output.split('\n');
        const functionLines: string[] = [];
        let inFunction = false;
        let foundFunction = false;

        for (const line of lines) {
          // Function start: address <function_name>:
          if (line.includes(`<${function_name}>:`)) {
            inFunction = true;
            foundFunction = true;
            functionLines.push(line);
            continue;
          }

          if (inFunction) {
            // End of function: empty line followed by another function, or just another function
            if (line.trim() === '' && functionLines.length > 1) {
              // Check if next meaningful content is a new function
              break;
            }
            if (line.match(/^[0-9a-f]+\s+<[^>]+>:$/i) && functionLines.length > 0) {
              break;
            }
            functionLines.push(line);
          }
        }

        if (!foundFunction) {
          return {
            content: [
              { type: 'text', text: `Function '${function_name}' not found in binary.` },
            ],
            isError: true,
          };
        }

        let result = `## Disassembly: ${function_name}\n\n`;
        result += '```asm\n';
        result += functionLines.join('\n');
        result += '\n```';

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error disassembling function: ${message}` }],
          isError: true,
        };
      }
    }
  );

  // get_size_breakdown - Detailed size analysis
  server.tool(
    'get_size_breakdown',
    'Get detailed size breakdown showing largest symbols and sections',
    {
      binary_path: z.string().describe('Path to the binary file'),
      top_n: z.number().optional().default(20).describe('Number of top symbols to show'),
      by_section: z.boolean().optional().default(false).describe('Group by section'),
    },
    async ({ binary_path, top_n, by_section }) => {
      try {
        // Get symbols
        const symbolsOutput = await binutils.nm(binary_path, ['--print-size', '-C']);
        const symbols = parseNmOutput(symbolsOutput);
        const definedSymbols = filterDefinedSymbols(symbols);

        // Get sections
        const sectionsOutput = await binutils.readelf(binary_path, ['-S', '-W']);
        const sections = parseReadelfSections(sectionsOutput);

        let result = `## Size Breakdown: ${binary_path}\n\n`;

        // Section sizes
        result += `### Section Sizes\n`;
        const sectionRows = sections
          .filter(s => s.size > 0)
          .sort((a, b) => b.size - a.size)
          .map(s => [s.name, formatBytes(s.size), s.type]);
        result += formatTable(['Section', 'Size', 'Type'], sectionRows);

        const totalSectionSize = sections.reduce((sum, s) => sum + s.size, 0);
        result += `\n**Total**: ${formatBytes(totalSectionSize)}\n\n`;

        if (by_section) {
          // Group symbols by type (code vs data)
          const codeFunctions = definedSymbols
            .filter(s => s.type === 'T' || s.type === 't')
            .sort((a, b) => b.size - a.size)
            .slice(0, top_n);

          const dataObjects = definedSymbols
            .filter(s => ['D', 'd', 'B', 'b', 'R', 'r'].includes(s.type))
            .sort((a, b) => b.size - a.size)
            .slice(0, top_n);

          result += `### Largest Functions (top ${top_n})\n`;
          if (codeFunctions.length > 0) {
            const rows = codeFunctions.map(s => [s.name, formatBytes(s.size)]);
            result += formatTable(['Function', 'Size'], rows);
          } else {
            result += '_No functions found._\n';
          }

          result += `\n### Largest Data Objects (top ${top_n})\n`;
          if (dataObjects.length > 0) {
            const rows = dataObjects.map(s => [s.name, formatBytes(s.size)]);
            result += formatTable(['Symbol', 'Size'], rows);
          } else {
            result += '_No data objects found._\n';
          }
        } else {
          // All symbols together
          const topSymbols = definedSymbols.sort((a, b) => b.size - a.size).slice(0, top_n);

          result += `### Largest Symbols (top ${top_n})\n`;
          if (topSymbols.length > 0) {
            const rows = topSymbols.map(s => [
              s.name,
              formatBytes(s.size),
              formatSymbolType(s.type),
            ]);
            result += formatTable(['Symbol', 'Size', 'Type'], rows);
          } else {
            result += '_No symbols found._\n';
          }
        }

        return { content: [{ type: 'text', text: result }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error getting size breakdown: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
