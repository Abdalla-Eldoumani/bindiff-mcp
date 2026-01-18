#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Binutils } from './lib/binutils.js';
import { registerAllTools } from './tools/index.js';

const SERVER_NAME = 'bindiff-mcp';
const SERVER_VERSION = '1.0.0';

/**
 * Log a message to stderr (so it doesn't interfere with MCP communication on stdout)
 */
function log(message: string): void {
  console.error(`[${SERVER_NAME}] ${message}`);
}

/**
 * Main entry point
 */
async function main(): Promise<void> {
  log(`Starting ${SERVER_NAME} v${SERVER_VERSION}`);

  // Initialize binutils wrapper
  const toolchainPrefix = process.env.BINDIFF_TOOLCHAIN_PREFIX || '';
  if (toolchainPrefix) {
    log(`Using toolchain prefix: ${toolchainPrefix}`);
  }

  const binutils = new Binutils(toolchainPrefix);

  // Check binutils availability
  log('Checking binutils availability...');
  const { available, missing } = await binutils.checkAvailability();

  if (available.length > 0) {
    log(`Available tools: ${available.join(', ')}`);
  }

  if (missing.length > 0) {
    log(`Warning: Missing tools: ${missing.join(', ')}`);
    log('Some functionality may be limited. Install GNU binutils to enable all features.');
  }

  if (available.length === 0) {
    log('Error: No binutils tools found. Please install GNU binutils.');
    log('On Windows: Install via MSYS2, Cygwin, or WSL');
    log('On macOS: brew install binutils');
    log('On Linux: apt install binutils (or equivalent)');
    process.exit(1);
  }

  // Create MCP server
  const server = new McpServer({
    name: SERVER_NAME,
    version: SERVER_VERSION,
  });

  // Register all tools
  registerAllTools(server, binutils);

  log('Tools registered successfully');

  // Connect to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  log('Server connected and ready');
}

// Run main
main().catch((error) => {
  console.error(`[${SERVER_NAME}] Fatal error:`, error);
  process.exit(1);
});
