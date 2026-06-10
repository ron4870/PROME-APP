import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

const systemTools = [
  {
    name: "getSystemStats",
    description: "Gets the total number of users, active projects, and ISO documents in the system.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    }
  }
];

async function run() {
  const contents = [{ role: 'user', parts: [{ text: 'What are the system stats?' }] }];
  try {
    let response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        tools: [{ functionDeclarations: systemTools }],
        temperature: 0.7,
      }
    });
    console.log("Response:", response.functionCalls);
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
