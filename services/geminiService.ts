import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisResult, MindMapNode, Language } from "../types";

// Helper to convert File to Base64
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove the Data URL prefix (e.g., "data:video/mp4;base64,")
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

const mindMapSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    name: { type: Type.STRING, description: "The central topic of the video" },
    children: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: "Main category or section" },
          children: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING, description: "Specific detail or sub-point" },
                children: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING, description: "Leaf node detail" }
                        }
                    }
                }
              },
            },
          },
        },
        required: ["name"],
      },
    },
  },
  required: ["name", "children"],
};

const analysisResponseSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: {
      type: Type.STRING,
      description: "A comprehensive markdown summary of the video content, organized with headers.",
    },
    keyPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "A list of the top 5-10 critical takeaways.",
    },
    mindmap: mindMapSchema,
  },
  required: ["summary", "keyPoints", "mindmap"],
};

export const analyzeVideo = async (input: File | string, language: Language = 'zh'): Promise<AnalysisResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing.");
  }

  const ai = new GoogleGenAI({ apiKey });
  const isUrl = typeof input === 'string';

  const langInstruction = language === 'zh' 
    ? "OUTPUT LANGUAGE: SIMPLIFIED CHINESE (简体中文). All content, including summaries, key points, and mind map nodes MUST be in Chinese." 
    : "OUTPUT LANGUAGE: ENGLISH. All content must be in English.";

  try {
    let response;

    if (!isUrl) {
      // --- FILE MODE (Video Frame Analysis) ---
      const videoPart = await fileToGenerativePart(input as File);
      
      const prompt = `
        You are an expert knowledge extractor. 
        Analyze this video carefully. 
        1. Summarize the content into a clear, educational guide using Markdown.
        2. Extract the most important key points.
        3. Construct a hierarchical mind map structure that logically organizes the information presented.
        
        The video might be from social media (TikTok, Douyin, etc.), so it might be fast-paced. 
        Focus on the educational value and facts.

        ${langInstruction}
      `;

      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [videoPart, { text: prompt }],
        },
        config: {
          responseMimeType: "application/json",
          responseSchema: analysisResponseSchema,
          temperature: 0.3, 
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");
      
      const result = JSON.parse(text) as AnalysisResult;
      return { ...result, language, source: { type: 'file', value: (input as File).name } };

    } else {
      // --- URL MODE (Search Grounding) ---
      const url = input as string;
      const prompt = `
        I have a video URL: ${url}
        
        Please act as a researcher. 
        1. Search for this specific video or the topic it likely covers based on the URL structure or metadata you can find via search.
        2. If you find the specific video content, analyze it. If not, analyze the general topic associated with keywords found in the URL.
        3. Generate a JSON object with:
           - "summary": A markdown summary.
           - "keyPoints": Array of strings.
           - "mindmap": A hierarchical object with "name" and "children" arrays.

        IMPORTANT: Output ONLY valid JSON. Do not use Markdown code blocks.
        ${langInstruction}
        
        Structure:
        {
          "summary": "...",
          "keyPoints": ["..."],
          "mindmap": { "name": "Topic", "children": [...] }
        }
      `;

      response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [{ text: prompt }],
        },
        config: {
          // tools: [{ googleSearch: {} }], // Enable search to understand the URL context
          // Note: For strict JSON output without schema, it's often safer to NOT use search if we strictly need JSON, 
          // but the user wants to identify URL content. 
          // Let's try to interpret the URL directly or use search.
          tools: [{ googleSearch: {} }],
        },
      });

      const text = response.text;
      if (!text) throw new Error("No response from AI");

      // Clean up potential markdown code blocks from the response
      const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
      
      let result: AnalysisResult;
      try {
        result = JSON.parse(cleanedText) as AnalysisResult;
      } catch (e) {
        console.error("JSON Parse Error on URL result:", text);
        throw new Error("Failed to parse AI response for this URL.");
      }

      return { ...result, language, source: { type: 'url', value: url } };
    }

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
};