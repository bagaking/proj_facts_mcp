import { z } from 'zod';
import { ITool, IFactsManager } from '../interfaces/core-interfaces.js';

const HowToSolveInputSchema = z.object({
  problem: z.string().describe('The problem or task to solve'),
  context: z.string().optional().describe('Additional context about the current situation'),
  constraints: z.array(z.string()).optional().describe('Any constraints or limitations'),
  priority: z.enum(['high', 'medium', 'low']).optional().default('medium')
});

export class HowToSolveTool implements ITool {
  name = 'how_to_solve';
  description = 'Analyze a problem and provide guidance on solution approaches based on project knowledge and best practices';
  inputSchema = HowToSolveInputSchema;

  constructor(private factsManager: IFactsManager) {}

  async execute(args: any): Promise<any> {
    const input = HowToSolveInputSchema.parse(args);
    const currentTime = new Date().toISOString();

    try {
      // 1. Get project context
      const projectContext = await this.factsManager.getProjectContext();
      
      // 2. Search for relevant facts and previous solutions
      const relevantFacts = await this.factsManager.searchFacts(input.problem, {
        maxResults: 10,
        categories: ['technical', 'process', 'pattern'],
        minRelevance: 0.6
      });

      // 3. Analyze problem complexity and determine agent type
      const problemComplexity = this.analyzeProblemComplexity(input.problem, input.constraints || []);
      const recommendedAgentType = this.determineAgentType(problemComplexity, input.priority);

      return {
        success: true,
        message: `Found ${relevantFacts.length} relevant insights for problem analysis`,
        data: {
          agent_type: recommendedAgentType,
          agent_prompt: `agents/${recommendedAgentType}.md`,
          context_data: {
            original_problem: input.problem,
            problem_context: input.context || '',
            constraints: input.constraints || [],
            priority: input.priority,
            project_context: {
              current_path: projectContext.currentPath,
              has_local_docs: projectContext.hasLocalDocs,
              available_categories: projectContext.categories
            },
            relevant_facts: relevantFacts.map(fact => ({
              title: fact.title,
              category: fact.category,
              relevance_score: fact.relevanceScore,
              summary: fact.summary,
              path: fact.path
            })),
            analysis_metadata: {
              complexity_level: problemComplexity,
              search_results_count: relevantFacts.length,
              timestamp: currentTime
            }
          }
        },
        nextSteps: [
          `Use Task tool to call ${recommendedAgentType} agent with provided context`,
          'Agent will analyze problem and provide solution approach',
          'Execute recommended solution steps',
          'Call record_insight tool to capture learnings'
        ],
        timestamp: currentTime
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to analyze problem: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null,
        timestamp: currentTime
      };
    }
  }

  private analyzeProblemComplexity(problem: string, constraints: string[]): 'simple' | 'moderate' | 'complex' {
    const keywords = {
      complex: ['architecture', 'system', 'integration', 'multiple', 'distributed', 'scalability'],
      moderate: ['implement', 'design', 'optimize', 'refactor', 'connect'],
      simple: ['fix', 'update', 'change', 'add', 'remove']
    };

    const problemLower = problem.toLowerCase();
    const constraintCount = constraints.length;

    if (constraintCount > 3 || keywords.complex.some(keyword => problemLower.includes(keyword))) {
      return 'complex';
    }
    if (constraintCount > 1 || keywords.moderate.some(keyword => problemLower.includes(keyword))) {
      return 'moderate';
    }
    return 'simple';
  }

  private determineAgentType(complexity: string, priority: string): string {
    // 统一使用facts-manager agent处理所有问题
    return 'facts-manager';
  }
}