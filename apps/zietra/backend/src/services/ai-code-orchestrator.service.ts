import Anthropic from '@anthropic-ai/sdk';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

interface CodeChange {
  filePath: string;
  originalCode: string;
  newCode: string;
  description: string;
  changeType: 'add' | 'modify' | 'delete';
}

interface AnalyzeRequest {
  command: string;
  currentPage: string;
  pageContext: any;
  conversationHistory: any[];
}

export class AICodeOrchestrator {
  private basePath = process.env.PROJECT_ROOT || '/var/www/crm-backend';

  /**
   * Analyze user command and generate code changes
   */
  async analyzeCommand(request: AnalyzeRequest): Promise<{
    response: string;
    codeChanges?: CodeChange[];
  }> {
    const systemPrompt = `You are an expert full-stack developer assistant with access to a CRM application codebase.

**Your Role:**
- Analyze user requests and generate precise code changes
- Understand React/TypeScript frontend and Node.js/Express backend
- Work with PostgreSQL/Prisma for database operations
- Follow existing code patterns and styling (Tailwind CSS)

**Current Context:**
- Page: ${request.currentPage}
- Page Type: ${request.pageContext.pageType}
- Current Tab: ${request.pageContext.tab}

**Instructions:**
1. Analyze the user's request carefully
2. Determine which files need to be modified
3. Generate complete, production-ready code
4. Return your response in JSON format with code changes

**Response Format:**
{
  "analysis": "Brief explanation of what you'll do",
  "codeChanges": [
    {
      "filePath": "frontend/src/pages/...",
      "description": "What this change does",
      "changeType": "add" | "modify" | "delete",
      "newCode": "Complete code to add/modify"
    }
  ],
  "additionalSteps": ["Any manual steps needed"],
  "impact": "Expected impact of changes"
}

**Important:**
- Only suggest changes you're confident about
- Provide complete code, not snippets
- Follow TypeScript best practices
- Maintain existing styling patterns
- Include error handling`;

    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: systemPrompt,
        messages: [
          ...request.conversationHistory.map(msg => ({
            role: msg.role === 'assistant' ? 'assistant' as const : 'user' as const,
            content: msg.content
          })),
          {
            role: 'user',
            content: `${request.command}\n\nPage Context: ${JSON.stringify(request.pageContext, null, 2)}`
          }
        ]
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type');
      }

      // Try to parse JSON response
      let aiResponse;
      try {
        // Extract JSON from markdown code blocks if present
        const jsonMatch = content.text.match(/```json\n([\s\S]*?)\n```/) ||
                         content.text.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content.text;
        aiResponse = JSON.parse(jsonStr);
      } catch {
        // If not JSON, return as plain text response
        return {
          response: content.text,
          codeChanges: undefined
        };
      }

      // Format response for user
      let userResponse = `📝 **Analysis:**\n${aiResponse.analysis}\n\n`;

      if (aiResponse.codeChanges && aiResponse.codeChanges.length > 0) {
        userResponse += `🔧 **Proposed Changes:**\n`;
        aiResponse.codeChanges.forEach((change: any, index: number) => {
          userResponse += `${index + 1}. ${change.description} (${change.filePath})\n`;
        });
        userResponse += `\n✅ Click "Apply Changes" to proceed or "Reject" to cancel.`;
      }

      if (aiResponse.additionalSteps && aiResponse.additionalSteps.length > 0) {
        userResponse += `\n\n⚠️ **Additional Steps:**\n`;
        aiResponse.additionalSteps.forEach((step: string) => {
          userResponse += `• ${step}\n`;
        });
      }

