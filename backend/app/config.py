from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    debug: bool = False

    # Email settings (optional - alerts work without email)
    resend_api_key: str | None = None
    email_from: str = "SmartFolio <alerts@smartfolio.app>"

    class Config:
        env_file = ".env"


settings = Settings()