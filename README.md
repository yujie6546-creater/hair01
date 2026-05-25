# HoloHair AI

AI hairstyle recommendation app powered by Gemini.

The repository includes two ways to run the app:

- React + Vite + Express, for the full TypeScript app.
- Python + Flask, for a lightweight runner that can be started with Python.

## Requirements

- Gemini API key
- Node.js 20 or newer, for the React/Express version
- Python 3.10 or newer, for the Python version

## Environment

Create a local environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Then set:

```bash
GEMINI_API_KEY="your-gemini-api-key"
PORT=3000
```

Do not commit `.env`.

## Run With Node

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

Useful commands:

```bash
npm run typecheck
npm run build
npm start
```

## Run With Python

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Open:

```text
http://localhost:3000
```

On macOS or Linux, activate the virtual environment with:

```bash
source .venv/bin/activate
```

## GitHub Notes

This app uses a server-side Gemini API key, so it is not a good fit for plain GitHub Pages. Use GitHub as the source repository, then deploy to a platform that supports server-side environment variables, such as Render, Railway, Fly.io, Google Cloud Run, or Hugging Face Spaces.

Before pushing:

```bash
npm run build
python -m py_compile app.py
```

## Project Structure

```text
src/                  React app source
server.ts             Express API and Vite middleware
app.py                Flask API and Python runner
python_app/index.html Lightweight Python-runner UI
requirements.txt      Python dependencies
```