      return {
        response: userResponse,
        codeChanges: aiResponse.codeChanges
      };
    } catch (error) {
      console.error('AI Analysis Error:', error);
      throw new Error(`Failed to analyze command: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Apply code changes to files
   */
  async applyChanges(changes: CodeChange[], currentPage: string): Promise<{
    success: boolean;
    message: string;
    filesModified: string[];
    commitHash: string;
  }> {
    const filesModified: string[] = [];

    try {
      // Create backup
      await this.createBackup();

      // Apply each change
      for (const change of changes) {
        const fullPath = path.join(this.basePath, change.filePath);

        if (change.changeType === 'add' || change.changeType === 'modify') {
          // Ensure directory exists
          await fs.mkdir(path.dirname(fullPath), { recursive: true });

          // Write new code
          await fs.writeFile(fullPath, change.newCode, 'utf-8');
          filesModified.push(change.filePath);
        } else if (change.changeType === 'delete') {
          await fs.unlink(fullPath);
          filesModified.push(change.filePath);
        }
      }

      // Git commit
      const commitMessage = `AI Code Assistant: ${changes[0].description} (${currentPage})`;
      const commitHash = await this.gitCommit(filesModified, commitMessage);

      // Build frontend if frontend files changed
      const hasFrontendChanges = filesModified.some(f => f.includes('frontend'));
      if (hasFrontendChanges) {
        await this.buildFrontend();
      }

      // Restart backend if backend files changed
      const hasBackendChanges = filesModified.some(f => f.includes('backend'));
      if (hasBackendChanges) {
        await this.restartBackend();
      }

      return {
        success: true,
        message: `Successfully applied ${changes.length} code change(s)`,
        filesModified,
        commitHash
      };
    } catch (error) {
      // Rollback changes
      await this.rollback();
      throw new Error(`Failed to apply changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create backup of current state
   */
  private async createBackup(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupBranch = `ai-backup-${timestamp}`;

    await execAsync(`cd ${this.basePath} && git branch ${backupBranch}`, {
      cwd: this.basePath
    });
  }

  /**
   * Commit changes to git
   */
  private async gitCommit(files: string[], message: string): Promise<string> {
    try {
      // Stage files
      for (const file of files) {
        await execAsync(`cd ${this.basePath} && git add ${file}`, {
          cwd: this.basePath
        });
      }

      // Commit
      await execAsync(`cd ${this.basePath} && git commit -m "${message}\n\n🤖 Generated with AI Code Assistant\nCo-Authored-By: Claude <noreply@anthropic.com>"`, {
        cwd: this.basePath
      });

      // Get commit hash
      const { stdout } = await execAsync(`cd ${this.basePath} && git rev-parse --short HEAD`, {
        cwd: this.basePath
      });

      return stdout.trim();
    } catch (error) {
      console.error('Git commit error:', error);
      throw error;
    }
  }

  /**
   * Build frontend
   */
  private async buildFrontend(): Promise<void> {
    try {
      await execAsync('cd frontend && npm run build', {
        cwd: this.basePath,
        timeout: 120000 // 2 minutes timeout
      });
    } catch (error) {
      console.error('Frontend build error:', error);
      // Don't throw, just log - changes are committed
    }
  }

  /**
   * Restart backend
   */
  private async restartBackend(): Promise<void> {
    try {
      await execAsync('cd backend && npm run build', {
        cwd: this.basePath,
        timeout: 60000
      });
    } catch (error) {
      console.error('Backend build error:', error);
      // Don't throw, just log
    }
  }

  /**
   * Rollback to previous state
   */
  private async rollback(): Promise<void> {
    try {
      await execAsync(`cd ${this.basePath} && git reset --hard HEAD~1`, {
        cwd: this.basePath
      });
    } catch (error) {
      console.error('Rollback error:', error);
    }
  }

  /**
   * Read file content
   */
  async readFile(filePath: string): Promise<string> {
    const fullPath = path.join(this.basePath, filePath);
    return await fs.readFile(fullPath, 'utf-8');
  }

  /**
   * List files in directory
   */
  async listFiles(dirPath: string): Promise<string[]> {
    const fullPath = path.join(this.basePath, dirPath);
    const entries = await fs.readdir(fullPath, { withFileTypes: true });
    return entries
      .filter(entry => entry.isFile())
      .map(entry => entry.name);
  }
}

export default new AICodeOrchestrator();
