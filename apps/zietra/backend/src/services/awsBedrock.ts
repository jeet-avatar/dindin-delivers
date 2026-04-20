import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { fromEnv } from '@aws-sdk/credential-providers';

// Validate required AWS configuration
if (!process.env.AWS_REGION) {
  throw new Error('AWS_REGION environment variable is required');
}

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: fromEnv(),
});

export interface BedrockPrompt {
  prompt: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  modelId?: string;
}

export interface AgentTask {
  type: 'email_generation' | 'content_summarization' | 'lead_scoring' | 'sentiment_analysis' | 'custom';
  input: any;
  context?: any;
}

/**
 * Invoke Claude via AWS Bedrock
 */
export async function invokeClaude(params: BedrockPrompt) {
  const modelId = params.modelId || 'anthropic.claude-3-sonnet-20240229-v1:0';

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: params.maxTokens || 4096,
    temperature: params.temperature || 0.7,
    top_p: params.topP || 0.9,
    messages: [
      {
        role: 'user',
        content: params.prompt,
      },
    ],
  };

  try {
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));

    return {
      content: responseBody.content[0].text,
      stopReason: responseBody.stop_reason,
      usage: responseBody.usage,
    };
  } catch (error: any) {
    console.error('Bedrock Claude Error:', error);
    throw new Error(`Failed to invoke Claude: ${error.message}`);
  }
}

/**
 * Invoke Claude with streaming response
 */
export async function invokeClaudeStream(params: BedrockPrompt, onChunk: (chunk: string) => void) {
  const modelId = params.modelId || 'anthropic.claude-3-sonnet-20240229-v1:0';

  const payload = {
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: params.maxTokens || 4096,
    temperature: params.temperature || 0.7,
    top_p: params.topP || 0.9,
    messages: [
      {
        role: 'user',
        content: params.prompt,
      },
    ],
  };

  try {
    const command = new InvokeModelWithResponseStreamCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(payload),
    });

    const response = await bedrockClient.send(command);

    if (response.body) {
      for await (const event of response.body) {
        if (event.chunk) {
          const chunk = JSON.parse(new TextDecoder().decode(event.chunk.bytes));
          if (chunk.type === 'content_block_delta') {
            onChunk(chunk.delta.text);
          }
        }
      }
    }
  } catch (error: any) {
    console.error('Bedrock Claude Stream Error:', error);
    throw new Error(`Failed to invoke Claude stream: ${error.message}`);
  }
}

/**
 * AI Agent: Email Content Generator
 */
export async function generateEmailContent(subject: string, context: any) {
  const prompt = `You are an expert email marketing copywriter. Generate a professional and engaging email based on the following:

Subject: ${subject}
Context: ${JSON.stringify(context, null, 2)}

Generate:
1. A compelling email body (HTML format)
2. A plain text version
3. Suggested subject line variations (3 options)

Return the response as a JSON object with keys: html, text, subjectVariations`;

  const response = await invokeClaude({ prompt });
  return JSON.parse(response.content);
}

/**
 * AI Agent: Lead Scoring
 */
export async function scoreLead(leadData: any) {
  const prompt = `You are an AI lead scoring expert. Analyze the following lead data and provide a score from 0-100:

Lead Data:
${JSON.stringify(leadData, null, 2)}

Consider:
- Company size and revenue
- Industry relevance
- Engagement history
- Job title/decision-making authority
- Website activity

Return a JSON object with:
- score (0-100)
- reasoning (brief explanation)
- recommendedActions (array of next steps)`;

  const response = await invokeClaude({ prompt });
  return JSON.parse(response.content);
}

/**
 * AI Agent: Content Summarization
 */
export async function summarizeContent(content: string, maxLength: number = 100) {
  const prompt = `Summarize the following content in ${maxLength} words or less:

${content}

Provide a concise, informative summary.`;

  const response = await invokeClaude({ prompt, maxTokens: 500 });
  return response.content;
}

/**
 * AI Agent: Sentiment Analysis
 */
export async function analyzeSentiment(text: string) {
  const prompt = `Analyze the sentiment of the following text:

"${text}"

Return a JSON object with:
- sentiment: "positive", "negative", or "neutral"
- score: -1.0 to 1.0 (negative to positive)
- confidence: 0.0 to 1.0
- keyPhrases: array of important phrases
- emotions: array of detected emotions`;

  const response = await invokeClaude({ prompt, maxTokens: 500 });
  return JSON.parse(response.content);
}

/**
 * AI Agent: Smart Reply Suggestions
 */
export async function generateReplysuggestions(emailContent: string, context: any) {
  const prompt = `Based on the email below, suggest 3 smart reply options:

Email:
${emailContent}

Context: ${JSON.stringify(context, null, 2)}

Return a JSON array of 3 reply suggestions, each with:
- text: the suggested reply
- tone: "professional", "friendly", or "casual"`;

  const response = await invokeClaude({ prompt, maxTokens: 1000 });
  return JSON.parse(response.content);
}

/**
 * AI Agent: Campaign Performance Insights
 */
export async function analyzeCampaignPerformance(campaignData: any) {
  const prompt = `Analyze the following email campaign performance data and provide insights:

Campaign Data:
${JSON.stringify(campaignData, null, 2)}

Provide:
1. Performance summary (2-3 sentences)
2. Key strengths (3 bullet points)
3. Areas for improvement (3 bullet points)
4. Actionable recommendations (3 specific actions)
5. Predicted optimal send time for next campaign

Return as a JSON object with keys: summary, strengths, improvements, recommendations, optimalSendTime`;

  const response = await invokeClaude({ prompt });
  return JSON.parse(response.content);
}

/**
 * Generic AI Agent Task Executor
 */
export async function executeAgentTask(task: AgentTask): Promise<any> {
  switch (task.type) {
    case 'email_generation':
      return generateEmailContent(task.input.subject, task.context);

    case 'content_summarization':
      return summarizeContent(task.input.content, task.input.maxLength);

    case 'lead_scoring':
      return scoreLead(task.input);

    case 'sentiment_analysis':
      return analyzeSentiment(task.input.text);

    case 'custom':
      return invokeClaude({ prompt: task.input.prompt });

    default:
      throw new Error(`Unknown agent task type: ${task.type}`);
  }
}
