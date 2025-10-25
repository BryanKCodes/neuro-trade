# This file acts as the central assembly point for all Pydantic schemas.
# It imports individual component models and composes them into high-level,
# usable schemas for API validation and AI interaction.

from pydantic import Field
from typing import List, Union, Literal

# ===================================================================
# SECTION 1: IMPORT ALL INDIVIDUAL COMPONENT SCHEMAS
# ===================================================================
# By importing the '...Model' from each component file, we make them
# available for assembly into our master Union types.

from ai import BaseComponent
from strategies.rule import Rule
from strategies.strategy import Strategy

# --- Expression Imports ---
# Functions
from components.expression.functions.count import CountModel
from components.expression.functions.filter import FilterModel
from components.expression.functions.static import StaticModel
# Levels
from components.expression.levels.prev import PrevLevelModel
# Operators
from components.expression.operators.add import AddModel
from components.expression.operators.divide import DivideModel
from components.expression.operators.multiply import MultiplyModel
from components.expression.operators.subtract import SubtractModel
# Series (Static Indicators)
from components.expression.series.adx import ADXModel
from components.expression.series.ao import AOModel
from components.expression.series.atr import ATRModel
from components.expression.series.boll import BOLLModel
from components.expression.series.cci import CCIModel
from components.expression.series.dc import DCModel
from components.expression.series.ema import EMAModel
from components.expression.series.fractal import FractalModel
from components.expression.series.ichimoku import IchimokuModel
from components.expression.series.kc import KCModel
from components.expression.series.macd import MACDModel
from components.expression.series.mfi import MFIModel
from components.expression.series.obv import OBVModel
from components.expression.series.price import PriceModel
from components.expression.series.psar import PSARModel
from components.expression.series.rsi import RSIModel
from components.expression.series.sma import SMAModel
from components.expression.series.trend import TrendLineModel
from components.expression.series.vortex import VortexModel
from components.expression.series.willr import WillRModel
from components.expression.series.zigzag import ZigZagModel
# Series (Dynamic)
from components.expression.series.cash import CashModel
# Variables
from components.expression.variables.stop_loss import StopLossModel
from components.expression.variables.take_profit import TakeProfitModel
# Primitives
from components.expression.none import NoneExpressionModel
from components.expression.number import NumberModel

# --- Predicate Imports ---
# Actions
from components.predicate.actions.crossover import CrossoverModel
from components.predicate.actions.delay import DelayModel
from components.predicate.actions.follows import FollowsModel
from components.predicate.actions.repeat import RepeatModel
from components.predicate.actions.sequence import SequenceModel
from components.predicate.actions.shifted import ShiftedModel
from components.predicate.actions.threshold import ThresholdModel
# Booleans
from components.predicate.booleans.false import FalsePredicateModel
from components.predicate.booleans.true import TruePredicateModel
# Logic
from components.predicate.logic.and_ import AndModel
from components.predicate.logic.not_ import NotModel
from components.predicate.logic.or_ import OrModel
# Patterns
from components.predicate.patterns.candlestick.candle import CandleModel
# Signals
from components.predicate.signals.interval import IntervalModel
from components.predicate.signals.peak import PeakModel
from components.predicate.signals.trough import TroughModel
from components.predicate.signals.session import SessionModel
from components.predicate.signals.wick import WickModel

# ===================================================================
# SECTION 2: DEFINE THE MASTER UNION (DISCRIMINATED UNIONS)
# ===================================================================
# These Union types, combined with the 'type' literal in each model,
# allow Pydantic to automatically figure out which schema to use
# when parsing the JSON. This is the core of the validation system.

AnySeries = Union[
    # Dynamic Series
    CashModel,
    # Static Series (Indicators)
    ADXModel, AOModel, ATRModel, BOLLModel, CCIModel, DCModel, EMAModel,
    FractalModel, IchimokuModel, KCModel, MACDModel, MFIModel, OBVModel,
    PriceModel, PSARModel, RSIModel, SMAModel, TrendLineModel, VortexModel,
    WillRModel, ZigZagModel
]

AnyExpression = Union[
    # Operators
    AddModel, SubtractModel, MultiplyModel, DivideModel,
    # Functions & Levels
    CountModel, FilterModel, StaticModel, PrevLevelModel,
    # Primitives
    NoneExpressionModel, NumberModel,
    # Dynamic Variables
    StopLossModel, TakeProfitModel,
    # Include series
    *AnySeries.__args__
]

AnyPredicate = Union[
    # Logic
    AndModel, OrModel, NotModel,
    # Actions
    CrossoverModel, DelayModel, FollowsModel, RepeatModel, SequenceModel,
    ShiftedModel, ThresholdModel,
    # Booleans
    FalsePredicateModel, TruePredicateModel,
    # Patterns
    CandleModel,
    # Signals
    IntervalModel, PeakModel, TroughModel, SessionModel, WickModel
]


# ===================================================================
# SECTION 3: DEFINE THE TOP-LEVEL STRATEGY SCHEMAS
# ===================================================================
# These are the main schemas that the AI will target. They compose all
# the smaller components into a complete, validatable structure.

class RuleModel(BaseComponent[Rule]):
    """A single, self-contained trading rule."""
    trade: Literal["long", "short"]
    filter: AnyPredicate = Field(default_factory=TruePredicateModel)
    entry: AnyPredicate = Field(default_factory=FalsePredicateModel)
    exit: AnyPredicate = Field(default_factory=FalsePredicateModel)
    stop_loss: AnyExpression = Field(default_factory=NoneExpressionModel)
    take_profit: AnyExpression = Field(default_factory=NoneExpressionModel)
    sizing: AnyExpression = Field(default_factory=NoneExpressionModel)

    def build(self) -> Rule:
        return Rule(
            trade=self.trade,
            filter=self.filter.build(),
            entry=self.entry.build(),
            exit=self.exit.build(),
            stop_loss=self.stop_loss.build(),
            take_profit=self.take_profit.build(),
            sizing=self.sizing.build()
        )


class StrategyModel(BaseComponent[Strategy]):
    """The root schema for a complete trading strategy, composed of one or more rules."""
    rules: List[RuleModel]

    def build(self) -> Strategy:
        return Strategy(
            rules=[rule.build() for rule in self.rules]
        )


# ===================================================================
# SECTION 4: REBUILD MODELS TO RESOLVE FORWARD REFERENCES
# ===================================================================
# This is a crucial final step. Pydantic needs to be explicitly told
# to go back and replace all the string forward references (like "AnyExpression")
# with the actual Union types we defined above.

# A helper function to make the rebuilding process cleaner
def rebuild_recursive_models(union_type):
    for model in union_type.__args__:
        # Pydantic models are the ones with a 'model_rebuild' method
        if hasattr(model, 'model_rebuild'):
            model.model_rebuild(
                force=True,
                _types_namespace={
                    "AnyExpression": AnyExpression,
                    "AnyPredicate": AnyPredicate,
                    "AnySeries": AnySeries
                }
            )


rebuild_recursive_models(AnySeries)
rebuild_recursive_models(AnyExpression)
rebuild_recursive_models(AnyPredicate)

# Finally, rebuild the top-level models that use these Unions
RuleModel.model_rebuild(force=True)
StrategyModel.model_rebuild(force=True)
