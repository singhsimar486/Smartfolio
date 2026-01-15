# SmartFolio

An intelligent portfolio tracker with AI-powered insights.

## Overview

SmartFolio helps users track their investment portfolios with real-time market data, news sentiment analysis, and AI-generated insights.

## Features

- **User Authentication** — Secure registration and login with JWT tokens
- **Portfolio Management** — Add, edit, and delete stock holdings
- **Real-Time Market Data** — Live stock prices from Yahoo Finance
- **Portfolio Analytics** — Track total value, profit/loss, and daily changes
- **Allocation Breakdown** — Visualize portfolio distribution

## Tech Stack

**Backend:**
- Python 3.11
- FastAPI
- PostgreSQL
- SQLAlchemy
- yfinance (market data)

**Frontend:**
- Angular (coming soon)
- TypeScript
- Angular Material

**AI/ML:**
- Sentiment analysis for news (coming soon)
- LLM integration for insights (coming soon)

## API Endpoints

### Authentication
- `POST /auth/register` — Create new account
- `POST /auth/login` — Get JWT token
- `GET /auth/me` — Get current user

### Holdings
- `POST /holdings/` — Add a holding
- `GET /holdings/` — List all holdings
- `GET /holdings/{id}` — Get single holding
- `PUT /holdings/{id}` — Update holding
- `DELETE /holdings/{id}` — Delete holding

### Market Data
- `GET /market/quote/{ticker}` — Get real-time stock quote
- `GET /market/history/{ticker}` — Get historical prices

### Portfolio
- `GET /portfolio/summary` — Get portfolio with real-time values
- `GET /portfolio/allocation` — Get allocation breakdown

## Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Node.js 18+ (for frontend)

### Backend Setup

1. Clone the repository
```bash
git clone https://github.com/singhsimar486/Smartfolio.git
cd Smartfolio/backend
```

2. Create and activate virtual environment
```bash
python3 -m venv venv
source venv/bin/activate
```

3. Install dependencies
```bash
pip install -r requirements.txt
```

4. Create `.env` file
```
DATABASE_URL=postgresql://your_username@localhost:5432/smartfolio
SECRET_KEY=your-secret-key-here
DEBUG=True
```

5. Create the database
```bash
createdb smartfolio
```

6. Create tables
```bash
python -c "from app.database import engine, Base; from app.models import User, Holding, Transaction; Base.metadata.create_all(bind=engine)"
```

7. Run the server
```bash
uvicorn app.main:app --reload
```

8. Visit `http://127.0.0.1:8000/docs` for API documentation

## Project Status

- [x] Project setup
- [x] Database models
- [x] PostgreSQL integration
- [x] User authentication
- [x] Holdings CRUD
- [x] Real-time market data
- [x] Portfolio summary
- [x] Portfolio allocation
- [ ] News sentiment analysis
- [ ] AI insights
- [ ] Frontend (Angular)

## Author

Simar Singh