import { IFactsManager, SearchOptions, FactDocument, InsightRecord, ProjectContext, IFileManager } from '../interfaces/core-interfaces.js';
import path from 'path';
import { readdir, stat } from 'fs/promises';

export class FactsManager implements IFactsManager {
  private localDocsPath: string;
  private userCommandPath: string;

  constructor(
    private fileManager: IFileManager,
    projectPath: string = process.cwd()
  ) {
    this.localDocsPath = path.join(projectPath, '.bkproj', 'facts');
    this.userCommandPath = path.join(this.localDocsPath, 'USER_COMMAND.md');
  }

  async searchFacts(query: string, options: SearchOptions = {}): Promise<FactDocument[]> {
    // First check user commands for high-priority project-specific instructions
    const userCommands = await this.getUserCommands(query);
    if (userCommands.length > 0) {
      // User commands take highest priority - create special fact documents for them
      const commandFacts = userCommands.map(cmd => ({
        path: this.userCommandPath,
        title: `项目指令: ${cmd.command}`,
        category: 'command' as any,
        relevanceScore: 1.0, // Maximum priority
        summary: cmd.description,
        lastUpdated: cmd.lastUpdated || '',
        relatedDocs: cmd.relatedDocs || []
      }));
      
      // Continue with normal search and append other results
      const normalFacts = await this.searchFactsInternal(query, options);
      return [...commandFacts, ...normalFacts];
    }
    
    return this.searchFactsInternal(query, options);
  }

