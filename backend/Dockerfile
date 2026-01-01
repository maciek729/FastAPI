# backend/Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Kopiowanie plików zależności
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Kopiowanie kodu aplikacji
COPY . .

# Uruchomienie serwera (zakładając, że plik to main.py, a instancja to app)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]