import csv
import io
from typing import Optional


# Common column name mappings for different brokerages
TICKER_COLUMNS = ['symbol', 'ticker', 'stock symbol', 'instrument']
QUANTITY_COLUMNS = ['quantity', 'shares', 'qty', 'units', 'amount']
COST_COLUMNS = ['average cost', 'avg cost', 'avg_cost_basis', 'cost basis', 'cost per share', 'average price', 'purchase price', 'price']


def normalize_column_name(col: str) -> str:
    """Normalize column name for matching."""
    return col.lower().strip().replace('_', ' ').replace('-', ' ')


def find_column(headers: list[str], possible_names: list[str]) -> Optional[int]:
    """Find index of a column matching any of the possible names."""
    normalized_headers = [normalize_column_name(h) for h in headers]
    for name in possible_names:
        if name in normalized_headers:
            return normalized_headers.index(name)
    return None


def parse_number(value: str) -> Optional[float]:
    """Parse a number from string, handling currency symbols and commas."""
    if not value:
        return None
    # Remove currency symbols, commas, and whitespace
    cleaned = value.replace('$', '').replace(',', '').replace(' ', '').strip()
    if not cleaned or cleaned == '-':
        return None
    try:
        return float(cleaned)
    except ValueError:
        return None


def parse_csv_holdings(file_content: str) -> dict:
    """
    Parse CSV content and extract holdings data.

    Supports various brokerage export formats by looking for common column names.

    Args:
        file_content: Raw CSV file content as string

    Returns:
        Dictionary with 'holdings' list and 'errors' list
    """
    holdings = []
    errors = []

    try:
        # Try to detect the dialect
        sample = file_content[:2048]
        try:
            dialect = csv.Sniffer().sniff(sample)
        except csv.Error:
            dialect = csv.excel

        reader = csv.reader(io.StringIO(file_content), dialect)
        rows = list(reader)

        if len(rows) < 2:
            return {'holdings': [], 'errors': ['CSV file must have a header row and at least one data row']}

        headers = rows[0]

        # Find column indices
        ticker_idx = find_column(headers, TICKER_COLUMNS)
        quantity_idx = find_column(headers, QUANTITY_COLUMNS)
        cost_idx = find_column(headers, COST_COLUMNS)

        if ticker_idx is None:
            return {'holdings': [], 'errors': [f'Could not find ticker/symbol column. Expected one of: {", ".join(TICKER_COLUMNS)}']}

        if quantity_idx is None:
            return {'holdings': [], 'errors': [f'Could not find quantity column. Expected one of: {", ".join(QUANTITY_COLUMNS)}']}

        # Cost basis is optional - we can default to 0 if not found
        cost_required = cost_idx is not None

        # Parse data rows
        for i, row in enumerate(rows[1:], start=2):
            if len(row) <= max(ticker_idx, quantity_idx, cost_idx or 0):
                errors.append(f'Row {i}: Not enough columns')
                continue

            ticker = row[ticker_idx].strip().upper()
            if not ticker:
                errors.append(f'Row {i}: Empty ticker symbol')
                continue

            # Skip non-stock entries (cash, pending, etc.)
            if ticker in ['CASH', 'PENDING', 'N/A', '']:
                continue

            quantity = parse_number(row[quantity_idx])
            if quantity is None or quantity <= 0:
                errors.append(f'Row {i}: Invalid quantity for {ticker}')
                continue

            if cost_idx is not None:
                cost = parse_number(row[cost_idx])
                if cost is None:
                    cost = 0.0
            else:
                cost = 0.0

            holdings.append({
                'ticker': ticker,
                'quantity': quantity,
                'avg_cost_basis': cost
            })

        # Consolidate duplicate tickers
        consolidated = {}
        for h in holdings:
            ticker = h['ticker']
            if ticker in consolidated:
                # Average the cost basis weighted by quantity
                existing = consolidated[ticker]
                total_qty = existing['quantity'] + h['quantity']
                weighted_cost = (
                    (existing['quantity'] * existing['avg_cost_basis']) +
                    (h['quantity'] * h['avg_cost_basis'])
                ) / total_qty
                consolidated[ticker] = {
                    'ticker': ticker,
                    'quantity': total_qty,
                    'avg_cost_basis': round(weighted_cost, 2)
                }
            else:
                consolidated[ticker] = h

        return {
            'holdings': list(consolidated.values()),
            'errors': errors
        }

    except Exception as e:
        return {'holdings': [], 'errors': [f'Failed to parse CSV: {str(e)}']}
