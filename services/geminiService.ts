import { GoogleGenAI, Type } from "@google/genai";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = 'gemini-2.5-flash';

const PARSE_TRANSACTION_SYSTEM_INSTRUCTION = `
You are a financial data parser for the Nivest app.
Your goal is to extract financial transaction details or goal details from natural language input.
The user might speak in English, Hinglish, or Hindi.

Output JSON strictly adhering to the schema.
If the input is about spending money, type is 'expense'.
If the input is about receiving money, type is 'income'.
If the input is about saving for something, type is 'goal'.
`;

export const parseFinancialCommand = async (command: string) => {
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: command,
            config: {
                systemInstruction: PARSE_TRANSACTION_SYSTEM_INSTRUCTION,
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        intent: { type: Type.STRING, enum: ['transaction', 'goal', 'unknown'] },
                        type: { type: Type.STRING, enum: ['income', 'expense', 'goal'] },
                        amount: { type: Type.NUMBER },
                        category: { type: Type.STRING },
                        description: { type: Type.STRING },
                        targetAmount: { type: Type.NUMBER, description: "Only for goals" }
                    },
                    required: ['intent', 'type']
                }
            }
        });

        const text = response.text;
        if (!text) return null;
        return JSON.parse(text);

    } catch (error) {
        console.error("Gemini parsing error:", error);
        return null;
    }
};

export const getFinancialAdvice = async (context: any) => {
    try {
        const response = await ai.models.generateContent({
            model: MODEL_NAME,
            contents: `Here is the user's current financial snapshot: ${JSON.stringify(context)}. Give a 1 sentence tip.`,
        });
        return response.text;
    } catch (error) {
        return "Keep tracking your expenses to stay on top of your goals!";
    }
}