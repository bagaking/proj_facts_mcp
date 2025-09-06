import { z } from 'zod';
import { ITool, IFactsManager, IFileManager } from '../interfaces/core-interfaces.js';
import path from 'path';

const InitFactsSystemInputSchema = z.object({
  project_path: z.string().optional().describe('Path to initialize the facts system (defaults to current directory)'),
  enable_auto_capture: z.boolean().optional().default(true).describe('Whether to enable automatic insight capture in CLAUDE.md')
});

export class InitFactsSystemTool implements ITool {
  name = 'init_facts_system';
  description = 'Initialize the local facts system with directory structure, agents, and CLAUDE.md integration';
  inputSchema = InitFactsSystemInputSchema;

  constructor(
    private factsManager: IFactsManager,
    private fileManager: IFileManager
  ) {}

  async execute(args: any): Promise<any> {
    const input = InitFactsSystemInputSchema.parse(args);
    const currentTime = new Date().toISOString();
    const projectPath = input.project_path || process.cwd();

    try {
      // 1. Create local_docs directory structure
      const localDocsPath = path.join(projectPath, 'local_docs');
      await this.fileManager.createDirectory(localDocsPath);

      // 2. Initialize the facts system
      await this.factsManager.initializeLocalDocs();

      // 3. Create initial KNOWLEDGE.md
      const knowledgeContent = this.generateKnowledgeContent();
      await this.fileManager.writeFile(
        path.join(localDocsPath, 'KNOWLEDGE.md'), 
        knowledgeContent
      );

      // 4. Create USER_COMMAND.md template
      const userCommandContent = this.generateUserCommandTemplate();
      await this.fileManager.writeFile(
        path.join(localDocsPath, 'USER_COMMAND.md'),
        userCommandContent
      );

      // 5. Install agent prompts locally (copy from package)
      const agentsPath = path.join(projectPath, 'agents');
      await this.fileManager.createDirectory(agentsPath);
      
      const agentFiles = [
        'facts-manager.md'
      ];

      for (const agentFile of agentFiles) {
        // In a real implementation, you'd copy from the package installation
        const agentContent = await this.getAgentTemplate(agentFile);
        await this.fileManager.writeFile(
          path.join(agentsPath, agentFile),
          agentContent
        );
      }

      // 6. Update or create CLAUDE.md with facts integration
      const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
      const claudeMdContent = await this.generateClaudeMdContent(input.enable_auto_capture);
      
      if (await this.fileManager.exists(claudeMdPath)) {
        // Append to existing CLAUDE.md
        const existingContent = await this.fileManager.readFile(claudeMdPath);
        const updatedContent = this.mergeClaudeMdContent(existingContent, claudeMdContent);
        await this.fileManager.writeFile(claudeMdPath, updatedContent);
      } else {
        // Create new CLAUDE.md
        await this.fileManager.writeFile(claudeMdPath, claudeMdContent);
      }

      // 7. Create initial insight templates
      const templatesPath = path.join(localDocsPath, 'templates');
      await this.fileManager.createDirectory(templatesPath);
      
      const insightTemplate = this.generateInsightTemplate();
      await this.fileManager.writeFile(
        path.join(templatesPath, 'insight-template.md'),
        insightTemplate
      );

      return {
        success: true,
        message: 'Facts system successfully initialized',
        data: {
          project_path: projectPath,
          local_docs_path: localDocsPath,
          agents_installed: agentFiles.length,
          claude_md_updated: true,
          auto_capture_enabled: input.enable_auto_capture,
          created_structure: {
            '.bkproj/facts/': 'Main facts storage directory',
            '.bkproj/facts/KNOWLEDGE.md': 'Auto-maintained facts index',
            '.bkproj/facts/solutions/': 'Solved problems and solutions',
            '.bkproj/facts/docs/': 'Excerpted reference materials',
            '.bkproj/facts/templates/': 'Templates for consistent insight format',
            'USER_COMMAND.md': 'Project-specific commands and requirements',
            'agents/': 'Local agent prompt templates'
          }
        },
        nextSteps: [
          'Start using `how_to_solve` before tackling any new problem',
          'Use `record_insight` after completing tasks to build knowledge',
          'Review local_docs/GUIDELINE.md to understand your growing knowledge base',
          'Customize agent prompts in agents/ directory for your specific needs'
        ],
        timestamp: currentTime,
        metadata: {
          installation_summary: {
            directories_created: 4,
            files_created: agentFiles.length + 3, // agents + GUIDELINE + template + CLAUDE.md
            integration_points: ['CLAUDE.md', 'MCP tools', 'local agents']
          }
        }
      };

    } catch (error) {
      return {
        success: false,
        message: `Failed to initialize facts system: ${error instanceof Error ? error.message : 'Unknown error'}`,
        data: null,
        timestamp: currentTime
      };
    }
  }

