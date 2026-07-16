FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
ENV PIP_DEFAULT_TIMEOUT=180 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y curl libgomp1 && rm -rf /var/lib/apt/lists/*

RUN python -m pip install --upgrade pip && \
    pip install --prefer-binary --retries 10 --timeout 180 -r requirements.txt

COPY . .

RUN mkdir -p /app/models /app/logs

EXPOSE 8000

CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
