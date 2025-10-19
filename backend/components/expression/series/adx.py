import pandas as pd
import pandas_ta as ta
from pydantic import Field, conint
from typing import Literal

from ai import BaseComponent
from components.expression.series import Series


# ==================================
# 1. The Logic Class
# ==================================
class ADX(Series):
    def __init__(self, period: int = 14, output: str = "adx") -> None:
        """
        :param period: The lookback period for calculating ADX.
        :param output: Which component to return. Can be 'adx' (trend strength),
                       '+di' (positive directional movement), or '-di' (negative directional movement).
        """
        self.period = period
        if output not in ["adx", "+di", "-di"]:
            raise ValueError("ADX output must be 'adx', '+di', or '-di'")
        self.output = output

        # The column name reflects the specific output series
        col_name = f"ADX_{self.output}_{self.period}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        # Use pandas_ta to get the adx indicator as a DataFrame
        adx_df = ta.adx(df['High'], df['Low'], df['Close'], length=self.period)

        # Define the column names from pandas_ta output
        adx_col = f'ADX_{self.period}'
        plus_di_col = f'DMP_{self.period}'  # +DI is 'DMP' in pandas-ta
        minus_di_col = f'DMN_{self.period}' # -DI is 'DMN' in pandas-ta

        # --- Caching Optimization ---
        # Add all components to the main DataFrame if they don't already exist
        if adx_col not in df.columns:
            df[adx_col] = adx_df[adx_col]
        if plus_di_col not in df.columns:
            df[plus_di_col] = adx_df[plus_di_col]
        if minus_di_col not in df.columns:
            df[minus_di_col] = adx_df[minus_di_col]

        # Return the specific series requested by the 'output' parameter
        if self.output == "adx":
            return df[adx_col]
        elif self.output == "+di":
            return df[plus_di_col]
        else:  # self.output == "-di"
            return df[minus_di_col]


# ==================================
# 2. The Pydantic Schema
# ==================================
class ADXModel(BaseComponent):
    """
    Average Directional Index (ADX) indicator series.

    Calculates the ADX along with the +DI (Positive Directional Indicator)
    and -DI (Negative Directional Indicator) to measure trend strength and direction.
    """
    type: Literal["ADX"] = "ADX"
    period: conint(ge=1) = Field(
        default=14,
        description="Lookback period for ADX. Must be >= 1."
    )
    output: Literal["adx", "+di", "-di"] = Field(
        default="adx",
        description="Which ADX component to output. Can be 'adx' (trend strength), "
                    "'+di' (positive directional movement), or '-di' (negative directional movement)."
    )

    def build(self) -> ADX:
        return ADX(
            period=self.period,
            output=self.output
        )
