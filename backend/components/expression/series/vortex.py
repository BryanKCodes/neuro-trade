import pandas as pd
import pandas_ta as ta
from pydantic import Field, conint
from typing import Literal

from ai import BaseComponent
from components.expression.series import Series


# ==================================
# 1. The Logic Class
# ==================================
class Vortex(Series):
    def __init__(self, period: int = 14, output: str = "+vi"):
        """
        :param period: The number of periods for calculation.
        :param output: '+vi' for positive vortex indicator or '-vi' for negative.
        """
        self.period = period
        if output not in ['+vi', '-vi']:
            raise ValueError("Vortex output must be '+vi' or '-vi'")
        self.output = output
        col_name = f"Vortex_{output}_{period}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        vortex_df = ta.vortex(df['High'], df['Low'], df['Close'], length=self.period)

        # Define column names from pandas_ta
        plus_vi_col = f'VTXP_{self.period}'
        minus_vi_col = f'VTXM_{self.period}'

        # Cache all components
        if plus_vi_col not in df.columns: df[plus_vi_col] = vortex_df[plus_vi_col]
        if minus_vi_col not in df.columns: df[minus_vi_col] = vortex_df[minus_vi_col]

        # Return the requested output
        if self.output == '+vi': return df[plus_vi_col]
        return df[minus_vi_col]


# ==================================
# 2. The Pydantic Schema
# ==================================
class VortexModel(BaseComponent):
    """
    Vortex Indicator (VI).

    Identifies the start of a new trend and its direction by comparing
    upward and downward movement over a given period.
    """
    type: Literal["Vortex"] = "Vortex"
    period: conint(ge=1) = Field(
        14,
        description="Lookback period for Vortex calculation. Must be ≥ 1."
    )
    output: Literal["+vi", "-vi"] = Field(
        "+vi",
        description="Which Vortex component to return: '+vi' (positive) or '-vi' (negative)."
    )

    def build(self) -> Vortex:
        return Vortex(
            period=self.period,
            output=self.output
        )
