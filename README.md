# SmartFolio

An intelligent portfolio tracker with AI-powered insights.

## Overview

SmartFolio helps users track their investment portfolios with real-time market data, news sentiment analysis, and AI-generated insights.

## Features (Planned)

- User authentication
- Portfolio management (add/edit/delete holdings)
- Real-time market data integration
- Performance tracking and visualization
- News feed with sentiment analysis
- AI-powered portfolio insights

## Tech Stack

**Backend:**
- Python 3.11
- FastAPI
- PostgreSQL
- SQLAlchemy

**Frontend:**
- Next.js (coming soon)
- Tailwind CSS

**AI/ML:**
- Sentiment analysis for news
- LLM integration for insights

## Setup

### Prerequisites
- Python 3.11+
- PostgreSQL 15+
- Node.js 18+ (for frontend, coming soon)

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

6. Run the server
```bash
uvicorn main:app --reload
```

7. Visit `http://127.0.0.1:8000/docs` for API documentation

## Project Status

- [x] Project setup
- [x] Database models
- [x] PostgreSQL integration
- [ ] Authentication (in progress)
- [ ] Holdings endpoints
- [ ] Market data integration
- [ ] News sentiment analysis
- [ ] AI insights
- [ ] Frontend

## Author

Simar Singh