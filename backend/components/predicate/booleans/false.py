import pandas as pd
from typing import Literal

from ai import BaseComponent
from components.predicate import Predicate


# ==================================
# 1. The Logic Class
# ==================================
class FalsePredicate(Predicate):
    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        return False


# ==================================
# 2. The Pydantic Schema
# ==================================
class FalsePredicateModel(BaseComponent):
    """
    Predicate that always returns False (never triggers).
    """
    type: Literal["FalsePredicate"] = "FalsePredicate"

    def build(self) -> FalsePredicate:
        return FalsePredicate()
