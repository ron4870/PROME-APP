import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

async function run() {
  const base64Data = Buffer.from('test').toString('base64');
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          inlineData: {
            data: base64Data,
            mimeType: 'image/jpeg'
          }
        },
        "Extract civil engineering bid opportunity details from this newspaper clipping. Return your response in pure JSON format exactly like this, without markdown formatting or code blocks: { \"title\": \"...\", \"client\": \"...\", \"country\": \"...\", \"type\": \"...\", \"description\": \"...\", \"deadline\": \"YYYY-MM-DD or null\" }"
      ],
      config: { temperature: 0.1 }
    });
    console.log("Response:", response.text);
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
