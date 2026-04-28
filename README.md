# DecisionAI Engine (Docker-first)

AI-powered Explainable Decision Intelligence System with a real-time conversational AI interface.

## Overview

DecisionAI combines machine learning and LLM-based reasoning to help users make smarter decisions across:

* Career
* Startups
* Finance
* Policy

It provides:

* Predictive scores from ML models
* Explainability with SHAP
* A conversational chatbot with streaming responses

## Tech Stack

* Frontend: React + Vite + Tailwind CSS
* Backend: Python + FastAPI
* ML Models: scikit-learn + SHAP
* LLM Chatbot: Ollama
* Database: None

## Quick Start

### 1. Install and run Ollama

Download Ollama from `https://ollama.com`, then start it:

```bash
ollama serve
```

Pull the model configured in `.env`:

```bash
ollama pull llama3.2:1b
```

### 2. Create `.env`

Use `.env.example` as the base:

```env
VITE_API_BASE_URL=http://localhost:8000
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
MODEL_DIR=./models
OLLAMA_API_URL=http://host.docker.internal:11434/v1/chat/completions
OLLAMA_MODEL=llama3.2:1b
OLLAMA_TIMEOUT_SECONDS=60
```

### 3. Start the app

```bash
docker compose up --build
```

### 4. Open the UI


`http://localhost:3000`

## Chatbot Notes

* Domain questions in career, finance, startup, and policy are answered from the app's own decision logic first.
* General conversation uses Ollama.
* If Ollama is unavailable or the configured model crashes, the chatbot now returns a friendly status message instead of a raw backend error.
* If the model is missing, run `ollama pull <model-name>`.

## Train Models

```bash
python backend/train_models.py
```

Datasets are read from `backend/datasets/*` and trained artifacts are written to `backend/models`.

### Dataset Sources (If Files Are Too Large For GitHub)

Some upstream sources can be re-downloaded here:

* Indian Student Placement Dataset 2025 (career readiness): https://www.kaggle.com/datasets/sakharebharat/indian-student-placement-dataset-2025
* O*NET 29.0 Database (career skills/occupations): https://www.kaggle.com/datasets/emarkhauser/onet-29-0-database

## API Endpoints

### Decision APIs

* `POST /career`
* `POST /finance`
* `POST /startup`
* `POST /policy`

### Chat API

* `POST /chatbot`

Example request:

```json
{
  "messages": [
    { "role": "user", "content": "Hi" }
  ],
  "stream": true
}
```

## Folder Structure

* `/backend` -> FastAPI backend and ML services
* `/backend/datasets` -> domain datasets
* `/backend/models` -> trained model files
* `/frontend` -> Vite React frontend

## Key Highlight

This project combines traditional ML, explainability, and conversational reasoning into one hybrid decision-intelligence system.
