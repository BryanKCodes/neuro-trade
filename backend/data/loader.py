import pandas as pd
import yfinance as yf


def load_yfinance_data(ticker: str, interval: str) -> pd.DataFrame:
    """
    Load historical OHLCV data from Yahoo Finance for the specified ticker and duration.

    :param ticker: Stock ticker symbol (e.g., 'AAPL', 'SPY')
    :param interval: Data interval (e.g., '1m', '5m', '15m', '1h', '1d').
    :return: DataFrame with columns ['Open', 'High', 'Low', 'Close', 'Volume'] indexed by date.
    """
    df = yf.download(
        ticker,
        interval=interval,
        period="max",
        progress=False,
        auto_adjust=True,
        group_by='column'
    )

    if df is None or df.empty:
        raise ValueError(f"No data returned for {ticker} with interval {interval}")

    # drop multilevel index if still multiindex for safety
    if isinstance(df.columns, pd.MultiIndex):
        if 'Ticker' in df.columns.names:
            df.columns = df.columns.droplevel('Ticker')
        else:
            df.columns = df.columns.droplevel(0)

    df = df[['Open', 'High', 'Low', 'Close', 'Volume']].dropna()
    return df
