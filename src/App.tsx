import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  Check,
  Copy,
  Heart,
  Loader2,
  RotateCcw,
  Scissors,
  Sparkles,
  Upload,
  UserRound,
  WandSparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import {
  GenderType,
  HairstyleRecommendation,
  LengthPreferenceType,
  RecommendationResult,
  VibePreferenceType,
} from "./types";

const PRESETS = [
  {
    id: "oval",
    title: "Soft oval face",
    gender: "female",
    imageUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "square",
    title: "Defined square face",
    gender: "male",
    imageUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80",
  },
  {
    id: "round",
    title: "Soft round face",
    gender: "female",
    imageUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80",
  },
];

const LENGTH_OPTIONS: Array<{ value: LengthPreferenceType; label: string }> = [
  { value: "all", label: "Any" },
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

const VIBE_OPTIONS: Array<{ value: VibePreferenceType; label: string }> = [
  { value: "all", label: "Any" },
  { value: "elegant", label: "Elegant" },
  { value: "casual", label: "Casual" },
  { value: "trendy", label: "Trendy" },
  { value: "professional", label: "Professional" },
  { value: "cute", label: "Cute" },
];

const GENDER_OPTIONS: Array<{ value: GenderType; label: string }> = [
  { value: "all", label: "Any" },
  { value: "female", label: "Feminine" },
  { value: "male", label: "Masculine" },
];

export default function App() {
  const [selectedGender, setSelectedGender] = useState<GenderType>("all");
  const [selectedLength, setSelectedLength] = useState<LengthPreferenceType>("all");
  const [selectedVibe, setSelectedVibe] = useState<VibePreferenceType>("all");
  const [presetModel, setPresetModel] = useState<string | null>(null);
  const [uploadedBase64, setUploadedBase64] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [results, setResults] = useState<RecommendationResult | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("holohair_favorites") || "[]");
    } catch {
      return [];
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem("holohair_favorites", JSON.stringify(favorites));
  }, [favorites]);

  const activePhoto = uploadedBase64 || PRESETS.find((p) => p.id === presetModel)?.imageUrl || "";

  const processFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setErrorMessage("Please upload an image file such as JPG, PNG, or WebP.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedBase64(reader.result as string);
      setPresetModel(null);
      setErrorMessage(null);
      setResults(null);
    };
    reader.readAsDataURL(file);
  };

  const handleStartAnalysis = async () => {
    if (!uploadedBase64 && !presetModel) {
      setErrorMessage("Upload a portrait photo or choose a sample model first.");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setResults(null);

    try {
      const response = await fetch("/api/recommend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: uploadedBase64,
          preset: presetModel,
          gender: selectedGender,
          lengthPreference: selectedLength,
          vibePreference: selectedVibe,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Analysis failed. Please try again.");
      }

      setResults(data);
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : "Analysis failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearSelectedImage = () => {
    setUploadedBase64(null);
    setPresetModel(null);
    setResults(null);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const toggleFavorite = (id: number) => {
    setFavorites((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const copyDirections = async (style: HairstyleRecommendation) => {
    await navigator.clipboard.writeText(style.designerDirections);
    setCopiedId(style.id);
    window.setTimeout(() => setCopiedId(null), 1600);
  };

  return (
    <div className="min-h-screen bg-stone-50 text-slate-900">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-slate-950 p-2.5 text-white shadow-sm">
              <Scissors className="h-6 w-6 rotate-45" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">HoloHair AI</h1>
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-stone-500">
                Hair styling consultant
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">
            <Sparkles className="h-4 w-4" />
            Face analysis, hairstyle ideas, and color guidance
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <section className="mb-8 max-w-3xl">
          <h2 className="font-serif text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Upload a portrait and get salon-ready hairstyle guidance
          </h2>
          <p className="mt-3 text-sm leading-6 text-stone-600">
            The assistant reviews face shape, proportions, skin tone, and your preferences to generate practical
            recommendations for your next haircut.
          </p>
        </section>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_380px]">
          <section className="space-y-6">
            <div
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                const file = event.dataTransfer.files?.[0];
                if (file) processFile(file);
              }}
              className={`flex min-h-[420px] flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition ${
                isDragging ? "border-amber-500 bg-amber-50" : "border-stone-300 bg-white"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) processFile(file);
                }}
              />

              {activePhoto ? (
                <div className="w-full max-w-sm text-center">
                  <div className="mx-auto aspect-square w-64 overflow-hidden rounded-full border-4 border-white bg-stone-100 shadow-xl">
                    <img src={activePhoto} alt="Selected portrait" className="h-full w-full object-cover" />
                  </div>
                  <div className="mt-5 flex justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                    >
                      <Camera className="h-4 w-4" />
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={clearSelectedImage}
                      className="inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center text-center"
                >
                  <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-100 text-stone-500">
                    <Upload className="h-8 w-8" />
                  </span>
                  <span className="text-base font-semibold text-slate-900">Drop a photo here or click to upload</span>
                  <span className="mt-2 text-sm text-stone-500">Use a clear, front-facing portrait for best results.</span>
                </button>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setPresetModel(preset.id);
                    setUploadedBase64(null);
                    setResults(null);
                    setErrorMessage(null);
                  }}
                  className={`flex items-center gap-3 rounded-lg border bg-white p-3 text-left transition hover:border-amber-400 ${
                    presetModel === preset.id ? "border-amber-500 ring-2 ring-amber-100" : "border-stone-200"
                  }`}
                >
                  <img src={preset.imageUrl} alt={preset.title} className="h-14 w-14 rounded-md object-cover" />
                  <div>
                    <div className="text-sm font-bold text-slate-900">{preset.title}</div>
                    <div className="text-xs text-stone-500">
                      {preset.gender === "male" ? "Masculine sample" : "Feminine sample"}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>

          <aside className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
            <div className="mb-5 flex items-center gap-2">
              <UserRound className="h-5 w-5 text-amber-700" />
              <h3 className="text-base font-bold">Preferences</h3>
            </div>

            <PreferenceGroup label="Gender direction">
              {GENDER_OPTIONS.map((option) => (
                <SegmentButton
                  key={option.value}
                  active={selectedGender === option.value}
                  onClick={() => setSelectedGender(option.value)}
                >
                  {option.label}
                </SegmentButton>
              ))}
            </PreferenceGroup>

            <PreferenceGroup label="Length">
              {LENGTH_OPTIONS.map((option) => (
                <SegmentButton
                  key={option.value}
                  active={selectedLength === option.value}
                  onClick={() => setSelectedLength(option.value)}
                >
                  {option.label}
                </SegmentButton>
              ))}
            </PreferenceGroup>

            <PreferenceGroup label="Vibe">
              {VIBE_OPTIONS.map((option) => (
                <SegmentButton
                  key={option.value}
                  active={selectedVibe === option.value}
                  onClick={() => setSelectedVibe(option.value)}
                >
                  {option.label}
                </SegmentButton>
              ))}
            </PreferenceGroup>

            {errorMessage && (
              <div className="mb-4 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isLoading}
              onClick={handleStartAnalysis}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-amber-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
              {isLoading ? "Analyzing..." : "Start AI analysis"}
            </button>
          </aside>
        </div>

        <AnimatePresence>
          {results && (
            <motion.section
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="mt-10 space-y-6"
            >
              <div className="rounded-lg border border-stone-200 bg-white p-6 shadow-sm">
                <div className="mb-3 flex items-center gap-2 text-sm font-bold text-amber-700">
                  <Sparkles className="h-4 w-4" />
                  Face analysis
                </div>
                <div className="grid gap-4 md:grid-cols-4">
                  <InfoBlock title="Face shape" value={results.faceAnalysis.faceShape} />
                  <InfoBlock title="Features" value={results.faceAnalysis.faceCharacteristics} />
                  <InfoBlock title="Skin tone" value={results.faceAnalysis.skinToneClassification} />
                  <InfoBlock title="Advice" value={results.faceAnalysis.overallAdvice} />
                </div>
              </div>

              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {results.recommendations.map((style) => (
                  <article key={style.id} className="rounded-lg border border-stone-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-bold">{style.name}</h3>
                        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                          {style.englishName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleFavorite(style.id)}
                        className={`rounded-md border p-2 transition ${
                          favorites.includes(style.id)
                            ? "border-red-200 bg-red-50 text-red-600"
                            : "border-stone-200 text-stone-500 hover:bg-stone-100"
                        }`}
                        aria-label="Toggle favorite"
                      >
                        <Heart className="h-4 w-4" fill={favorites.includes(style.id) ? "currentColor" : "none"} />
                      </button>
                    </div>

                    <div className="my-4 flex items-center gap-3">
                      {renderStyleSilhouette(style, style.colorRecommendation.colorHex)}
                      <div>
                        <div className="text-sm font-bold">{style.vibe}</div>
                        <div className="text-xs text-stone-500">{lengthLabel(style.length)}</div>
                      </div>
                    </div>

                    <p className="text-sm leading-6 text-stone-600">{style.description}</p>
                    <p className="mt-3 rounded-md bg-amber-50 p-3 text-sm leading-6 text-amber-950">
                      {style.faceShapeMatchReason}
                    </p>

                    <div className="mt-4 flex items-center gap-3 rounded-md border border-stone-200 p-3">
                      <span
                        className="h-9 w-9 rounded-full border border-stone-300"
                        style={{ backgroundColor: style.colorRecommendation.colorHex }}
                      />
                      <div>
                        <div className="text-sm font-bold">{style.colorRecommendation.colorName}</div>
                        <div className="text-xs text-stone-500">{style.colorRecommendation.reason}</div>
                      </div>
                    </div>

                    <div className="mt-4 rounded-md bg-slate-950 p-3 text-xs leading-5 text-slate-100">
                      {style.designerDirections}
                    </div>

                    <button
                      type="button"
                      onClick={() => copyDirections(style)}
                      className="mt-3 inline-flex items-center gap-2 rounded-md border border-stone-300 bg-white px-3 py-2 text-xs font-bold text-stone-700 transition hover:bg-stone-100"
                    >
                      {copiedId === style.id ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copiedId === style.id ? "Copied" : "Copy for stylist"}
                    </button>
                  </article>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

function PreferenceGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-stone-500">{label}</div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function SegmentButton({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-md border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-stone-200 bg-white text-stone-700 hover:bg-stone-100"
      }`}
    >
      {children}
    </button>
  );
}

function InfoBlock({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md bg-stone-50 p-4">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-stone-500">{title}</div>
      <p className="text-sm leading-6 text-stone-700">{value}</p>
    </div>
  );
}

function lengthLabel(length: HairstyleRecommendation["length"]) {
  if (length === "short") return "Short hair";
  if (length === "medium") return "Medium hair";
  return "Long hair";
}

function renderStyleSilhouette(hair: HairstyleRecommendation, color: string) {
  const hairLen = hair.length || "medium";

  return (
    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-amber-200 bg-stone-50">
      <svg viewBox="0 0 200 200" className="h-full w-full p-2" aria-hidden="true">
        <circle cx="100" cy="112" r="44" fill="#f4dfc8" />
        {hairLen === "short" ? (
          <path
            d="M48 82c4-40 98-48 108 0 9 1 8 30-1 36-8-24-100-27-110 0-11-9-8-34 3-36Z"
            fill={color}
          />
        ) : hairLen === "medium" ? (
          <path
            d="M48 78c4-44 101-50 108 0 22 29 12 80-5 102-10-45-93-45-103 0-18-25-25-75 0-102Z"
            fill={color}
          />
        ) : (
          <path
            d="M48 76c3-47 103-54 108 0 26 37 19 93 5 121-20-46-102-46-122 0-14-34-18-87 9-121Z"
            fill={color}
          />
        )}
        <path d="M76 118c13 13 35 13 48 0" fill="none" stroke="#7c5c4a" strokeLinecap="round" strokeWidth="5" />
      </svg>
    </div>
  );
}
