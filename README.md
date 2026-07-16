# DeciXAI — Hybrid Explainable Decision Intelligence Engine (v2.0)

`DeciXAI` is a production-grade, containerized **Hybrid Decision Intelligence System** that fuses classical Machine Learning (scikit-learn, XGBoost), Explainable AI (SHAP), RAG-grounded evidence retrieval (O*NET, Government databases), and Large Language Model (LLM) reasoning into a unified interactive Decision Studio. 

It is designed to help users evaluate, defend, and optimize critical choices across four primary domains: **Career**, **Finance**, **Startups**, and **Government Policy**.

---

## 🌟 Key Product Pillars

1. **Grounded & Anti-Hallucination Routing**: User queries targeting domain decisions are handled by specialized local ML classification and regression pipelines first. Conversational LLMs are used for narrative structuring, action plans, and creative recommendations, rather than calculating numerical scores.
2. **Explainability at the Core (XAI)**: Driven by SHAP (SHapley Additive exPlanations). Raw feature weights are translated on the fly into human-readable factor impacts, detailing exactly which criteria boosted or held back a decision score.
3. **Interactive What-If Sandbox**: Real-time sliders allow users to adjust variables (such as CGPA, funding amount, credit score, or project budgets) and instantly see how the change impacts the prediction probability, the SHAP explanation, and the LLM-generated roadmap.
4. **Verifiable Audit Trail (Regulatory/Patent Proof)**: Meets high-compliance auditing standards. The system runs request-level middleware that appends every decision transaction, input payload, latency metric, and request ID into an immutable local ledger (`decision_audit.jsonl`), viewable directly in the UI.
5. **Cold-Start Warmup Optimization**: Solves latency bottlenecks on system startup. Container initialization automatically pre-loads all ML joblib bundles and pings the LLM runner (Ollama) to allocate VRAM before the first client request arrives.

---

## 🛠️ Technology Stack

| Layer | Technology | Key Responsibility |
| :--- | :--- | :--- |
| **Frontend UI** | React 18, Vite, Tailwind CSS, React Router | Glassmorphism dashboard, real-time debounced sliders, inline chat widget |
| **Backend API** | Python, FastAPI, Uvicorn | High-throughput asynchronous routing, security middlewares, health endpoints |
| **ML & Explainability** | scikit-learn, XGBoost, SHAP, joblib | Predictive classification, preprocessing pipelines, SHAP values calculation |
| **Generative Reasoning** | Ollama (Llama 3.1 / 3.2), Groq (optional) | Narrative reality checks, custom resume-worthy project ideas, action plans |
| **Report Generation** | ReportLab | Compilation of data, SHAP charts, and LLM advice into downloadable PDFs |
| **Audit Ledger** | JSON Lines (JSONL), Starlette Middleware | Immutable tracking of client IPs, payloads, latency, and status codes |

---

## 📁 Project Structure

```
├── backend/
│   ├── datasets/         # Source databases (CSV, XLSX, O*NET tables)
│   ├── middleware/       # Security (Rate Limiting, API Key, Body Limits), Audit Ledger
│   ├── models/           # Pre-trained pipeline bundles (*_model.joblib) & summary metadata
│   ├── routers/          # Versioned API routes (/api/v1/career, chatbot, export, audit...)
│   ├── services/         # Core business logic, parsing services, RAG retrieval, LLM generators
│   ├── utils/            # App logging, XLSX helpers, SHAP converters
│   ├── Dockerfile
│   ├── main.py           # Application entry point, warmup triggers, global error handlers
│   ├── requirements.txt  # Python package dependencies
│   └── train_models.py   # Training script for building and serializing domain models
├── frontend/
│   ├── dist/             # Compiled production bundle
│   ├── public/           # Static asset hosting (logo, etc.)
│   ├── src/
│   │   ├── components/   # Chatbot widget, DecisionReport, InsightPanel, ErrorBoundary
│   │   ├── pages/        # Home, DomainPage (Decision Studio), AuditTrail
│   │   ├── App.jsx       # Layout routing & Splash screen controller
│   │   └── api.js        # Axios-free native fetch client wrapper
│   ├── package.json
│   └── vite.config.js
├── docker-compose.yml    # Single-command orchestration
└── README.md             # Project documentation
```

---

## 🧠 Domain Architectures

