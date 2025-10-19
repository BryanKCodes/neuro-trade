import json
from pathlib import Path
from ai.schemas import StrategyModel
from strategies.strategy import Strategy


def build_strategy_from_model(json_schema: dict) -> Strategy:
    """
    Validates the AI provided JSON Schema and converts the Pydantic StrategyModel into a runnable,
    Strategy object with all its logic components for backtesting
    :param json_schema: The AI produces JSON Schema dictionary
    :return: The runnable Strategy object for backtesting in the simulator
    """
    strategy_model = StrategyModel.model_validate(json_schema)
    return strategy_model.build()
