import { GoogleGenAI, Type } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || 'dummy' });

const systemTools = [
  {
    name: "getSystemStats",
    description: "Gets the total number of users, active projects, and ISO documents in the system.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    }
  },
  {
    name: "getProjects",
    description: "Returns a list of all active projects.",
    parameters: {
      type: Type.OBJECT,
      properties: {},
    }
  }
];

async function run() {
  try {
    const contents: any[] = [{ role: 'user', parts: [{ text: 'Hello' }] }];
    let response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: "You are an AI.",
        tools: [{ functionDeclarations: systemTools }],
        temperature: 0.7,
      }
    });
    console.log("Success:", response.text);
  } catch (e: any) {
    console.error("Gemini Error:", e.message);
  }
}

run();
