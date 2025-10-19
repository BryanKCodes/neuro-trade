import pandas as pd
from typing import Literal

from ai import BaseComponent
from components.predicate import Predicate


# ==================================
# 1. The Logic Class
# ==================================
class NonePredicate(Predicate):
    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> None:
        return None


# ==================================
# 2. The Pydantic Schema
# ==================================
class NonePredicateModel(BaseComponent):
    """
    Predicate that always returns None (undefined condition).
    """
    type: Literal["NonePredicate"] = "NonePredicate"

    def build(self) -> NonePredicate:
        return NonePredicate()
