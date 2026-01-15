from fastapi import FastAPI

from app.routers import auth, holdings


app = FastAPI(
    title="SmartFolio API",
    description="An intelligent portfolio tracker with AI-powered insights",
    version="0.1.0"
)

app.include_router(auth.router)
app.include_router(holdings.router)


@app.get("/")
def root():
    return {"message": "Welcome to SmartFolio API"}