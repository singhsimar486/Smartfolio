from datetime import datetime
from pydantic import BaseModel


class InsightResponse(BaseModel):
    id: str | None = None
    type: str  # success, warning, alert, info
    title: str
    message: str
    action: str | None = None
    is_dismissed: bool = False
    created_at: datetime | None = None

    class Config:
        from_attributes = True


class ChatMessageCreate(BaseModel):
    message: str


class ChatMessageResponse(BaseModel):
    id: str
    role: str  # user, assistant
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


class ChatResponse(BaseModel):
    response: str
    message_id: str


class WeeklyDigestResponse(BaseModel):
    id: str | None = None
    summary: str
    health_score: int
    health_label: str
    highlights: list[str]
    recommendations: list[str]
    outlook: str
    portfolio_value: float
    weekly_change: float
    weekly_change_pct: float
    week_start: datetime | None = None
    week_end: datetime | None = None
    generated_at: datetime | None = None

    class Config:
        from_attributes = True


class InsightsOverview(BaseModel):
    insights: list[InsightResponse]
    has_new_digest: bool
    digest_summary: str | None = None
