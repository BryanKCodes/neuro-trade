import pandas as pd
import pandas_ta as ta
from pydantic import Field
from typing import Literal

from ai import BaseComponent
from components.expression.series import Series


# ==================================
# 1. The Logic Class
# ==================================
class KC(Series):
    def __init__(self, period: int = 20, multiplier: int = 2, output: str = "mid"):
        """
        :param period: The EMA period length.
        :param multiplier: The ATR multiplier to determine band distance.
        :param output: Which band to output: 'upper', 'mid', or 'lower'.
        """
        self.period = period
        self.multiplier = multiplier
        if output not in ['upper', 'mid', 'lower']:
            raise ValueError("KC output must be 'upper', 'mid', or 'lower'")
        self.output = output
        col_name = f"KC_{output}_{period}_{multiplier}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        kc_df = ta.kc(df['High'], df['Low'], df['Close'], length=self.period, scalar=self.multiplier)

        upper_col = next(c for c in kc_df.columns if c.startswith("KCU"))
        mid_col   = next(c for c in kc_df.columns if c.startswith("KCB"))
        lower_col = next(c for c in kc_df.columns if c.startswith("KCl") or c.startswith("KCL"))

        if upper_col not in df.columns: df[upper_col] = kc_df[upper_col]
        if mid_col   not in df.columns: df[mid_col]   = kc_df[mid_col]
        if lower_col not in df.columns: df[lower_col] = kc_df[lower_col]

        if self.output == 'upper': return df[upper_col]
        if self.output == 'mid':   return df[mid_col]
        return df[lower_col]


# ==================================
# 2. The Pydantic Schema
# ==================================
class KCModel(BaseComponent):
    """
    Keltner Channels (KC).

    Uses an EMA and Average True Range to create upper, middle, and lower
    volatility-based bands for trend analysis.
    """
    type: Literal["KC"] = "KC"
    period: int = Field(
        20,
        ge=1,
        description="EMA period for the middle band. Must be ≥ 1."
    )
    multiplier: int = Field(
        2,
        ge=0,
        description="ATR multiplier for band distance. Must be ≥ 0."
    )
    output: Literal["upper", "mid", "lower"] = Field(
        "mid",
        description="Which channel line to return: 'upper', 'mid', or 'lower'. Defaults to 'mid'"
    )

    def build(self) -> KC:
        return KC(
            period=self.period,
            multiplier=self.multiplier,
            output=self.output
        )
