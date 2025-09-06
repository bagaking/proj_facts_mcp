import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { HowToSolveTool } from '../tools/how-to-solve.js';
import { RecordInsightTool } from '../tools/record-insight.js';
import { InitFactsSystemTool } from '../tools/init-facts-system.js';
import { FactsManager } from '../utils/facts-manager.js';
import { FileManager } from '../utils/file-manager.js';
import { ITool } from '../interfaces/core-interfaces.js';

export class FactsMCPServer {
  private server: Server;
  private tools: Map<string, ITool> = new Map();

  constructor() {
    this.server = new Server(
      {
        name: '@bagaking/proj_facts_mcp',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.initializeTools();
    this.setupRequestHandlers();
  }

  private initializeTools(): void {
    const fileManager = new FileManager();
    const factsManager = new FactsManager(fileManager);

    const tools = [
      new HowToSolveTool(factsManager),
      new RecordInsightTool(factsManager),
      new InitFactsSystemTool(factsManager, fileManager),
    ];

    tools.forEach(tool => {
      this.tools.set(tool.name, tool);
    });
  }

  private setupRequestHandlers(): void {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      const toolList = Array.from(this.tools.values()).map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      }));

      return { tools: toolList };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = this.tools.get(name);
      if (!tool) {
        throw new Error(`Tool "${name}" not found`);
      }

      try {
        const result = await tool.execute(args || {});
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                success: false,
                message: `Error executing ${name}: ${errorMessage}`,
                data: null,
                timestamp: new Date().toISOString()
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.error('Facts MCP Server started and listening on stdio');
    console.error('Available tools:', Array.from(this.tools.keys()));
  }

  async stop(): Promise<void> {
    await this.server.close();
  }
}