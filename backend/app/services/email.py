"""
Email service for sending price alert notifications.

Uses Resend (https://resend.com) for email delivery.
Gracefully handles missing API key - emails simply won't be sent.
"""

import logging
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


def is_email_configured() -> bool:
    """Check if email sending is configured."""
    return bool(settings.resend_api_key)


def send_alert_email(
    to_email: str,
    ticker: str,
    condition: str,
    target_price: float,
    current_price: float,
    stock_name: Optional[str] = None
) -> bool:
    """
    Send an email notification when a price alert triggers.

    Args:
        to_email: Recipient email address
        ticker: Stock ticker symbol
        condition: Alert condition ("ABOVE" or "BELOW")
        target_price: The target price that triggered the alert
        current_price: Current stock price
        stock_name: Optional company name

    Returns:
        True if email was sent successfully, False otherwise
    """
    if not is_email_configured():
        logger.debug("Email not configured - skipping alert notification")
        return False

    try:
        import resend

        resend.api_key = settings.resend_api_key

        # Build email content
        direction = "above" if condition == "ABOVE" else "below"
        stock_display = f"{ticker} ({stock_name})" if stock_name else ticker

        subject = f"Price Alert: {ticker} is now ${current_price:.2f}"

        html_content = f"""
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #00D4FF 0%, #00FF88 100%); padding: 3px; border-radius: 12px;">
                <div style="background: #0D0D0D; border-radius: 10px; padding: 30px;">
                    <h1 style="color: #FFFFFF; margin: 0 0 20px 0; font-size: 24px;">
                        Price Alert Triggered
                    </h1>

                    <div style="background: #1A1A1A; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
                        <p style="color: #00D4FF; font-size: 28px; font-weight: bold; margin: 0 0 5px 0;">
                            {stock_display}
                        </p>
                        <p style="color: #A0A0A0; margin: 0;">
                            Current Price: <span style="color: #FFFFFF; font-weight: bold;">${current_price:.2f}</span>
                        </p>
                    </div>

                    <p style="color: #FFFFFF; font-size: 16px; line-height: 1.6;">
                        Your price alert was triggered! <strong>{ticker}</strong> is now trading
                        <span style="color: {'#00FF88' if condition == 'ABOVE' else '#FF4444'}; font-weight: bold;">
                            {direction}
                        </span>
                        your target price of <strong>${target_price:.2f}</strong>.
                    </p>

                    <div style="border-top: 1px solid #333; margin-top: 30px; padding-top: 20px;">
                        <p style="color: #666; font-size: 12px; margin: 0;">
                            This alert has been automatically deactivated.
                            Log in to Foliowise to reset it or create new alerts.
                        </p>
                    </div>
                </div>
            </div>

            <p style="color: #666; font-size: 11px; text-align: center; margin-top: 20px;">
                Sent by Foliowise - Your Intelligent Portfolio Tracker
            </p>
        </div>
        """

        params = {
            "from": settings.email_from,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
        }

        resend.Emails.send(params)
        logger.info(f"Alert email sent to {to_email} for {ticker}")
        return True

    except ImportError:
        logger.warning("Resend package not installed - skipping email")
        return False
    except Exception as e:
        logger.error(f"Failed to send alert email: {e}")
        return False
