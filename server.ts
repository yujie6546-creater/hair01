import dotenv from "dotenv";
import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

let aiClient: GoogleGenAI | null = null;

const PRESET_URLS: Record<string, string> = {
  oval: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80",
  square: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80",
  round: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80",
};

function getAiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      throw new Error("GEMINI_API_KEY_MISSING");
    }

    aiClient = new GoogleGenAI({ apiKey });
  }

  return aiClient;
}

function preferenceLabel(value: string, labels: Record<string, string>) {
  return labels[value] || labels.all;
}

async function imageToInlineData(image?: string, preset?: string) {
  if (preset && PRESET_URLS[preset]) {
    const response = await fetch(PRESET_URLS[preset]);

    if (!response.ok) {
      throw new Error(`Preset image download failed, HTTP ${response.status}`);
    }

    const buffer = await response.arrayBuffer();

    return {
      inlineData: {
        mimeType: response.headers.get("content-type") || "image/jpeg",
        data: Buffer.from(buffer).toString("base64"),
      },
    };
  }

  if (!image) {
    throw new Error("Please provide an uploaded image or a preset model.");
  }

  const match = image.match(/^data:([^;]+);base64,(.*)$/);

  return {
    inlineData: {
      mimeType: match?.[1] || "image/jpeg",
      data: match?.[2] || image,
    },
  };
}

app.post("/api/recommend", async (req, res) => {
  try {
    const {
      image,
      preset,
      gender = "all",
      lengthPreference = "all",
      vibePreference = "all",
    } = req.body;

    if (!image && !preset) {
      return res.status(400).json({
        error: "IMAGE_REQUIRED",
        message: "Upload a portrait photo or choose a sample model first.",
      });
    }

    let ai: GoogleGenAI;

    try {
      ai = getAiClient();
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "GEMINI_API_KEY_MISSING") {
        return res.status(401).json({
          error: "API_KEY_REQUIRED",
          message: "Missing GEMINI_API_KEY. Set it in .env.local or in your deployment secrets.",
        });
      }

      throw error;
    }

    const imagePart = await imageToInlineData(image, preset);
    const genderText = preferenceLabel(gender, {
      all: "any gender direction",
      female: "feminine hairstyle direction",
      male: "masculine hairstyle direction",
    });
    const lengthText = preferenceLabel(lengthPreference, {
      all: "any length",
      short: "short hair",
      medium: "medium hair",
      long: "long hair",
    });
    const vibeText = preferenceLabel(vibePreference, {
      all: "any vibe",
      elegant: "elegant and refined",
      casual: "natural and casual",
      trendy: "trendy and expressive",
      professional: "professional and polished",
      cute: "cute and soft",
    });

    const promptText = `
You are a professional hair styling consultant.
Analyze the face shape, facial proportions, skin tone, and overall impression in the user's portrait.

User preferences:
- Gender direction: ${genderText}
- Hair length: ${lengthText}
- Style vibe: ${vibeText}

Return 6 to 9 practical hairstyle recommendations. The generated text should be Traditional Chinese, but the JSON keys must exactly match the response schema.
Each recommendation should be specific enough for a salon stylist to understand the cut, layering, bangs, texture, color, and styling direction.
Return only valid JSON. Do not include markdown.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [imagePart, { text: promptText }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            faceAnalysis: {
              type: Type.OBJECT,
              properties: {
                faceShape: {
                  type: Type.STRING,
                  description: "Face shape classification.",
                },
                faceCharacteristics: {
                  type: Type.STRING,
                  description: "Summary of facial proportions and key traits.",
                },
                skinToneClassification: {
                  type: Type.STRING,
                  description: "Skin tone and suitable hair color direction.",
                },
                overallAdvice: {
                  type: Type.STRING,
                  description: "Overall styling strategy and avoid-list.",
                },
              },
              required: ["faceShape", "faceCharacteristics", "skinToneClassification", "overallAdvice"],
            },
            recommendations: {
              type: Type.ARRAY,
              description: "List of hairstyle recommendations.",
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.INTEGER },
                  name: { type: Type.STRING, description: "Hairstyle name in Traditional Chinese." },
                  englishName: { type: Type.STRING, description: "English hairstyle name." },
                  length: {
                    type: Type.STRING,
                    description: "Use exactly one of: short, medium, long.",
                  },
                  vibe: { type: Type.STRING, description: "Style vibe." },
                  faceShapeMatchReason: {
                    type: Type.STRING,
                    description: "Why this hairstyle fits the detected face shape.",
                  },
                  description: { type: Type.STRING, description: "Visual effect and haircut features." },
                  stylingTips: { type: Type.STRING, description: "Styling method, tools, and product tips." },
                  colorRecommendation: {
                    type: Type.OBJECT,
                    properties: {
                      colorName: { type: Type.STRING },
                      colorHex: {
                        type: Type.STRING,
                        description: "Suggested color HEX value, such as #4A3C31.",
                      },
                      reason: { type: Type.STRING },
                    },
                    required: ["colorName", "colorHex", "reason"],
                  },
                  designerDirections: {
                    type: Type.STRING,
                    description: "Salon-ready instructions for cut, layers, bangs, texture, and color.",
                  },
                },
                required: [
                  "id",
                  "name",
                  "englishName",
                  "length",
                  "vibe",
                  "faceShapeMatchReason",
                  "description",
                  "stylingTips",
                  "colorRecommendation",
                  "designerDirections",
                ],
              },
            },
          },
          required: ["faceAnalysis", "recommendations"],
        },
      },
    });

    const text = response.text;

    if (!text) {
      throw new Error("Gemini returned an empty response. Please try again.");
    }

    return res.status(200).json(JSON.parse(text));
  } catch (error: unknown) {
    console.error("recommend endpoint error:", error);
    return res.status(500).json({
      error: "ENDPOINT_ERROR",
      message: error instanceof Error ? error.message : "Unknown analysis error.",
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });

    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Hairstyle Assistant Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
