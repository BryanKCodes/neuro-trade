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
class CCI(Series):
    def __init__(self, period: int = 14, series: Series = Price()):
        """
        :param period: The period to calculate the CCI.
        :param series: The input Series on which to compute CCI. Defaults to Price("close").
                       If provided, CCI will act on it directly.
                       Useful for composing indicators. (e.g. ATR(14, ATR(14)) or Fractal(RSI(14))
        """
        self.period = period
        self.input_series = series
        col_name = f"CCI_{period}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        data = self.input_series.calculator(df)
        sma = data.rolling(self.period).mean()
        mad = data.rolling(self.period).apply(lambda x: pd.Series(x).mad())
        return (data - sma) / (0.015 * mad)


# ==================================
# 2. The Pydantic Schema
# ==================================
class CCIModel(BaseComponent):
    """
    Commodity Channel Index (CCI).

    Used to identify cyclical trends by measuring deviation from the mean.
    """
    type: Literal["CCI"] = "CCI"
    period: conint(ge=1) = Field(
        14,
        description="Look-back period for CCI. Must be ≥ 1."
    )
    series: AnyExpression = Field(
        default_factory=lambda: PriceModel(),
        description="Input Series on which to compute CCI. Defaults to closing Price."
    )

    def build(self) -> CCI:
        return CCI(
            period=self.period,
            series=self.series.build()
        )
