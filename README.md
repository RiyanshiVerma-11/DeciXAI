# DecisionAI Engine (Docker-first)

AI-powered Explainable Decision Intelligence System.

## Tech stack
- Frontend: React + Vite + Tailwind CSS
- Backend: Python + FastAPI
- ML: scikit-learn, SHAP
- Database: none (in-memory / local model files)
- Chatbot: rule-based intent detection + SHAP explanation

## Quick start
1. Set environment variables from `.env.example` if needed.

2. Build and run:

```bash
docker compose up --build
```

3. Open: `http://localhost:3000`

## Train models with local datasets

Run:

```bash
python backend/train_models.py
```

This reads the datasets from `backend/datasets/*` and writes trained model artifacts to `backend/models`.

## API endpoints
POST `/career`, `/finance`, `/startup`, `/policy`, `/chatbot`

Request and response structure:

```json
{
  "input": { ... }
}

// response
{
  "decision": "...",
  "probability": 0.82,
  "key_factors": ["..."],
  "explanation": "...",
  "suggestions": ["..."]
}
```

## Folder structure
- `/backend`: FastAPI backend and ML service
- `/backend/datasets`: place real datasets for training by domain
- `/frontend`: Vite React frontend

## Notes
- backend stores models in `backend/models`
- store domain datasets in `backend/datasets/career`, `finance`, `startup`, and `policy`
- SHAP explanations are generated at runtime
