import pandas as pd
import pandas_ta as ta
from pydantic import Field, conint
from typing import Literal

from ai import BaseComponent
from components.expression.series import Series


# ==================================
# 1. The Logic Class
# ==================================
class DC(Series):
    def __init__(self, period: int = 20, output: str = "mid"):
        """
        :param period: The period length for the channel calculation.
        :param output: Which band to return: 'upper', 'mid', or 'lower'.
        """
        self.period = period
        if output not in ['upper', 'mid', 'lower']:
            raise ValueError("DC output must be 'upper', 'mid', or 'lower'")
        self.output = output
        col_name = f"DC_{output}_{period}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        dc_df = ta.donchian(df['High'], df['Low'], lower_length=self.period, upper_length=self.period)

        # Define column names from pandas_ta
        upper_col = f'DCU_{self.period}_{self.period}'
        mid_col = f'DCM_{self.period}_{self.period}'
        lower_col = f'DCL_{self.period}_{self.period}'

        # Cache all components
        if upper_col not in df.columns:
            df[upper_col] = dc_df[upper_col]
        if mid_col not in df.columns:
            df[mid_col] = dc_df[mid_col]
        if lower_col not in df.columns:
            df[lower_col] = dc_df[lower_col]

        # Return the requested output
        if self.output == 'upper':
            return df[upper_col]
        if self.output == 'mid':
            return df[mid_col]
        return df[lower_col]


# ==================================
# 2. The Pydantic Schema
# ==================================
class DCModel(BaseComponent):
    """
    Donchian Channels (DC).

    Plots upper, middle, and lower bands formed by the highest high and lowest low
    over a specified period, often used to identify breakouts.
    """
    type: Literal["DC"] = "DC"
    period: conint(ge=1) = Field(
        20,
        description="Length of look-back window. Must be ≥ 1."
    )
    output: Literal["upper", "mid", "lower"] = Field(
        "mid",
        description="Which channel line to return: 'upper', 'mid', or 'lower'. Defaults to 'mid'"
    )

    def build(self) -> DC:
        return DC(
            period=self.period,
            output=self.output
        )

