/**
 * Centralized AI Configuration
 * All AI-related settings in one place for easy management
 */

// Validate required AI configuration
if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

export const AI_CONFIG = {
  // API Configuration
  apiKey: process.env.ANTHROPIC_API_KEY,

  // Model Selection (centralized)
  model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-5-20250929',

  // Token Limits by Operation Type
  maxTokens: {
    basic: Number.parseInt(process.env.AI_MAX_TOKENS_BASIC || '512'),
    subject: Number.parseInt(process.env.AI_MAX_TOKENS_SUBJECT || '1024'),
    content: Number.parseInt(process.env.AI_MAX_TOKENS_CONTENT || '3072'),
    campaign: Number.parseInt(process.env.AI_MAX_TOKENS_CAMPAIGN || '4096'),
    enrichment: Number.parseInt(process.env.AI_MAX_TOKENS_ENRICHMENT || '1024'),
  },

  // Temperature and other parameters
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  topP: parseFloat(process.env.AI_TOP_P || '0.9'),

  // Rate Limiting
  rateLimitMs: Number.parseInt(process.env.AI_RATE_LIMIT_MS || '1000'),
};

/**
 * Get default message config for Anthropic API
 */
export function getAIMessageConfig(tokenType: keyof typeof AI_CONFIG.maxTokens = 'basic') {
  return {
    model: AI_CONFIG.model,
    max_tokens: AI_CONFIG.maxTokens[tokenType],
  };
}

/**
 * Get Bedrock model configuration
 */
export const BEDROCK_CONFIG = {
  modelId: process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0',
  maxTokens: Number.parseInt(process.env.BEDROCK_MAX_TOKENS || '4096'),
  temperature: parseFloat(process.env.BEDROCK_TEMPERATURE || '0.7'),
  topP: parseFloat(process.env.BEDROCK_TOP_P || '0.9'),
};
