"""
AI Portfolio Advisor Service

This service provides AI-powered portfolio analysis and insights.
It can use OpenAI, Anthropic Claude, or other LLM providers.
"""

import os
import json
from datetime import datetime, timedelta
from typing import Optional
import httpx

# Configuration - set your API key in environment variables
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")

# Use OpenAI by default, fall back to Anthropic
AI_PROVIDER = os.getenv("AI_PROVIDER", "openai")  # "openai" or "anthropic"


def get_portfolio_context(portfolio_summary: dict, holdings_with_data: list) -> str:
    """Build a context string describing the user's portfolio."""

    if not holdings_with_data:
        return "The user has no holdings in their portfolio yet."

    context = f"""
Portfolio Overview:
- Total Value: ${portfolio_summary.get('total_value', 0):,.2f}
- Total Cost Basis: ${portfolio_summary.get('total_cost', 0):,.2f}
- Total Profit/Loss: ${portfolio_summary.get('total_profit_loss', 0):,.2f} ({portfolio_summary.get('total_profit_loss_percent', 0):.2f}%)
- Day Change: ${portfolio_summary.get('day_change', 0):,.2f} ({portfolio_summary.get('day_change_percent', 0):.2f}%)
- Number of Holdings: {len(holdings_with_data)}

Holdings:
"""

    # Sort by current value descending
    sorted_holdings = sorted(
        holdings_with_data,
        key=lambda x: x.get('current_value') or 0,
        reverse=True
    )

    for h in sorted_holdings:
        allocation = 0
        if portfolio_summary.get('total_value', 0) > 0 and h.get('current_value'):
            allocation = (h['current_value'] / portfolio_summary['total_value']) * 100

        context += f"""
- {h.get('ticker', 'N/A')} ({h.get('name', 'Unknown')}):
  * Shares: {h.get('quantity', 0)}
  * Current Price: ${h.get('current_price', 0):,.2f}
  * Avg Cost: ${h.get('avg_cost_basis', 0):,.2f}
  * Current Value: ${h.get('current_value', 0):,.2f}
  * P/L: ${h.get('profit_loss', 0):,.2f} ({h.get('profit_loss_percent', 0):.2f}%)
  * Day Change: {h.get('day_change_percent', 0):.2f}%
  * Portfolio Allocation: {allocation:.1f}%
"""

    return context


def get_sector_analysis(holdings: list) -> str:
    """Analyze sector concentration (simplified - in production, use a sector API)."""
    # This is a simplified mapping - in production, you'd use a proper sector classification API
    tech_stocks = ['AAPL', 'MSFT', 'GOOGL', 'GOOG', 'META', 'NVDA', 'AMD', 'INTC', 'CRM', 'ADBE', 'ORCL', 'CSCO', 'IBM', 'QCOM', 'TXN', 'AVGO', 'NOW', 'SNOW', 'NET', 'PLTR']
    finance_stocks = ['JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'BLK', 'SCHW', 'AXP', 'V', 'MA', 'PYPL', 'SQ', 'COIN']
    healthcare_stocks = ['JNJ', 'UNH', 'PFE', 'ABBV', 'MRK', 'LLY', 'TMO', 'ABT', 'DHR', 'BMY', 'AMGN', 'GILD', 'MRNA', 'ISRG']
    consumer_stocks = ['AMZN', 'TSLA', 'HD', 'MCD', 'NKE', 'SBUX', 'TGT', 'COST', 'WMT', 'DIS', 'NFLX', 'ABNB', 'UBER', 'LYFT']
    energy_stocks = ['XOM', 'CVX', 'COP', 'SLB', 'EOG', 'OXY', 'PSX', 'VLO', 'MPC', 'HAL']

    sectors = {'Technology': 0, 'Finance': 0, 'Healthcare': 0, 'Consumer': 0, 'Energy': 0, 'Other': 0}
    total_value = sum(h.get('current_value', 0) or 0 for h in holdings)

    if total_value == 0:
        return "Unable to analyze sectors - no holdings with value."

    for h in holdings:
        ticker = h.get('ticker', '').upper()
        value = h.get('current_value', 0) or 0

        if ticker in tech_stocks:
            sectors['Technology'] += value
        elif ticker in finance_stocks:
            sectors['Finance'] += value
        elif ticker in healthcare_stocks:
            sectors['Healthcare'] += value
        elif ticker in consumer_stocks:
            sectors['Consumer'] += value
        elif ticker in energy_stocks:
            sectors['Energy'] += value
        else:
            sectors['Other'] += value

    analysis = "Sector Breakdown:\n"
    for sector, value in sorted(sectors.items(), key=lambda x: x[1], reverse=True):
        if value > 0:
            pct = (value / total_value) * 100
            analysis += f"- {sector}: {pct:.1f}%\n"

    return analysis


async def call_openai(messages: list, max_tokens: int = 1000) -> Optional[str]:
    """Call OpenAI API."""
    if not OPENAI_API_KEY:
        return None

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": 0.7
                },
                timeout=60.0
            )

            if response.status_code == 200:
                data = response.json()
                return data["choices"][0]["message"]["content"]
            else:
                print(f"OpenAI API error: {response.status_code} - {response.text}")
                return None
    except Exception as e:
        print(f"OpenAI API exception: {e}")
        return None


