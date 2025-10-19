import pandas as pd
import pandas_ta as ta
from pydantic import Field
from typing import Literal

from ai import BaseComponent
from components.expression.series import Series


# ==================================
# 1. The Logic Class
# ==================================
class Ichimoku(Series):
    def __init__(self, tenkan: int = 9, kijun: int = 26, senkou: int = 52, output: str = "tenkan") -> None:
        """
        :param tenkan: The Tenkan-sen period.
        :param kijun: The Kijun-sen period.
        :param senkou: The Senkou Span B period.
        :param output: Desired line to output. Can be 'tenkan', 'kijun', 'span_a', 'span_b', or 'chikou'.
        """
        self.tenkan_period = tenkan
        self.kijun_period = kijun
        self.senkou_period = senkou
        self.output_map = {
            "tenkan": f"ITS_{tenkan}",
            "kijun": f"IKS_{kijun}",
            "span_a": f"ISA_{tenkan}_{kijun}",
            "span_b": f"ISB_{kijun}_{senkou}",
            "chikou": f"ICS_{kijun}",
        }
        if output not in self.output_map:
            raise ValueError(f"Ichimoku output must be one of {list(self.output_map.keys())}")
        self.output = output
        super().__init__(f"Ichimoku_{output}")

    def calculator(self, df: pd.DataFrame) -> pd.Series:
        ichi_df = ta.ichimoku(df['High'], df['Low'], df['Close'],
                              tenkan=self.tenkan_period,
                              kijun=self.kijun_period,
                              senkou=self.senkou_period)[0]  # [0] because it returns a tuple (df, df_info)

        # Cache all components
        for key, col_name in self.output_map.items():
            if col_name not in df.columns:
                df[col_name] = ichi_df[col_name]

        # Return the requested output
        return df[self.output_map[self.output]]


# ==================================
# 2. The Pydantic Schema
# ==================================
class IchimokuModel(BaseComponent):
    """
    Ichimoku Cloud indicator.

    Outputs one of its five components: Tenkan-sen, Kijun-sen, Senkou Span A,
    Senkou Span B, or Chikou Span, used to identify support, resistance,
    and trend direction.
    """
    type: Literal["Ichimoku"] = "Ichimoku"
    tenkan: int = Field(
        9,
        ge=1,
        description="Tenkan-sen period. Must be ≥ 1."
    )
    kijun: int = Field(
        26,
        ge=1,
        description="Kijun-sen period. Must be ≥ 1."
    )
    senkou: int = Field(
        52,
        ge=1,
        description="Senkou Span B period. Must be ≥ 1."
    )
    output: Literal["tenkan", "kijun", "span_a", "span_b", "chikou"] = Field(
        ...,
        description=(
            "Which Ichimoku line to output: 'tenkan', 'kijun', "
            "'span_a', 'span_b', or 'chikou'."
        )
    )

    def build(self) -> Ichimoku:
        return Ichimoku(
            tenkan=self.tenkan,
            kijun=self.kijun,
            senkou=self.senkou,
            output=self.output
        )

