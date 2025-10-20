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
class And(Predicate):
    def __init__(self, predicates: list[Predicate]):
        """
        :param predicates: A list of Predicate objects to evaluate together.
        """
        self.predicates = predicates

    def condition(self, i: int, df: pd.DataFrame, **kwargs) -> bool:
        return all(predicate.condition(i, df, **kwargs) for predicate in self.predicates)


# ==================================
# 2. The Pydantic Schema
# ==================================
class AndModel(BaseComponent):
    """
    Logical AND Predicate.

    Evaluates to True only if all provided Predicate conditions
    are True at the same index.

    Useful for combining multiple signals that must all align,
    such as "RSI is overbought AND price above EMA".
    """
    type: Literal["And"] = "And"
    predicates: list["AnyPredicate"] = Field(
        ...,
        description="List of predicate objects that must all evaluate to True."
    )

    def build(self) -> And:
        return And(
            predicates=[predicate.build() for predicate in self.predicates]
        )
