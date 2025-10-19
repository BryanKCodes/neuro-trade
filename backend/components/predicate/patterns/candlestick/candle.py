import pandas as pd
import pandas_ta as ta
from pydantic import Field
from typing import Literal

from ai import BaseComponent
from components.predicate import Predicate


# ==================================
# 1. The Logic Class
# ==================================
class Candle(Predicate):
    def __init__(self, name: str, bullish: bool = True):
        """
        :param name: The candlestick pattern name supported by pandas_ta (like 'doji', 'hammer', 'engulfing').
        :param bullish: True to check for bullish pattern, False for bearish.
        """
        self.name = name.lower()
        self.bullish = bullish
        self.series_name = f'cdl_{self.name}'

    def _ensure_series(self, df: pd.DataFrame):
        # compute only if not already in dataframe
        if self.series_name not in df.columns:
            func = getattr(ta, self.series_name, None)
            if func is None:
                raise ValueError(f"Candle pattern '{self.name}' not found in pandas_ta.")
            df[self.series_name] = func(df['Open'], df['High'], df['Low'], df['Close'])

    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        self._ensure_series(df)
        value = df[self.series_name].iloc[i]
        if self.bullish:
            return value > 0
        else:
            return value < 0


# ==================================
# 2. The Pydantic Schema
# ==================================
class CandleModel(BaseComponent):
    """
    Predicate that checks if a specified candlestick pattern appears at a given index,
    with polarity control (bullish or bearish). Internally uses functions
    from the pandas_ta library such as `cdl_doji`, `cdl_hammer`, etc.
    """
    type: Literal["Candle"] = "Candle"
    name: str = Field(
        ...,
        description="Name of the candlestick pattern (e.g., 'doji', 'hammer', 'engulfing')."
    )
    bullish: bool = Field(
        True,
        description="True for bullish pattern detection, False for bearish. Defaults to True."
    )

    def build(self) -> Candle:
        return Candle(
            name=self.name,
            bullish=self.bullish
        )
