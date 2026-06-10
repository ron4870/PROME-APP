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
  const history = [
    { role: 'user', parts: [{ text: 'Hello' }] },
    { role: 'model', parts: [{ text: 'Hi, how can I help?' }] }
  ];
  
  const userParts: any[] = [{ text: 'What are the system stats?' }];
  const contents = [...history, { role: 'user', parts: userParts }];
  
  const systemInstruction = {
    role: "system",
    parts: [{ text: "You are the PROME App AI Assistant. You help Administrators and Managing Directors manage their company. You are professional, concise, and helpful. You have access to system tools to look up data." }]
  };

  try {
    let response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: systemInstruction.parts[0].text,
        tools: [{ functionDeclarations: systemTools }],
        temperature: 0.7,
      }
    });

    console.log("Response:", response.text);
    console.log("Function Calls:", response.functionCalls);
  } catch (e) {
    console.error("Error:", e);
  }
}

run();
