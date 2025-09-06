# Facts MCP Server

一个专注于项目知识管理和上下文工程的 Model Context Protocol (MCP) 服务器。通过智能的知识整合和经验沉淀，为问题解决提供完整的上下文支持。

## 核心特性

- **上下文工程** (`how_to_solve`) - 整合项目指令+历史经验+调研资料，为问题解决提供完整上下文
- **经验沉淀记录** (`record_insight`) - 结构化记录解决方案和关键洞察到知识库
- **知识自动管理** - 自动维护KNOWLEDGE.md索引和USER_COMMAND.md项目指令
- **facts-manager Agent** - 统一的知识管理和上下文工程专家
- **项目集成** - 一键初始化并集成到现有项目工作流

## 安装使用

### 快速开始

```bash
# 1. 全局安装
npm install -g @bagaking/proj_facts_mcp

# 2. 在Claude Code中添加MCP工具
claude mcp add proj-facts -- npx -y @bagaking/proj_facts_mcp

# 3. 初始化项目知识管理系统
init_facts_system --enable_auto_capture true
```

### 基础工作流

**解决问题前** - 获取完整上下文：
```bash
how_to_solve "实现用户认证系统"
# 返回: 项目约束 + 历史经验 + 调研资料 + 解决上下文
```

**完成任务后** - 记录关键洞察：  
```bash
record_insight --category technical --task "实现JWT认证" --solution "使用RS256算法..." --reasoning "考虑到安全性和性能..." --confidence high
# 自动存储到 .bkproj/facts/solutions/ 并更新索引
```

## MCP 工具详解

### 1. `how_to_solve`

为问题解决构建完整的知识上下文，整合项目约束、历史经验和最新调研。

**输入参数：**
- `problem` (string): 要解决的问题描述
- `context` (string, optional): 额外的上下文信息  
- `constraints` (array, optional): 约束条件
- `priority` (enum, optional): 优先级 [high|medium|low]

**返回内容：**
- 项目约束(USER_COMMAND.md匹配的强制要求)
- 历史经验分析(相关solutions文档和核心模式)
- 调研补充(官方文档和最佳实践摘录)
- 解决思路整合(基于完整上下文的分析)

### 2. `record_insight`

记录任务解决过程中的关键洞察和经验。

**输入参数：**
- `task` (string): 已解决的任务描述
- `solution` (string): 采用的解决方案
- `reasoning` (string): 选择该方案的原因和思考过程
- `evidence` (array, optional): 支持证据和参考资料
- `category` (enum): 洞察类别 [technical|process|decision|pattern]
- `confidence` (enum, optional): 置信度 [high|medium|low]

**返回内容：**
- 生成的solutions文档路径和文件名
- 自动提取的搜索关键词和标签
- 更新后的KNOWLEDGE.md导航索引

### 3. `init_facts_system`

初始化项目的知识管理系统，包括目录结构和工作流集成。

**输入参数：**
- `project_path` (string, optional): 项目路径（默认当前目录）
- `enable_auto_capture` (boolean, optional): 是否在CLAUDE.md中启用自动提醒

**创建的结构：**
```
.bkproj/facts/               # 知识库主目录
├── USER_COMMAND.md          # 项目强制指令(最高优先级)
├── KNOWLEDGE.md             # 自动维护的知识导航索引
├── solutions/               # 我解决过的问题和方案
└── docs/                    # 摘录的原文资料

agents/                      # 本地Agent模板  
└── facts-manager.md        # 统一的知识管理和上下文工程Agent

CLAUDE.md                    # 更新工作流集成
```

## 架构设计

Facts MCP采用MCP+Agent协作模式：

### 1. MCP工具层
- `how_to_solve` - 收集问题上下文，调用facts-manager Agent
- `record_insight` - 接收用户经验，调用facts-manager Agent沉淀
- `init_facts_system` - 初始化知识库目录结构

### 2. facts-manager Agent
**知识管理和上下文工程专家**：
- 管理.bkproj/facts/目录下的所有文档
- 上下文工程：整合项目指令+历史经验+调研资料
- 文档操作：创建、更新、组织solutions/和docs/
- **不直接解决技术问题，而是提供解决问题的完整上下文**

### 3. 知识库结构
- **USER_COMMAND.md** - 项目特定指令，最高优先级
- **solutions/** - 结构化的问题解决经验
- **docs/** - 原文摘录的权威资料
- **KNOWLEDGE.md** - 自动生成的导航索引

## 知识管理最佳实践

### 记录洞察时
- **具体化**: 包含具体的问题场景、解决步骤、验证结果
- **可操作**: 其他人能基于记录复现解决方案
- **有证据**: 提供参考资料、验证数据、相关链接
- **标签化**: 使用准确的category和关键词便于检索

### 使用历史知识时
- **批判性复用**: 评估历史方案对当前场景的适用性
- **渐进式改进**: 在历史基础上进一步优化完善
- **经验传承**: 将改进的方案重新记录形成新的洞察

### 团队协作
- **标准化流程**: 统一使用how_to_solve → 获取上下文 → 执行方案 → record_insight
- **知识共享**: 定期review和讨论关键洞察和决策记录
- **质量控制**: 对重要洞察进行peer review确保准确性
- **项目指令**: 通过USER_COMMAND.md统一项目级强制要求

## 开发和贡献

### 本地开发
```bash
git clone https://github.com/bagaking/proj_facts_mcp.git
cd proj_facts_mcp
npm install
npm run dev  # 开发模式启动
```

### 构建发布
```bash
npm run build    # TypeScript编译
npm run lint     # 代码检查
npm test         # 运行测试
npm publish      # 发布到npm
```

## 许可证

MIT License - 详见 [LICENSE](LICENSE) 文件

---

**Facts MCP v0.1.1** - 让每次问题解决都成为团队知识的增长