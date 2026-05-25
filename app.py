import base64
import json
import os
from pathlib import Path

import requests
from dotenv import load_dotenv
from flask import Flask, jsonify, request, send_from_directory
from google import genai
from google.genai import types

load_dotenv()

ROOT = Path(__file__).resolve().parent
STATIC_DIR = ROOT / "python_app"
PORT = int(os.getenv("PORT", "3000"))

app = Flask(__name__, static_folder=str(STATIC_DIR), static_url_path="")

PRESET_URLS = {
    "oval": "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=500&q=80",
    "square": "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=500&q=80",
    "round": "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=500&q=80",
}

RESPONSE_SCHEMA = {
    "type": "object",
    "properties": {
        "faceAnalysis": {
            "type": "object",
            "properties": {
                "faceShape": {"type": "string"},
                "faceCharacteristics": {"type": "string"},
                "skinToneClassification": {"type": "string"},
                "overallAdvice": {"type": "string"},
            },
            "required": [
                "faceShape",
                "faceCharacteristics",
                "skinToneClassification",
                "overallAdvice",
            ],
        },
        "recommendations": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "id": {"type": "integer"},
                    "name": {"type": "string"},
                    "englishName": {"type": "string"},
                    "length": {"type": "string"},
                    "vibe": {"type": "string"},
                    "faceShapeMatchReason": {"type": "string"},
                    "description": {"type": "string"},
                    "stylingTips": {"type": "string"},
                    "colorRecommendation": {
                        "type": "object",
                        "properties": {
                            "colorName": {"type": "string"},
                            "colorHex": {"type": "string"},
                            "reason": {"type": "string"},
                        },
                        "required": ["colorName", "colorHex", "reason"],
                    },
                    "designerDirections": {"type": "string"},
                },
                "required": [
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
    "required": ["faceAnalysis", "recommendations"],
}


def get_client():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError(
            "Missing GEMINI_API_KEY. Create .env from .env.example and set your key."
        )
    return genai.Client(api_key=api_key)


def preference_label(value, labels):
    return labels.get(value, labels["all"])


def get_image_bytes(image=None, preset=None):
    if preset in PRESET_URLS:
        response = requests.get(PRESET_URLS[preset], timeout=20)
        response.raise_for_status()
        return response.content, response.headers.get("content-type", "image/jpeg")

    if not image:
        raise ValueError("Upload a portrait photo or choose a sample model first.")

    if image.startswith("data:"):
        header, encoded = image.split(",", 1)
        mime_type = header.split(";")[0].replace("data:", "") or "image/jpeg"
        return base64.b64decode(encoded), mime_type

    return base64.b64decode(image), "image/jpeg"


@app.get("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")


@app.post("/api/recommend")
def recommend():
    try:
        payload = request.get_json(force=True) or {}
        image = payload.get("image")
        preset = payload.get("preset")

        image_bytes, mime_type = get_image_bytes(image=image, preset=preset)

        gender_text = preference_label(
            payload.get("gender", "all"),
            {
                "all": "any gender direction",
                "female": "feminine hairstyle direction",
                "male": "masculine hairstyle direction",
            },
        )
        length_text = preference_label(
            payload.get("lengthPreference", "all"),
            {
                "all": "any length",
                "short": "short hair",
                "medium": "medium hair",
                "long": "long hair",
            },
        )
        vibe_text = preference_label(
            payload.get("vibePreference", "all"),
            {
                "all": "any vibe",
                "elegant": "elegant and refined",
                "casual": "natural and casual",
                "trendy": "trendy and expressive",
                "professional": "professional and polished",
                "cute": "cute and soft",
            },
        )

        prompt = f"""
You are a professional hair styling consultant.
Analyze the face shape, facial proportions, skin tone, and overall impression in the user's portrait.

User preferences:
- Gender direction: {gender_text}
- Hair length: {length_text}
- Style vibe: {vibe_text}

Return 6 to 9 practical hairstyle recommendations. The generated text should be Traditional Chinese, but the JSON keys must exactly match the response schema.
Each recommendation should be specific enough for a salon stylist to understand the cut, layering, bangs, texture, color, and styling direction.
Return only valid JSON. Do not include markdown.
"""

        client = get_client()
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt,
            ],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RESPONSE_SCHEMA,
            ),
        )

        if not response.text:
            raise RuntimeError("Gemini returned an empty response. Please try again.")

        return jsonify(json.loads(response.text))
    except RuntimeError as error:
        return jsonify({"error": "CONFIG_ERROR", "message": str(error)}), 401
    except ValueError as error:
        return jsonify({"error": "BAD_REQUEST", "message": str(error)}), 400
    except Exception as error:
        app.logger.exception("recommend endpoint error")
        return jsonify({"error": "ENDPOINT_ERROR", "message": str(error)}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT, debug=os.getenv("FLASK_DEBUG") == "1")
