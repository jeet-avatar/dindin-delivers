import axios from 'axios';
import fs from 'fs';
import path from 'path';

const VOICE_ID = process.env.ELEVENLABS_VOICE_ID || 'cgSgspJ2msm6clMCkdW9'; // Jessica
const API_KEY = process.env.ELEVENLABS_API_KEY!;

export async function generateVoiceover(text: string, outputDir: string): Promise<string> {
  const outPath = path.join(outputDir, `voiceover-${Date.now()}.mp3`);
  const response = await axios.post(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`,
    {
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.3 },
    },
    {
      headers: { 'xi-api-key': API_KEY, 'Content-Type': 'application/json' },
      responseType: 'arraybuffer',
    }
  );
  fs.writeFileSync(outPath, Buffer.from(response.data as ArrayBuffer));
  return outPath;
}