  private async searchFactsInternal(query: string, options: SearchOptions = {}): Promise<FactDocument[]> {
    const {
      maxResults = 10,
      categories = ['technical', 'process', 'decision', 'pattern'],
      minRelevance = 0.5
    } = options;

    try {
      if (!await this.fileManager.exists(this.localDocsPath)) {
        return [];
      }

      const files = await this.findInsightFiles();
      const factDocuments: FactDocument[] = [];

      for (const filePath of files) {
        try {
          const content = await this.fileManager.readFile(filePath);
          const metadata = this.parseInsightMetadata(content);
          
          if (categories.includes(metadata.category)) {
            const relevanceScore = this.calculateRelevance(query, content, metadata);
            
            if (relevanceScore >= minRelevance) {
              factDocuments.push({
                path: filePath,
                title: metadata.title || path.basename(filePath, '.md'),
                category: metadata.category,
                relevanceScore,
                summary: this.extractSummary(content),
                lastUpdated: metadata.created_date || ''
              });
            }
          }
        } catch (error) {
          console.warn(`Failed to process insight file ${filePath}:`, error);
        }
      }

      // Sort by relevance and limit results
      return factDocuments
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxResults);

    } catch (error) {
      console.error('Error searching facts:', error);
      return [];
    }
  }

  async recordInsight(insight: InsightRecord): Promise<void> {
    try {
      const filename = this.generateInsightFilename(insight);
      const filePath = path.join(this.localDocsPath, 'solutions', filename);
      const content = this.formatInsightContent(insight);

      await this.fileManager.writeFile(filePath, content);
      await this.updateKnowledge();

    } catch (error) {
      throw new Error(`Failed to record insight: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getProjectContext(): Promise<ProjectContext> {
    try {
      const hasLocalDocs = await this.fileManager.exists(this.localDocsPath);
      
      if (!hasLocalDocs) {
        return {
          currentPath: process.cwd(),
          hasLocalDocs: false,
          factCount: 0,
          categories: [],
          lastActivity: new Date().toISOString()
        };
      }

      const files = await this.findInsightFiles();
      const categories = new Set<string>();
      let lastActivity = new Date(0).toISOString();

      for (const filePath of files) {
        try {
          const content = await this.fileManager.readFile(filePath);
          const metadata = this.parseInsightMetadata(content);
          categories.add(metadata.category);
          
          if (metadata.created_date && metadata.created_date > lastActivity) {
            lastActivity = metadata.created_date;
          }
        } catch (error) {
          // Skip files that can't be processed
        }
      }

      return {
        currentPath: process.cwd(),
        hasLocalDocs: true,
        factCount: files.length,
        categories: Array.from(categories),
        lastActivity: lastActivity === new Date(0).toISOString() ? new Date().toISOString() : lastActivity
      };

    } catch (error) {
      throw new Error(`Failed to get project context: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async initializeLocalDocs(): Promise<void> {
    try {
      await this.fileManager.createDirectory(this.localDocsPath);
      await this.fileManager.createDirectory(path.join(this.localDocsPath, 'solutions'));
      await this.fileManager.createDirectory(path.join(this.localDocsPath, 'docs'));

    } catch (error) {
      throw new Error(`Failed to initialize local docs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async findInsightFiles(): Promise<string[]> {
    const files: string[] = [];
    
    try {
      // Check solutions directory
      const solutionsPath = path.join(this.localDocsPath, 'solutions');
      if (await this.fileManager.exists(solutionsPath)) {
        const solutionFiles = await this.fileManager.listFiles(solutionsPath);
        for (const file of solutionFiles) {
          if (file.endsWith('.md')) {
            files.push(path.join(solutionsPath, file));
          }
        }
      }

      // Check docs directory  
      const docsPath = path.join(this.localDocsPath, 'docs');
      if (await this.fileManager.exists(docsPath)) {
        const docFiles = await this.fileManager.listFiles(docsPath);
        for (const file of docFiles) {
          if (file.endsWith('.md')) {
            files.push(path.join(docsPath, file));
          }
        }
      }

    } catch (error) {
      console.warn('Error finding insight files:', error);
    }

    return files;
  }

  private parseInsightMetadata(content: string): any {
    const frontMatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (!frontMatterMatch) {
      return { category: 'technical', created_date: '', title: '' };
    }

    const frontMatter = frontMatterMatch[1];
    const metadata: any = {};
    
    frontMatter.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split(':');
      if (key && valueParts.length > 0) {
        const value = valueParts.join(':').trim();
        metadata[key.trim()] = value;
      }
    });

    return metadata;
  }

  private calculateRelevance(query: string, content: string, metadata: any): number {
    const queryLower = query.toLowerCase();
    const contentLower = content.toLowerCase();
    
    let score = 0;

    // Exact phrase match in title/headers (high weight)
    const titleMatch = metadata.title?.toLowerCase().includes(queryLower);
    if (titleMatch) score += 0.4;

    // Word matches in content (medium weight)
    const queryWords = queryLower.split(/\s+/);
    const contentWords = contentLower.split(/\s+/);
    const matchingWords = queryWords.filter(word => 
      contentWords.some(contentWord => contentWord.includes(word) || word.includes(contentWord))
    );
    score += (matchingWords.length / queryWords.length) * 0.4;

    // Category relevance (low weight)
    if (metadata.category && queryLower.includes(metadata.category)) {
      score += 0.1;
    }

    // Tag matches (medium weight)  
    if (metadata.tags) {
      const tags = Array.isArray(metadata.tags) ? metadata.tags : [metadata.tags];
      const tagMatches = tags.filter((tag: string) => 
        queryLower.includes(tag.toLowerCase()) || tag.toLowerCase().includes(queryLower)
      );
      score += (tagMatches.length / Math.max(tags.length, 1)) * 0.1;
    }

    return Math.min(score, 1.0); // Cap at 1.0
  }

  private extractSummary(content: string): string {
    // Extract first meaningful paragraph after frontmatter
    const withoutFrontMatter = content.replace(/^---[\s\S]*?---\n/, '');
    const lines = withoutFrontMatter.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 50 && !trimmed.startsWith('#')) {
        return trimmed.substring(0, 200) + (trimmed.length > 200 ? '...' : '');
      }
    }

    return 'No summary available';
  }

  private generateInsightFilename(insight: InsightRecord): string {
    // Use descriptive filename based on task and solution
    const taskPart = insight.task.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '').substring(0, 30);
    const solutionPart = insight.solution.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '').substring(0, 30);
    
    return `${taskPart}_${solutionPart}.md`;
  }

  private formatInsightContent(insight: InsightRecord): string {
    const timestamp = new Date().toISOString().split('T')[0];
    
    return `---
category: ${insight.category}
confidence: ${insight.confidence}
created_date: ${timestamp}
tags: [${insight.category}]
related_files: []
---

# ${insight.task} - 解决方案洞察

## 🎯 问题描述
${insight.task}

## 💡 解决方案
${insight.solution}

## 🤔 解决思路 (Reasoning)
${insight.reasoning}

## 📋 支持证据
${insight.evidence.map(evidence => `- ${evidence}`).join('\n') || '- 暂无额外证据'}

## 📊 验证结果
*待补充具体的验证结果和效果指标*

## ⚠️ 注意事项
- **置信度**: ${insight.confidence}
- **适用场景**: 需要根据具体情况评估适用性
- **风险点**: *待补充实施过程中需要注意的风险*

## 🔄 可复用性
**类似问题**: *这个方案可以应用到哪些类似问题*
**关键模式**: *可以抽取出的通用模式或原则*

---
*记录时间: ${new Date().toISOString()}*  
*置信度: ${insight.confidence} - ${this.getConfidenceDescription(insight.confidence)}*`;
  }

  private getConfidenceDescription(confidence: string): string {
    switch (confidence) {
    case 'high': return '经过充分验证的可靠方案';
    case 'medium': return '基本可行但需要根据情况调整的方案';
    case 'low': return '实验性方案，需要进一步验证';
    default: return '未评估';
    }
  }

  private async updateKnowledge(): Promise<void> {
    try {
      const context = await this.getProjectContext();
      const knowledgePath = path.join(this.localDocsPath, 'KNOWLEDGE.md');
      
      // Get all solution and doc files
      const solutionFiles = await this.getSolutionFiles();
      const docFiles = await this.getDocFiles();
      
      const knowledgeContent = await this.generateKnowledgeContent(solutionFiles, docFiles, context);

      await this.fileManager.writeFile(knowledgePath, knowledgeContent);
      
    } catch (error) {
      console.warn('Failed to update knowledge base:', error);
    }
  }

  private async getUserCommands(query: string): Promise<Array<{
    command: string;
    description: string;
    lastUpdated?: string;
    relatedDocs?: string[];
  }>> {
    try {
      if (!await this.fileManager.exists(this.userCommandPath)) {
        return [];
      }

      const content = await this.fileManager.readFile(this.userCommandPath);
      const commands = this.parseUserCommands(content);
      
      // Filter commands relevant to the query
      const queryLower = query.toLowerCase();
      return commands.filter(cmd => {
        const commandLower = cmd.command.toLowerCase();
        const descLower = cmd.description.toLowerCase();
        
        // Check if query keywords match command or description
        const queryWords = queryLower.split(/\s+/);
        return queryWords.some(word => 
          commandLower.includes(word) || 
          descLower.includes(word) ||
          word.length > 2 && (commandLower.includes(word) || descLower.includes(word))
        );
      });
    } catch (error) {
      console.warn('Failed to read user commands:', error);
      return [];
    }
  }

  private parseUserCommands(content: string): Array<{
    command: string;
    description: string;
    lastUpdated?: string;
    relatedDocs?: string[];
  }> {
    const commands: Array<{
      command: string;
      description: string;
      lastUpdated?: string;
      relatedDocs?: string[];
    }> = [];

    // Parse markdown sections - each ## section is a command
    const sections = content.split(/^## /m).filter(s => s.trim());
    
    for (const section of sections) {
      const lines = section.split('\n');
      const command = lines[0].trim();
      
      let description = '';
      let relatedDocs: string[] = [];
      let lastUpdated = '';
      
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith('**描述**:') || line.startsWith('**Description**:')) {
          description = line.replace(/\*\*(描述|Description)\*\*:\s*/, '');
        } else if (line.startsWith('**相关文档**:') || line.startsWith('**Related Docs**:')) {
          const docsLine = line.replace(/\*\*(相关文档|Related Docs)\*\*:\s*/, '');
          relatedDocs = docsLine.split(',').map(d => d.trim()).filter(d => d);
        } else if (line.startsWith('**更新时间**:') || line.startsWith('**Last Updated**:')) {
          lastUpdated = line.replace(/\*\*(更新时间|Last Updated)\*\*:\s*/, '');
        } else if (!line.startsWith('**') && line && !description) {
          // If no explicit description, use the first non-metadata line
          description = line;
        }
      }
      
      if (command && description) {
        commands.push({
          command,
          description,
          lastUpdated,
          relatedDocs
        });
      }
    }
    
    return commands;
  }

  private async getSolutionFiles(): Promise<Array<{path: string, name: string, lastModified: string, summary: string}>> {
    const files: Array<{path: string, name: string, lastModified: string, summary: string}> = [];
    
    try {
      const solutionsPath = path.join(this.localDocsPath, 'solutions');
      if (await this.fileManager.exists(solutionsPath)) {
        const fileList = await this.fileManager.listFiles(solutionsPath);
        for (const fileName of fileList) {
          if (fileName.endsWith('.md')) {
            const filePath = path.join(solutionsPath, fileName);
            try {
              const content = await this.fileManager.readFile(filePath);
              const summary = this.extractSummary(content);
              files.push({
                path: filePath,
                name: fileName,
                lastModified: new Date().toISOString(), // In real implementation, get file stats
                summary
              });
            } catch (error) {
              // Skip files that can't be read
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error getting solution files:', error);
    }
    
    return files.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
  }

  private async getDocFiles(): Promise<Array<{path: string, name: string, lastModified: string, summary: string}>> {
    const files: Array<{path: string, name: string, lastModified: string, summary: string}> = [];
    
    try {
      const docsPath = path.join(this.localDocsPath, 'docs');
      if (await this.fileManager.exists(docsPath)) {
        const fileList = await this.fileManager.listFiles(docsPath);
        for (const fileName of fileList) {
          if (fileName.endsWith('.md')) {
            const filePath = path.join(docsPath, fileName);
            try {
              const content = await this.fileManager.readFile(filePath);
              const summary = this.extractSummary(content);
              files.push({
                path: filePath,
                name: fileName,
                lastModified: new Date().toISOString(), // In real implementation, get file stats
                summary
              });
            } catch (error) {
              // Skip files that can't be read
            }
          }
        }
      }
    } catch (error) {
      console.warn('Error getting doc files:', error);
    }
    
    return files.sort((a, b) => b.lastModified.localeCompare(a.lastModified));
  }

  private async generateKnowledgeContent(
    solutionFiles: Array<{path: string, name: string, lastModified: string, summary: string}>,
    docFiles: Array<{path: string, name: string, lastModified: string, summary: string}>,
    context: ProjectContext
  ): Promise<string> {
    const timestamp = new Date().toISOString();
    
    // Extract tech keywords from file names
    const allFileNames = [...solutionFiles.map(f => f.name), ...docFiles.map(f => f.name)];
    const techKeywords = this.extractTechKeywords(allFileNames);
    
    return `---
auto_generated: true  
last_updated: ${timestamp}
total_solutions: ${solutionFiles.length}
total_docs: ${docFiles.length}
total_documents: ${solutionFiles.length + docFiles.length}
---

# 📚 Facts Knowledge Base 导航

> ⚠️ 重要提醒：开始任何任务前，必须先查看本导航了解现有知识！

## 🔧 Solutions (我解决过的问题) - 共${solutionFiles.length}个

${solutionFiles.length > 0 ? solutionFiles.map(file => {
    const dateStr = file.lastModified.split('T')[0];
    return `- \`${file.name}\` - ${file.summary} (最后修改：${dateStr})`;
  }).join('\n') : '*暂无解决方案 - 开始记录你的第一个问题解决过程！*'}

## 📖 Docs (我摘录的原文资料) - 共${docFiles.length}个  

${docFiles.length > 0 ? docFiles.map(file => {
    const dateStr = file.lastModified.split('T')[0];  
    return `- \`${file.name}\` - ${file.summary} (最后修改：${dateStr})`;
  }).join('\n') : '*暂无原文摘录 - 开始摘录权威技术资料！*'}

## 🏷️ 技术关键词统计

${techKeywords.length > 0 ? techKeywords.join(' ') : '暂无关键词统计'}

## 🚀 使用指南

### 开始新任务前
1. 使用 \`how_to_solve "你的问题描述"\` 查找相关经验
2. Agent将分析历史知识并提供解决思路  
3. 基于建议开始实施解决方案

### 完成任务后
1. 使用 \`record_insight\` 记录解决过程和关键发现
2. 系统自动更新本导航和知识分类
3. 为未来类似问题积累可搜索的知识

---
*本导航自动更新于：${timestamp.replace('T', ' ').split('.')[0]}*`;
  }

  private extractTechKeywords(fileNames: string[]): string[] {
    const keywords = new Set<string>();
    const techTerms = [
      'React', 'Vue', 'Angular', 'Node.js', 'TypeScript', 'JavaScript', 'Python', 'Java', 'Go', 'Rust',
      'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis',
      'GraphQL', 'REST', 'API', 'JWT', '认证', '性能', '优化', '架构', '设计', '测试', '部署',
      '数据库', '缓存', '网络', '安全', '监控', '日志', 'CI/CD', 'DevOps'
    ];
    
    fileNames.forEach(fileName => {
      techTerms.forEach(term => {
        if (fileName.toLowerCase().includes(term.toLowerCase()) || 
            fileName.includes(term)) {
          keywords.add(term);
        }
      });
    });
    
    return Array.from(keywords).map(k => `${k}(${Array.from(fileNames).filter(f => 
      f.toLowerCase().includes(k.toLowerCase()) || f.includes(k)).length})`);
  }
}