### 1. 🎓 Career Studio
* **ML Model**: Tree-based classification (XGBoost/RandomForest) to assess overall placement readiness, combined with a TF-IDF + Logistic Regression pipeline to classify skills/descriptions into **10 distinct career paths** (e.g., Data Science, Cloud/DevOps, UI/UX).
* **Dual-Track Mode**: Compares the user's "Best Fit" (ML-derived alignment) against their "Stated Interest". If a gap exists, it provides transition maps.
* **Grounded RAG**: Queries local **O*NET 29.0** database tables to retrieve matching standard occupational titles, key element codes, and skill requirements.

### 2. 💳 Finance Studio
* **ML Model**: Credit risk and default classification using synthetic and real-world credit risk databases.
* **Heuristic Guardrails**: Hard safety caps on debt. For example, if the Loan-to-Income (LTI) ratio exceeds `0.8` or the credit score falls below `600`, the system overrides the ML probability to enforce warning labels and suggest debt reduction.

### 3. 🚀 Startup Studio
* **ML Model**: Startup success classifier trained on historical acquisition and investment records.
* **Gap Analysis**: Automatically evaluates the startup's team size, funding runway, and founder experience against the 25th and 50th percentiles of successful cohorts in the dataset, recommending immediate hires or cash requirements.

### 4. 🏛️ Policy Studio
* **ML Model**: Public feasibility classifier trained on historical Indian development indicators and schemes.
* **Governance Modifiers**: Blends the raw ML score with administrative parameters (political support, infrastructure readiness, risk, urgency). Low support combined with low infrastructure applies a hard capping restriction, dropping feasibility to a maximum of `50.0`.

---

## ⚡ Quick Start

### 1. Install and Start Ollama
Ensure Ollama is installed on your host system (`https://ollama.com`). Run the daemon and pull the default model:
```bash
# Start Ollama
ollama serve

# Pull the model configured in .env
ollama pull llama3.2:1b
```

### 2. Configure Environment Variables
Create a `.env` file in the root directory (based on `.env.example`):
```env
VITE_API_BASE_URL=http://localhost:8000
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
MODEL_DIR=./models
OLLAMA_API_URL=http://host.docker.internal:11434/v1/chat/completions
OLLAMA_MODEL=llama3.2:1b
OLLAMA_TIMEOUT_SECONDS=60
```
*Note: If running the backend locally (without Docker Compose), set `OLLAMA_API_URL` to `http://localhost:11434/v1/chat/completions`.*

### 3. Launch the Application

#### Option A: Docker Compose (Recommended)
Build and run the entire stack in containerized mode:
```bash
docker compose up --build
```
Access the application at `http://localhost:3000`.

#### Option B: Local Development Run
If you prefer running the components directly on your host machine:

* **Backend Run**:
  ```bash
  cd backend
  pip install -r requirements.txt
  python main.py
  ```
  *The API will be available at `http://localhost:8000`. Open `http://localhost:8000/docs` to test via Swagger UI.*

* **Frontend Run**:
  ```bash
  cd frontend
  npm install
  npm run dev
  ```
  *The Vite dev server will run at `http://localhost:5173`.*

---

## 📈 Model Training

To retrain the underlying machine learning models and regenerate serialized bundle artifacts:
```bash
python backend/train_models.py
```
* **Inputs**: Reads raw data tables from `backend/datasets/**/*.csv` and `*.xlsx`.
* **Outputs**: Serializes preprocessors, pipelines, feature schemas, and training metrics, saving them directly as `backend/models/{domain}_model.joblib`. Generates a global `training_summary.json` file.

### Dataset Sources
If datasets are missing or need updating, they can be sourced from:
* **Indian Student Placement Dataset 2025**: [Kaggle Source](https://www.kaggle.com/datasets/sakharebharat/indian-student-placement-dataset-2025)
* **O*NET 29.0 Database**: [Kaggle Source](https://www.kaggle.com/datasets/emarkhauser/onet-29-0-database)
* **Credit Risk Dataset**: [Kaggle Source](https://www.kaggle.com/datasets/laotse/credit-risk-dataset)
* **Indian Government Schemes Dataset**: [Kaggle Source](https://www.kaggle.com/datasets/saurabhshahane/indian-government-schemes)

---

## 🔒 Compliance, Auditing, and Security

* **Immutable Ledger**: Located at `backend/logs/audit/decision_audit.jsonl`. Decision logging is non-blocking, handled by FastAPI's `BackgroundTask` to ensure zero impact on user request latency.
* **Rate Limiting**: Built-in Starlette middleware to prevent API abuse.
* **API Key Guard**: Optional key verification using the `X-API-Key` header, easily configured in production.
* **Request Limits**: Prevents denial of service by rejecting payloads exceeding `1 MB`.
