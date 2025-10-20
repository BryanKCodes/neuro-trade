import pandas as pd
from pydantic import Field
from typing import Literal, TYPE_CHECKING

from ai import BaseComponent
from components.predicate import Predicate

# --- Forward Reference for recursive models ---
if TYPE_CHECKING:
    from ai.schemas import AnyPredicate


# ==================================
# 1. The Logic Class
# ==================================
class Not(Predicate):
    def __init__(self, predicate: Predicate):
        """
        :param predicate: A single Predicate to invert.
        """
        self.predicate = predicate

    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        return not self.predicate.condition(i, df, **kwargs)


# ==================================
# 2. The Pydantic Schema
# ==================================
class NotModel(BaseComponent):
    """
    Logical NOT Predicate.

    Evaluates to True if the given Predicate condition is False,
    and False if the condition is True.

    Useful for negating signals like
    "NOT price below SMA".
    """
    type: Literal["Not"] = "Not"
    predicate: "AnyPredicate" = Field(
        ...,
        description="A single predicate to negate."
    )

    def build(self) -> Not:
        return Not(
            predicate=self.predicate.build()
        )
