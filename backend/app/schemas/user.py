from datetime import datetime

from pydantic import BaseModel, EmailStr


class UserCreate(BaseModel):
    """Schema for creating a new user (registration)."""
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    """Schema for user login."""
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    """Schema for returning user data (no password!)."""
    id: str
    email: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    """Schema for JWT token response."""
    access_token: str
    token_type: str = "bearer"