import pandas as pd
from pydantic import Field
from typing import Literal, TYPE_CHECKING

from ai import BaseComponent
from components.expression import Expression
from components.predicate import Predicate

# --- Forward Reference for recursive models ---
if TYPE_CHECKING:
    from ai.schemas import AnyExpression


# ==================================
# 1. The Logic Class
# ==================================
class Threshold(Predicate):
    def __init__(self, below: Expression, above: Expression):
        """
        :param below: The Expression expected to be lower.
        :param above: The Expression expected to be higher.
        """
        self.below = below
        self.above = above

    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        val1 = self.below.calculate(i, df)
        val2 = self.above.calculate(i, df)
        if val1 is None or val2 is None:
            return False
        return val1 < val2


# ==================================
# 2. The Pydantic Schema
# ==================================
class ThresholdModel(BaseComponent):
    """
    Predicate that always triggers when one expression is strictly below another, such as "RSI < 30"
    or "Price < Moving Average". Useful for threshold-based triggers.

    Evaluated as: `below < above`
    Note: Crossover fires only at the crossing point while Threshold fires as long as below < above
    """
    type: Literal["Threshold"] = "Threshold"
    below: "AnyExpression" = Field(
        ...,
        description="Expression that must be lower (e.g. RSI)."
    )
    above: "AnyExpression" = Field(
        ...,
        description="Expression that must be higher (e.g. threshold or MA)."
    )

    def build(self) -> Threshold:
        return Threshold(
            below=self.below.build(),
            above=self.above.build()
        )
