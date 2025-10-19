import pandas as pd
import pandas_ta as ta
from pydantic import Field, conint, field_validator
from typing import Literal

from ai import BaseComponent
from components.expression.series import Series


# ==================================
# 1. The Logic Class
# ==================================
class AO(Series):
    def __init__(self, fast: int = 5, slow: int = 34):
        """
        :param fast: The period for the fast SMA.
        :param slow: The period for the slow SMA.
        """
        self.fast = fast
        self.slow = slow
        col_name = f"AO_{fast}_{slow}"
        super().__init__(col_name)

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        return ta.ao(df['High'], df['Low'], fast=self.fast, slow=self.slow)


# ==================================
# 2. The Pydantic Schema
# ==================================
class AOModel(BaseComponent):
    """
    Awesome Oscillator (AO).

    Measures market momentum by comparing the difference between two
    Simple Moving Averages (SMAs), typically using median price.
    """
    type: Literal["AO"] = "AO"
    fast: conint(ge=1) = Field(
        5,
        description="Period for the fast SMA. Must be ≥ 1."
    )
    slow: conint(ge=1) = Field(
        34,
        description="Period for the slow SMA. Must be > fast period."
    )

    @classmethod
    @field_validator("slow", mode="after")
    def check_slow_gt_fast(cls, slow, info):
        fast = info.data.get("fast", None)
        if fast is not None and slow <= fast:
            raise ValueError(f"`slow` ({slow}) must be greater than `fast` ({fast})`")
        return slow

    def build(self) -> AO:
        return AO(
            fast=self.fast,
            slow=self.slow
        )