async def call_anthropic(messages: list, max_tokens: int = 1000) -> Optional[str]:
    """Call Anthropic Claude API."""
    if not ANTHROPIC_API_KEY:
        return None

    try:
        # Convert messages to Anthropic format
        system_msg = ""
        claude_messages = []

        for msg in messages:
            if msg["role"] == "system":
                system_msg = msg["content"]
            else:
                claude_messages.append({
                    "role": msg["role"],
                    "content": msg["content"]
                })

        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": ANTHROPIC_API_KEY,
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01"
                },
                json={
                    "model": "claude-3-haiku-20240307",
                    "max_tokens": max_tokens,
                    "system": system_msg,
                    "messages": claude_messages
                },
                timeout=60.0
            )

            if response.status_code == 200:
                data = response.json()
                return data["content"][0]["text"]
            else:
                print(f"Anthropic API error: {response.status_code} - {response.text}")
                return None
    except Exception as e:
        print(f"Anthropic API exception: {e}")
        return None


async def call_ai(messages: list, max_tokens: int = 1000) -> Optional[str]:
    """Call the configured AI provider."""
    if AI_PROVIDER == "anthropic" and ANTHROPIC_API_KEY:
        return await call_anthropic(messages, max_tokens)
    elif OPENAI_API_KEY:
        return await call_openai(messages, max_tokens)
    elif ANTHROPIC_API_KEY:
        return await call_anthropic(messages, max_tokens)
    else:
        # Return mock response for demo purposes
        return None


def get_mock_insights(portfolio_summary: dict, holdings: list) -> list:
    """Generate mock insights when no AI API is configured."""
    insights = []

    if not holdings:
        return [{
            "type": "info",
            "title": "Get Started",
            "message": "Add some holdings to your portfolio to receive personalized AI insights.",
            "action": "Add your first holding to get started.",
            "priority": 1
        }]

    total_value = portfolio_summary.get('total_value', 0)

    # Check for concentration
    for h in holdings:
        if h.get('current_value') and total_value > 0:
            allocation = (h['current_value'] / total_value) * 100
            if allocation > 25:
                insights.append({
                    "type": "warning",
                    "title": "High Concentration",
                    "message": f"{h['ticker']} represents {allocation:.1f}% of your portfolio. Consider diversifying to reduce single-stock risk.",
                    "action": f"Consider trimming {h['ticker']} position or adding other stocks.",
                    "priority": 2
                })

    # Check for big winners
    for h in holdings:
        pl_pct = h.get('profit_loss_percent', 0) or 0
        if pl_pct > 50:
            insights.append({
                "type": "success",
                "title": "Strong Performer",
                "message": f"{h['ticker']} is up {pl_pct:.1f}% from your cost basis. Consider whether to take profits or let it ride.",
                "action": "Review your exit strategy for this position.",
                "priority": 3
            })

    # Check for losers
    for h in holdings:
        pl_pct = h.get('profit_loss_percent', 0) or 0
        if pl_pct < -20:
            insights.append({
                "type": "alert",
                "title": "Underperforming",
                "message": f"{h['ticker']} is down {abs(pl_pct):.1f}%. Review if your investment thesis still holds.",
                "action": "Consider whether to average down, hold, or cut losses.",
                "priority": 2
            })

    # Diversification insight
    if len(holdings) < 5:
        insights.append({
            "type": "info",
            "title": "Diversification",
            "message": f"You have {len(holdings)} holdings. Consider adding more positions to reduce risk through diversification.",
            "action": "Aim for 10-15 holdings across different sectors.",
            "priority": 4
        })

    # Day performance
    day_change = portfolio_summary.get('day_change_percent', 0)
    if day_change > 3:
        insights.append({
            "type": "success",
            "title": "Great Day!",
            "message": f"Your portfolio is up {day_change:.2f}% today. Nice gains!",
            "action": None,
            "priority": 5
        })
    elif day_change < -3:
        insights.append({
            "type": "info",
            "title": "Tough Day",
            "message": f"Your portfolio is down {abs(day_change):.2f}% today. Stay focused on the long term.",
            "action": "Volatility is normal. Review your positions but avoid panic selling.",
            "priority": 5
        })

    # Sort by priority and return top 3
    insights.sort(key=lambda x: x['priority'])
    return insights[:3]


