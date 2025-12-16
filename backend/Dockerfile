# Build stage
FROM python:3.11-slim AS builder

WORKDIR /app

# Copy requirements file
COPY requirements.txt .

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Production stage
FROM python:3.11-slim AS runner

WORKDIR /app

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Expose the port the app runs on
EXPOSE 3001

# Start the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3001"] 