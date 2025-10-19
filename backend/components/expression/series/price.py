import pandas as pd
from pydantic import Field
from typing import Literal

from ai import BaseComponent
from components.expression.series import Series


class Price(Series):
    def __init__(self, output: str = "close"):
        """
        :param output: Which price to return: 'close', 'open', 'high', or 'low'.
        """
        if output not in ["close", "open", "high", "low"]:
            raise ValueError("Price output must be 'close', 'open', 'high', or 'low'")
        self.output = output
        super().__init__(output.capitalize())

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        return df[self.output.capitalize()]


# ==================================
# 2. The Pydantic Schema
# ==================================
class PriceModel(BaseComponent):
    """
    Price Series.

    Represents a raw price stream from the OHLCV data from the dataframe.
    """
    type: Literal["Price"] = "Price"
    output: Literal["close", "open", "high", "low"] = Field(
        "close",
        description="Price type to return. One of: 'close', 'open', 'high', or 'low'."
    )

    def build(self) -> Price:
        return Price(
            output=self.output
        )
