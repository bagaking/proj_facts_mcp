import { z } from 'zod';
import { ITool, IFactsManager, InsightRecord } from '../interfaces/core-interfaces.js';

const RecordInsightInputSchema = z.object({
  task: z.string().describe('The task or problem that was solved'),
  solution: z.string().describe('The solution or approach that was used'),
  reasoning: z.string().describe('Why this solution was chosen and how it works'),
  evidence: z.array(z.string()).optional().describe('Supporting evidence, references, or validation'),
  category: z.enum(['technical', 'process', 'decision', 'pattern']).describe('Category of the insight'),
  confidence: z.enum(['high', 'medium', 'low']).optional().default('medium').describe('Confidence level in this solution'),
  tags: z.array(z.string()).optional().describe('Tags for better categorization and search'),
  related_files: z.array(z.string()).optional().describe('Files that were created or modified')
});

export class RecordInsightTool implements ITool {
  name = 'record_insight';
  description = 'Record insights, solutions, and learnings from completed tasks for future reference';
  inputSchema = RecordInsightInputSchema;

  constructor(private factsManager: IFactsManager) {}

  async execute(args: any): Promise<any> {
    const input = RecordInsightInputSchema.parse(args);
    const currentTime = new Date().toISOString();

    try {
      // 1. Create structured insight record
      const insightRecord: InsightRecord = {
        task: input.task,
        solution: input.solution,
        reasoning: input.reasoning,
        evidence: input.evidence || [],
        category: input.category,
        confidence: input.confidence
      };

      // 2. Get project context for better organization
      const projectContext = await this.factsManager.getProjectContext();

      // 3. Generate insight metadata
      const insightMetadata = {
        timestamp: currentTime,
        project_path: projectContext.currentPath,
        tags: input.tags || this.extractTagsFromContent(input.task, input.solution),
        related_files: input.related_files || [],
        hash: this.generateInsightHash(input.task, input.solution)
      };

      // 4. Record the insight
      await this.factsManager.recordInsight(insightRecord);

      // 5. Generate file suggestion based on category and content
      const suggestedFilename = this.generateFilename(input.category, input.task, currentTime);

      return {
        success: true,
        message: `Successfully recorded ${input.category} insight`,
        data: {
          insight_id: insightMetadata.hash,
          category: input.category,
          confidence: input.confidence,
          suggested_filename: suggestedFilename,
          tags: insightMetadata.tags,
          storage_location: `local_docs/${suggestedFilename}`,
          search_keywords: this.extractSearchKeywords(input.task, input.solution)
        },
        nextSteps: [
          'Insight has been recorded in local knowledge base',
          'Consider reviewing related insights for patterns',
          'Update project documentation if this represents a significant learning'
        ],
        timestamp: currentTime,
        metadata: {
          project_context: {
            current_path: projectContext.currentPath,
            total_facts: projectContext.factCount + 1
          },
          categorization: {
            primary_category: input.category,
            auto_tags: insightMetadata.tags,
            confidence_level: input.confidence
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to record insight: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null,
        timestamp: currentTime
      };
    }
  }

  private extractTagsFromContent(task: string, solution: string): string[] {
    const text = `${task} ${solution}`.toLowerCase();
    const commonTags = [
      'typescript', 'javascript', 'react', 'node', 'api', 'database',
      'testing', 'deployment', 'security', 'performance', 'ui', 'backend',
      'frontend', 'architecture', 'pattern', 'bug-fix', 'feature', 'refactor'
    ];

    return commonTags.filter(tag => text.includes(tag));
  }

  private generateInsightHash(task: string, solution: string): string {
    const content = `${task}${solution}${Date.now()}`;
    // Simple hash for uniqueness - in production, use a proper hash function
    return content.split('').reduce((hash, char) => {
      return ((hash << 5) - hash + char.charCodeAt(0)) & 0xffffffff;
    }, 0).toString(16);
  }

  private generateFilename(category: string, task: string, timestamp: string): string {
    const date = new Date(timestamp);
    const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
    
    // Extract key words from task for filename
    const taskWords = task.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(' ')
      .filter(word => word.length > 3)
      .slice(0, 3)
      .join('_');

    return `INSIGHT_${dateStr}_${category}_${taskWords}.md`;
  }

  private extractSearchKeywords(task: string, solution: string): string[] {
    const text = `${task} ${solution}`.toLowerCase();
    const words = text.match(/\b\w{4,}\b/g) || [];
    
    // Get unique words, remove common ones
    const stopWords = new Set(['this', 'that', 'with', 'have', 'will', 'from', 'they', 'been', 'were', 'said']);
    const uniqueWords = [...new Set(words)].filter(word => !stopWords.has(word));
    
    return uniqueWords.slice(0, 10); // Top 10 keywords
  }
}