  private generateKnowledgeContent(): string {
    const timestamp = new Date().toISOString();
    return `---
auto_generated: true
last_updated: ${timestamp}
total_documents: 0
categories: ["technical", "process", "decision", "pattern"]
---

# 项目知识库指南

## 📊 知识统计
- **技术洞察**: 0个 (技术实现、工具使用、架构设计等)
- **流程改进**: 0个 (工作流程、开发流程、协作方式等)  
- **决策记录**: 0个 (重要决策、选择reasoning、权衡分析等)
- **模式总结**: 0个 (可复用的解决模式、最佳实践等)

## 📁 按类别分类

### 🔧 技术洞察 (Technical)
*暂无文档 - 开始记录你的第一个技术发现！*

### 🔄 流程改进 (Process) 
*暂无文档 - 记录改进开发效率的经验*

### 🎯 决策记录 (Decision)
*暂无文档 - 记录重要的技术和业务决策*

### 🧩 模式总结 (Pattern)
*暂无文档 - 沉淀可复用的解决方案模式*

## 🚀 使用指南

### 开始新任务前
1. 使用 \`how_to_solve "你的问题描述"\` 查找相关经验
2. Agent将分析历史知识并提供解决思路
3. 基于建议开始实施解决方案

### 完成任务后  
1. 使用 \`record_insight\` 记录解决过程和关键发现
2. 系统自动更新本指南和知识分类
3. 为未来类似问题积累可搜索的知识

### 知识复用
- **关键词搜索**: 系统自动从任务描述中提取关键词匹配历史经验
- **类别浏览**: 按technical/process/decision/pattern浏览相关知识  
- **相关性评分**: 自动计算历史经验与当前问题的相关度

## 🎯 最佳实践建议

### 记录洞察时
- **具体化**: 记录具体的问题、解决方案、和reasoning
- **可操作**: 包含足够细节让他人可以复现解决方案
- **有证据**: 提供支持你conclusion的evidence或参考资料
- **标签化**: 使用准确的category和tags便于后续搜索

### 使用历史知识时
- **批判思维**: 历史方案可能不完全适用当前场景
- **验证假设**: 基于当前约束条件验证历史方案的可行性  
- **持续改进**: 在复用基础上进一步优化和完善方案

---
*本指南由Facts MCP系统自动维护，每次记录洞察后自动更新*`;
  }

