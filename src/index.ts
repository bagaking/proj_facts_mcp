#!/usr/bin/env node

import { FactsMCPServer } from './services/mcp-server.js';

async function main(): Promise<void> {
  const server = new FactsMCPServer();

  // Handle graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    console.error(`\nReceived ${signal}. Shutting down gracefully...`);
    try {
      await server.stop();
      console.error('Facts MCP Server stopped');
      process.exit(0);
    } catch (error) {
      console.error('Error during shutdown:', error);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  // Handle unhandled errors
  process.on('uncaughtException', (error: Error): void => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason: any): void => {
    console.error('Unhandled Rejection:', reason);
    process.exit(1);
  });

  try {
    await server.start();
  } catch (error) {
    console.error('Failed to start Facts MCP Server:', error);
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}