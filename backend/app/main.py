import os
from fastapi import FastAPI, Request
from starlette.responses import Response
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


@app.middleware("http")
async def add_cors_headers(request: Request, call_next):
    # Handle preflight OPTIONS request
    if request.method == "OPTIONS":
        response = Response(status_code=200)
        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Max-Age"] = "86400"
        return response

    try:
        response = await call_next(request)
    except Exception as e:
        response = Response(content=str(e), status_code=500)

    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Max-Age"] = "86400"
    return response


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


@app.get("/health")
def health_check():
    return {"status": "healthy"}
