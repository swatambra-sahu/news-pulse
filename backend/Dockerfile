# The backend needs both Node (to run the API) and Python (to run the
# scraper subprocess triggered by POST /ingest/trigger), so a plain Node
# buildpack isn't enough on most PaaS providers - a Docker image is the
# simplest way to guarantee both runtimes are present together.
FROM node:20-slim

# Python + pip for the scraper subprocess
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install backend Node deps
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --omit=dev

# Install scraper Python deps into a venv
COPY scraper/requirements.txt ./scraper/requirements.txt
RUN python3 -m venv /app/scraper/.venv \
    && /app/scraper/.venv/bin/pip install --no-cache-dir -r /app/scraper/requirements.txt

# Copy the rest of the source
COPY backend ./backend
COPY scraper ./scraper

# Data dir for the shared SQLite file (mount a persistent volume here in
# production if your host supports it - see README's Deployment section)
RUN mkdir -p /app/data

ENV PYTHON_BIN=/app/scraper/.venv/bin/python
ENV SCRAPER_PATH=/app/scraper/main.py
ENV DB_PATH=/app/data/newspulse.sqlite3
ENV PORT=4000

WORKDIR /app/backend
EXPOSE 4000
CMD ["node", "src/server.js"]
