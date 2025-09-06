export interface ITool {
  name: string;
  description: string;
  inputSchema: any;
  execute(args: any): Promise<any>;
}

export interface IFileManager {
  exists(path: string): Promise<boolean>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  listFiles(directory: string): Promise<string[]>;
  createDirectory(path: string): Promise<void>;
}

export interface IFactsManager {
  searchFacts(query: string, options?: SearchOptions): Promise<FactDocument[]>;
  recordInsight(insight: InsightRecord): Promise<void>;
  getProjectContext(): Promise<ProjectContext>;
  initializeLocalDocs(): Promise<void>;
}

export interface SearchOptions {
  maxResults?: number;
  categories?: string[];
  minRelevance?: number;
}

export interface FactDocument {
  path: string;
  title: string;
  category: string;
  relevanceScore: number;
  summary: string;
  lastUpdated: string;
}

export interface InsightRecord {
  task: string;
  solution: string;
  reasoning: string;
  evidence: string[];
  category: 'technical' | 'process' | 'decision' | 'pattern';
  confidence: 'high' | 'medium' | 'low';
}

export interface ProjectContext {
  currentPath: string;
  hasLocalDocs: boolean;
  factCount: number;
  categories: string[];
  lastActivity: string;
}