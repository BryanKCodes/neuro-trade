import pandas as pd
from pydantic import Field
from typing import Literal

from ai import BaseComponent
from components.predicate import Predicate

# --- Forward Reference for recursive models ---
AnyPredicate = "AnyPredicate"


# ==================================
# 1. The Logic Class
# ==================================
class Or(Predicate):
    def __init__(self, predicates: list[Predicate]):
        """
        :param predicates: A list of Predicate objects to evaluate.
        """
        self.predicates = predicates

    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        return any(predicate.condition(i, df, **kwargs) for predicate in self.predicates)


# ==================================
# 2. The Pydantic Schema
# ==================================
class OrModel(BaseComponent):
    """
    Logical OR Predicate.

    Evaluates to True if at least one of the provided Predicate conditions
    is True at the same index.

    Useful for combining alternative signals, e.g.
    "RSI overbought OR MACD crossover".
    """
    type: Literal["Or"] = "Or"
    predicates: list[AnyPredicate] = Field(
        ...,
        description="List of predicate objects; at least one must evaluate to True."
    )

    def build(self) -> Or:
        return Or(
            predicates=[predicate.build() for predicate in self.predicates]
        )
