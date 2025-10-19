import pandas as pd


class Candle:
    def __init__(self, i: int, df: pd.DataFrame) -> None:
        self._candle_open = df["Open"].iloc[i]
        self._candle_close = df["Close"].iloc[i]
        self._wick_high = df["High"].iloc[i]
        self._wick_low = df["Low"].iloc[i]

    @property
    def candle_open(self) -> float:
        return self._candle_open

    @property
    def candle_close(self) -> float:
        return self._candle_close

    @property
    def wick_high(self) -> float:
        return self._wick_high

    @property
    def wick_low(self) -> float:
        return self._wick_low
