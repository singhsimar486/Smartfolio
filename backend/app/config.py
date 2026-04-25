from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    debug: bool = False

    # Email settings (optional - alerts work without email)
    resend_api_key: str | None = None
    email_from: str = "Foliowise <alerts@foliowise.app>"

    # Stripe settings (optional - subscriptions work without Stripe in free mode)
    stripe_secret_key: str | None = None
    stripe_webhook_secret: str | None = None
    stripe_pro_price_id: str | None = None
    stripe_pro_plus_price_id: str | None = None
    frontend_url: str = "http://localhost:4200"

    class Config:
        env_file = ".env"


settings = Settings()