  private async generateClaudeMdContent(enableAutoCapture: boolean): Promise<string> {
    return `
# Project Facts Management Integration

## Facts System Workflow

本项目已集成 @bagaking/proj_facts_mcp 知识管理系统，请遵循以下工作流程：

### 🔍 任务开始前 - 必须执行
**在开始任何新任务前，必须先查找相关经验：**
\`\`\`bash
# MCP调用示例 - 在Claude Code中直接使用
how_to_solve "你要解决的具体问题描述"
\`\`\`

系统将：
1. 自动搜索local_docs中的相关历史经验
2. 分析问题复杂度并推荐合适的解决方案Agent
3. 提供结构化的问题分析和解决思路
4. 给出具体的实施建议和注意事项

### 📝 任务完成后 - 必须执行  
**完成任务后，必须记录关键洞察和经验：**
\`\`\`bash
# 记录技术实现经验
record_insight --category technical --task "实现用户认证" --solution "使用JWT+Redis方案" --reasoning "考虑到性能和安全性..." --confidence high

# 记录流程改进经验
record_insight --category process --task "优化代码review流程" --solution "引入自动化检查+人工review" --reasoning "平衡效率和质量" --confidence medium
\`\`\`

${enableAutoCapture ? `
### 🤖 自动化集成 (已启用)
系统已配置自动提醒机制：
- **任务开始时**: 自动提示使用 \`how_to_solve\` 查找相关经验
- **任务结束时**: 自动提示使用 \`record_insight\` 记录洞察
- **知识积累**: 每次记录后自动更新 \`local_docs/GUIDELINE.md\`
` : ''}

## Facts System 目录结构

\`\`\`
local_docs/                    # 项目知识库
├── GUIDELINE.md              # 自动维护的知识目录和统计
├── categories/               # 按类别组织的洞察
│   ├── technical/           # 技术实现相关
│   ├── process/             # 流程改进相关  
│   ├── decision/            # 决策记录相关
│   └── pattern/             # 可复用模式相关
├── templates/               # 洞察记录模板
└── [INSIGHT_YYYYMMDD_category_keywords.md] # 具体洞察文档

agents/                       # 本地Agent提示模板
└── facts-manager.md         # 统一的知识管理Agent
\`\`\`

## 使用原则

### 必须遵循的工作流
1. **开始任务** → \`how_to_solve\` → **获得指导** → **执行任务**
2. **完成任务** → \`record_insight\` → **沉淀经验** → **更新知识库**
3. **重复使用** → 历史经验复用 → **持续改进**

### 知识质量要求
- **具体性**: 记录具体问题、具体解决方案、具体reasoning
- **可操作性**: 其他人基于记录的信息能够复现解决方案  
- **有证据性**: 提供supporting evidence、参考资料、验证结果
- **可搜索性**: 使用准确的关键词和标签便于后续检索

---

*Facts Management System v0.1.0 - 让每次解决问题都成为团队知识的增长*
`;
  }

  private mergeClaudeMdContent(existingContent: string, newContent: string): string {
    // Check if facts system content already exists
    if (existingContent.includes('Project Facts Management Integration')) {
      return existingContent; // Already integrated
    }
    
    // Append to existing content
    return existingContent + '\n\n' + newContent;
  }

  private generateInsightTemplate(): string {
    return `---
category: [technical|process|decision|pattern]
confidence: [high|medium|low]
created_date: YYYY-MM-DD
tags: [tag1, tag2, tag3]
related_files: [file1, file2]
---

# [任务标题] - 解决方案洞察

## 🎯 问题描述
[详细描述遇到的具体问题，包括背景和约束条件]

## 💡 解决方案
[详细描述采用的解决方案，包括关键步骤和实现细节]

## 🤔 解决思路 (Reasoning)
[解释为什么选择这个方案，考虑了哪些因素，权衡了哪些选项]

## 📋 实施步骤
1. **准备阶段**: [具体步骤]
2. **核心实施**: [具体步骤]  
3. **验证测试**: [具体步骤]
4. **总结优化**: [具体步骤]

## 📊 验证结果
[解决方案的效果如何，有什么可以量化的指标或结果]

## 🔗 参考资料
- [资料1]: [具体章节或链接] - [为什么相关]
- [资料2]: [具体章节或链接] - [为什么相关]

## ⚠️ 注意事项
- **风险点**: [实施过程中需要注意的风险]
- **适用场景**: [这个方案适用于什么场景，不适用于什么场景]
- **改进空间**: [未来可以怎么优化这个方案]

## 🔄 可复用性
**类似问题**: [这个方案可以应用到哪些类似问题]
**关键模式**: [可以抽取出的通用模式或原则]
**扩展方向**: [基于这个方案可以怎么扩展解决更复杂问题]

---
*记录时间: [YYYY-MM-DD HH:MM]*  
*置信度: [对这个方案的信心程度及原因]*`;
  }

  private async getAgentTemplate(filename: string): Promise<string> {
    // In a real implementation, you'd read from the installed package
    // For now, return a placeholder
    return `# ${filename.replace('.md', '').split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ')} Agent

专业的问题解决Agent模板 - 请根据项目需求自定义。

## 核心能力
- 问题分析
- 方案设计  
- 实施指导
- 质量保证

## 工作流程
1. 理解问题上下文
2. 分析相关历史经验
3. 设计解决方案
4. 提供实施指导

*此模板需要根据具体项目需求进行定制*`;
  }

  private generateUserCommandTemplate(): string {
    return `---
# 项目特定指令和要求
# 此文件用于定义项目中必须遵循的强制性规则和指令
# 每个指令将在 how_to_solve 时优先显示
---

# 项目指令中心 (USER_COMMAND.md)

> 📋 **重要**: 这些是项目中必须严格遵循的指令。使用 \`how_to_solve\` 时，相关指令将优先显示。

## 包管理工具

**描述**: 本项目必须使用 pnpm 进行包管理，禁止使用 npm 或 yarn
**相关文档**: 
**更新时间**: ${new Date().toISOString().split('T')[0]}

在所有安装、更新、运行脚本时必须使用 \`pnpm\`：
- 安装依赖: \`pnpm install\`
- 添加依赖: \`pnpm add <package>\`
- 运行脚本: \`pnpm run <script>\`

## 代码风格

**描述**: 严格遵循项目 ESLint 和 Prettier 配置，提交前必须通过 lint 检查
**相关文档**: 
**更新时间**: ${new Date().toISOString().split('T')[0]}

所有代码变更必须：
1. 通过 \`pnpm run lint\` 检查
2. 通过 \`pnpm run type-check\` 检查
3. 遵循现有代码的命名和组织方式

## 测试要求

**描述**: 所有新功能必须包含相应的单元测试，测试覆盖率不低于80%
**相关文档**: 
**更新时间**: ${new Date().toISOString().split('T')[0]}

在提交代码前必须：
1. 运行 \`pnpm test\` 确保所有测试通过
2. 为新功能编写对应的测试用例
3. 验证测试覆盖率满足要求

---

## 如何添加新指令

每个指令使用以下格式：

\`\`\`markdown
## 指令标题

**描述**: 简要描述这个指令的内容和要求
**相关文档**: 如果有相关的 docs/ 文件，在此引用
**更新时间**: YYYY-MM-DD

详细的指令内容和具体要求...
\`\`\`

*系统会自动检测查询内容与指令的匹配度，相关指令会在解决方案中优先显示*`;
  }
}