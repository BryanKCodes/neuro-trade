import pandas as pd
from pydantic import Field, conint
from typing import Literal

from ai import BaseComponent
from components.predicate import Predicate

# --- Forward Reference for recursive models ---
AnyPredicate = "AnyPredicate"


# ==================================
# 1. The Logic Class
# ==================================
class Shifted(Predicate):
    def __init__(self, predicate: Predicate, shift: int = 5) -> None:
        """
        :param predicate: The Predicate to evaluate in the past.
        :param shift: How many bars back to look.
        """

        self.predicate = predicate
        self.shift = shift

    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        if i < self.shift:
            return False
        return self.predicate.condition(i - self.shift, df, **kwargs)


# ==================================
# 2. The Pydantic Schema
# ==================================
class ShiftedModel(BaseComponent):
    """
    Shifts the evaluation of a predicate back in time by a fixed number of bars.
    Often used to detect if a condition was true N bars ago.

    Example: "Was RSI overbought 5 bars ago?"
    """
    type: Literal["Shifted"] = "Shifted"
    predicate: "AnyPredicate" = Field(
        ...,
        description="Predicate to evaluate in the past."
    )
    shift: conint(ge=1) = Field(
        5,
        description="Number of bars to shift backward. Must be ≥ 1."
    )

    def build(self) -> Shifted:
        return Shifted(
            predicate=self.predicate.build(),
            shift=self.shift
        )