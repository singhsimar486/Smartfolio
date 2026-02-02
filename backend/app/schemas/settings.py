from pydantic import BaseModel


class PasswordChange(BaseModel):
    current_password: str
    new_password: str


class PasswordChangeResponse(BaseModel):
    message: str


class AccountDeleteRequest(BaseModel):
    password: str


class UserPreferences(BaseModel):
    email_notifications: bool = True
    dark_mode: bool = True
    default_currency: str = "USD"


class ExportResponse(BaseModel):
    filename: str
    content: str
    content_type: str
