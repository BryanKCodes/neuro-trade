from __future__ import annotations

import pandas as pd
from pydantic import Field
from typing import List, Literal, TYPE_CHECKING

from ai import BaseComponent
from components.expression import Expression
from components.predicate import Predicate

# --- Forward Reference for recursive models ---
if TYPE_CHECKING:
    from ai.schemas import AnyPredicate


# ==================================
# 1. The Logic Class
# ==================================
class Count(Expression):
    def __init__(self, predicates: List[Predicate]):
        """
        :param predicates: The list of predicates for counting.
        """
        self.predicates = predicates

    def calculate(self, i: int, df: pd.DataFrame, **kwargs) -> float:
        count = 0
        for p in self.predicates:
            if p.condition(i, df, **kwargs):
                count += 1
        return float(count)


# ==================================
# 2. The Pydantic Schema
# ==================================
class CountModel(BaseComponent):
    """
    Expression that evaluates multiple predicates and returns
    the number of predicates that are true at the current index.

    Example use case:
        Count([condition1, condition2, condition3])
    returns 2.0 if two of the conditions are true at the given index.

    This can be combined with Multiply or other Expressions
    to dynamically scale risk based on number of confluences.
    """
    type: Literal["Count"] = "Count"
    predicates: List[AnyPredicate] = Field(
        ...,
        description=(
            "List of predicates to evaluate. Each predicate is checked "
            "at the current index and contributes 1 to the count if it returns True. "
            "The total count is returned as a float."
        )
    )

    def build(self) -> Count:
        return Count(
            predicates=[predicate.build() for predicate in self.predicates]
        )