async def generate_insights(portfolio_summary: dict, holdings: list) -> list:
    """Generate AI-powered portfolio insights."""

    portfolio_context = get_portfolio_context(portfolio_summary, holdings)
    sector_analysis = get_sector_analysis(holdings)

    system_prompt = """You are an expert financial advisor AI assistant for SmartFolio, a portfolio tracking app.
Your job is to analyze the user's portfolio and provide actionable, personalized insights.

Guidelines:
- Be specific and reference actual holdings by ticker
- Focus on actionable advice, not generic tips
- Consider diversification, concentration risk, and performance
- Be encouraging but honest about risks
- Keep insights concise (2-3 sentences each)
- Don't give specific buy/sell recommendations with prices
- Include a mix of insight types: risks, opportunities, and observations

Return your response as a JSON array with 3 insights, each having:
- type: "success" | "warning" | "alert" | "info"
- title: short title (3-5 words)
- message: the insight (2-3 sentences)
- action: suggested action or null

Example format:
[
  {"type": "warning", "title": "High Tech Exposure", "message": "Your portfolio is 70% technology stocks...", "action": "Consider adding..."},
  ...
]"""

    user_prompt = f"""Analyze this portfolio and provide 3 personalized insights:

{portfolio_context}

{sector_analysis}

Today's date: {datetime.now().strftime('%B %d, %Y')}

Provide exactly 3 insights as a JSON array."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    response = await call_ai(messages, max_tokens=800)

    if response:
        try:
            # Try to parse JSON from response
            # Handle case where response might have markdown code blocks
            json_str = response
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0]

            insights = json.loads(json_str.strip())
            return insights
        except json.JSONDecodeError:
            print(f"Failed to parse AI response as JSON: {response}")
            return get_mock_insights(portfolio_summary, holdings)
    else:
        return get_mock_insights(portfolio_summary, holdings)


async def ask_ai_question(question: str, portfolio_summary: dict, holdings: list) -> str:
    """Answer a user's question about their portfolio."""

    portfolio_context = get_portfolio_context(portfolio_summary, holdings)
    sector_analysis = get_sector_analysis(holdings)

    system_prompt = """You are an expert financial advisor AI assistant for SmartFolio.
The user will ask questions about their investment portfolio.

Guidelines:
- Reference their actual holdings when relevant
- Be helpful, accurate, and educational
- Don't provide specific price targets or guarantees
- Encourage long-term thinking
- If you don't know something, say so
- Keep responses concise but informative (2-4 paragraphs max)
- Use plain language, avoid jargon unless explaining it"""

    user_prompt = f"""Here is my current portfolio:

{portfolio_context}

{sector_analysis}

My question: {question}"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    response = await call_ai(messages, max_tokens=600)

    if response:
        return response
    else:
        # Mock response when no API configured
        return f"""I'd be happy to help analyze your portfolio and answer your question about "{question}".

Based on your current holdings, here are my thoughts:

Your portfolio has {len(holdings)} positions with a total value of ${portfolio_summary.get('total_value', 0):,.2f}. You're currently {'up' if portfolio_summary.get('total_profit_loss', 0) >= 0 else 'down'} ${abs(portfolio_summary.get('total_profit_loss', 0)):,.2f} overall.

To get more detailed AI-powered analysis, please configure an OpenAI or Anthropic API key in your environment variables. This will enable advanced portfolio insights and personalized recommendations.

Is there anything specific about your holdings you'd like me to explain?"""


