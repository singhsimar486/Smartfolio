from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.routers import auth, holdings, market, portfolio, news, watchlist, alerts, insights, goals, dividends, settings, compare
from app.database import engine, Base
from app import models  # Import all models to register them


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all database tables on startup
    Base.metadata.create_all(bind=engine)
    yield


app = FastAPI(
    lifespan=lifespan,
    title="SmartFolio API",
    description="An intelligent portfolio tracker with AI-powered insights",
    version="0.1.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:4200"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(holdings.router)
app.include_router(market.router)
app.include_router(portfolio.router)
app.include_router(news.router)
app.include_router(watchlist.router)
app.include_router(alerts.router)
app.include_router(insights.router)
app.include_router(goals.router)
app.include_router(dividends.router)
app.include_router(settings.router)
app.include_router(compare.router)


@app.get("/")
def root():
    return {"message": "Welcome to SmartFolio API"}