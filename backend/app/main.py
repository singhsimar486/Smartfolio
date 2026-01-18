from fastapi import FastAPI

from app.routers import auth, holdings, market, portfolio, news


app = FastAPI(
    title="SmartFolio API",
    description="An intelligent portfolio tracker with AI-powered insights",
    version="0.1.0"
)

app.include_router(auth.router)
app.include_router(holdings.router)
app.include_router(market.router)
app.include_router(portfolio.router)
app.include_router(news.router)


@app.get("/")
def root():
    return {"message": "Welcome to SmartFolio API"}