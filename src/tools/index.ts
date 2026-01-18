import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { Binutils } from '../lib/binutils.js';
import { registerAnalyzeTools } from './analyze.js';
import { registerCompareTools } from './compare.js';

/**
 * Register all tools with the MCP server
 */
export function registerAllTools(server: McpServer, binutils: Binutils): void {
  registerAnalyzeTools(server, binutils);
  registerCompareTools(server, binutils);
}
