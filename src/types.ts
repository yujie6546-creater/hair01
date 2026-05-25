export interface FaceAnalysis {
  faceShape: string;
  faceCharacteristics: string;
  skinToneClassification: string;
  overallAdvice: string;
}

export interface ColorRecommendation {
  colorName: string;
  colorHex: string;
  reason: string;
}

export interface HairstyleRecommendation {
  id: number;
  name: string;
  englishName: string;
  length: "short" | "medium" | "long";
  vibe: string;
  faceShapeMatchReason: string;
  description: string;
  stylingTips: string;
  colorRecommendation: ColorRecommendation;
  designerDirections: string;
}

export interface RecommendationResult {
  faceAnalysis: FaceAnalysis;
  recommendations: HairstyleRecommendation[];
}

export type GenderType = "female" | "male" | "all";
export type LengthPreferenceType = "all" | "short" | "medium" | "long";
export type VibePreferenceType = "all" | "elegant" | "casual" | "trendy" | "professional" | "cute";
