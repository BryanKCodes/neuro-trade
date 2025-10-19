import pandas as pd
from typing import Literal

from ai import BaseComponent
from components.predicate import Predicate


# ==================================
# 1. The Logic Class
# ==================================
class TruePredicate(Predicate):
    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        return True


# ==================================
# 2. The Pydantic Schema
# ==================================
class TruePredicateModel(BaseComponent):
    """
    Predicate that always returns True (always triggers).
    """
    type: Literal["TruePredicate"] = "TruePredicate"

    def build(self) -> TruePredicate:
        return TruePredicate()
