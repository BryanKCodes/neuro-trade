import pandas as pd
import pandas_ta as ta
from pydantic import Field
from typing import Literal, TYPE_CHECKING

from ai import BaseComponent
from components.expression.series import Series
from components.expression.series.price import Price, PriceModel

# --- Forward Reference for recursive models ---
if TYPE_CHECKING:
    from ai.schemas import AnySeries


# ==================================
# 1. The Logic Class
# ==================================
class RSI(Series):
    def __init__(self, period=14, series: Series = Price()):
        """
        :param period: Number of periods to use for RSI calculation.
        :param series: The input Series to calculate RSI on. Defaults to closing price.
        """
        self.period = period
        self.input_series = series
        col_name = f"RSI_{period}_{series}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        # Compute the input series first
        input_series = self.input_series.calculator(df)
        return ta.rsi(input_series, length=self.period)


# ==================================
# 2. The Pydantic Schema
# ==================================
class RSIModel(BaseComponent):
    """
    Relative Strength Index (RSI).

    Measures the magnitude of recent price changes to evaluate overbought
    or oversold conditions in the price of a stock or other asset.
    """
    type: Literal["RSI"] = "RSI"
    period: int = Field(
        ...,
        ge=1,
        description="Lookback period for RSI computation. Must be ≥ 1."
    )
    series: AnySeries = Field(
        default_factory=lambda: PriceModel(output="close"),
        description="Input Series to compute RSI from. Defaults to closing price."
    )

    def build(self) -> RSI:
        return RSI(
            period=self.period,
            series=self.series.build()
        )
