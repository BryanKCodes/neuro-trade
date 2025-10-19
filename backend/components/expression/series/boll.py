import pandas as pd
from pydantic import Field, conint
from typing import Literal

from ai import BaseComponent
from components.expression.series import Series
from components.expression.series.price import Price, PriceModel

# --- Forward Reference for recursive models ---
AnyExpression = "AnyExpression"


# ==================================
# 1. The Logic Class
# ==================================
class BOLL(Series):
    def __init__(self, period: int = 20, stddev: int = 2, band: str = "mid", series: Series = Price()) -> None:
        """
        :param period: The moving average period.
        :param stddev: The standard deviation multiplier for the bands.
        :param band: 'mid' for middle band, 'upper' for upper band, 'lower' for lower band.
        :param series: The input Series on which to compute BOLL. Defaults to Price("close").
                       If provided, BOLL will act on it directly.
                       Useful for composing indicators. (e.g. ATR(14, ATR(14)) or Fractal(RSI(14))
        """
        self.period = period
        self.stddev = stddev
        self.band = band
        self.input_series = series
        col_name = f"BOLL_{band}_{period}_{stddev}_{series}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        data = self.input_series.calculator(df)
        sma = data.rolling(self.period).mean()
        std = data.rolling(self.period).std()
        if self.band == "mid":
            return sma
        elif self.band == "upper":
            return sma + self.stddev * std
        elif self.band == "lower":
            return sma - self.stddev * std
        else:
            raise ValueError(f"Invalid band type '{self.band}'. Use 'mid', 'upper', or 'lower'.")


# ==================================
# 2. The Pydantic Schema
# ==================================
class BOLLModel(BaseComponent):
    """
    Bollinger Bands (BOLL).

    Generates the midline, upper, or lower band based on standard deviation and a moving average,
    commonly used to identify overbought or oversold conditions.
    """
    type: Literal["BOLL"] = "BOLL"
    period: conint(ge=1) = Field(
        20,
        description="Moving average period for the bands. Must be ≥ 1."
    )
    stddev: conint(ge=0) = Field(
        2,
        description="Standard deviation multiplier. Must be ≥ 0."
    )
    band: Literal["mid", "upper", "lower"] = Field(
        "mid",
        description="Which band to return: 'upper', 'mid', or 'lower'. Defaults to 'mid'"
    )
    series: AnyExpression = Field(
        default_factory=lambda: PriceModel(),
        description=(
            "Input Series for band calculation (defaults to Price). "
            "Useful for indicator composition."
        )
    )

    def build(self) -> BOLL:
        return BOLL(
            period=self.period,
            stddev=self.stddev,
            band=self.band,
            series=self.series.build()
        )
