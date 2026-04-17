import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export interface TranscriptMessage {
  speaker: string;
  text: string;
  timestamp: string;
}

export async function summarizeMeeting(transcript: TranscriptMessage[]): Promise<string> {
  if (transcript.length === 0) return '';

  const transcriptText = transcript
    .map(m => `[${m.speaker}] ${m.text}`)
    .join('\n');

  const message = await client.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `You are a CRM assistant. Summarize this business meeting transcript into a concise CRM note. Include: key topics discussed, action items, next steps, and any decisions made. Be specific and professional.\n\nTranscript:\n${transcriptText}`,
    }],
  });

  const content = message.content[0];
  return content.type === 'text' ? content.text : '';
}