async def generate_weekly_digest(portfolio_summary: dict, holdings: list, week_start_value: float = None) -> dict:
    """Generate a weekly portfolio digest."""

    portfolio_context = get_portfolio_context(portfolio_summary, holdings)
    sector_analysis = get_sector_analysis(holdings)

    # Calculate weekly change if we have the starting value
    current_value = portfolio_summary.get('total_value', 0)
    weekly_change = 0
    weekly_change_pct = 0
    if week_start_value and week_start_value > 0:
        weekly_change = current_value - week_start_value
        weekly_change_pct = (weekly_change / week_start_value) * 100

    system_prompt = """You are an expert financial advisor creating a weekly portfolio digest for SmartFolio users.

Create a comprehensive but readable weekly summary that includes:
1. Overall portfolio health assessment
2. Top performers and underperformers this week
3. Key observations about diversification and risk
4. 2-3 actionable recommendations for the coming week
5. An encouraging closing thought

Format the response as JSON with these fields:
- summary: 2-3 sentence overall summary
- health_score: number 1-100 representing portfolio health
- health_label: "Excellent" | "Good" | "Fair" | "Needs Attention"
- highlights: array of 3 key points (strings)
- recommendations: array of 2-3 action items (strings)
- outlook: 1-2 sentence forward-looking thought"""

    user_prompt = f"""Generate a weekly digest for this portfolio:

{portfolio_context}

{sector_analysis}

Weekly Performance: ${weekly_change:,.2f} ({weekly_change_pct:+.2f}%)
Week ending: {datetime.now().strftime('%B %d, %Y')}

Generate the weekly digest as JSON."""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt}
    ]

    response = await call_ai(messages, max_tokens=800)

    if response:
        try:
            json_str = response
            if "```json" in response:
                json_str = response.split("```json")[1].split("```")[0]
            elif "```" in response:
                json_str = response.split("```")[1].split("```")[0]

            digest = json.loads(json_str.strip())
            digest['generated_at'] = datetime.now().isoformat()
            digest['portfolio_value'] = current_value
            digest['weekly_change'] = weekly_change
            digest['weekly_change_pct'] = weekly_change_pct
            return digest
        except json.JSONDecodeError:
            pass

    # Mock digest when no API configured
    # Determine health based on portfolio metrics
    health_score = 70
    health_label = "Good"

    total_pl_pct = portfolio_summary.get('total_profit_loss_percent', 0)
    if total_pl_pct > 20:
        health_score = 90
        health_label = "Excellent"
    elif total_pl_pct > 5:
        health_score = 80
        health_label = "Good"
    elif total_pl_pct > -5:
        health_score = 65
        health_label = "Fair"
    else:
        health_score = 50
        health_label = "Needs Attention"

    # Adjust for diversification
    if len(holdings) < 3:
        health_score -= 15
    elif len(holdings) > 10:
        health_score += 5

    health_score = max(20, min(100, health_score))

    top_performer = max(holdings, key=lambda x: x.get('profit_loss_percent', 0) or 0) if holdings else None
    worst_performer = min(holdings, key=lambda x: x.get('profit_loss_percent', 0) or 0) if holdings else None

    highlights = []
    if top_performer:
        highlights.append(f"Top performer: {top_performer['ticker']} ({top_performer.get('profit_loss_percent', 0):+.1f}%)")
    if worst_performer and worst_performer != top_performer:
        highlights.append(f"Needs attention: {worst_performer['ticker']} ({worst_performer.get('profit_loss_percent', 0):+.1f}%)")
    highlights.append(f"Portfolio is {'up' if total_pl_pct >= 0 else 'down'} {abs(total_pl_pct):.1f}% overall")

    return {
        "summary": f"Your portfolio of {len(holdings)} holdings is valued at ${current_value:,.2f}. Overall you're {'up' if total_pl_pct >= 0 else 'down'} {abs(total_pl_pct):.1f}% from your cost basis.",
        "health_score": health_score,
        "health_label": health_label,
        "highlights": highlights,
        "recommendations": [
            "Review any positions down more than 20% to ensure your thesis still holds",
            "Consider rebalancing if any single position exceeds 25% of your portfolio",
            "Keep an eye on earnings announcements for your holdings this week"
        ],
        "outlook": "Stay focused on your long-term goals and avoid making emotional decisions based on short-term volatility.",
        "generated_at": datetime.now().isoformat(),
        "portfolio_value": current_value,
        "weekly_change": weekly_change,
        "weekly_change_pct": weekly_change_pct
    }
