import json
from pathlib import Path
from ai.schemas import StrategyModel
from strategies.strategy import Strategy


def load_schema_from_file(strategy_name: str) -> dict:
    """
    Loads a JSON file containing strategy configuration.

    :param strategy_name: Name of the JSON file in strategies/json.
    :return: Parsed Python dictionary.
    """
    json_path = f"./strategies/json/{strategy_name}.json"
    path = Path(json_path)
    if not path.exists():
        raise FileNotFoundError(f"Strategy JSON file not found at: {json_path}")

    with open(path, 'r') as f:
        config = json.load(f)
    return config


def build_strategy_from_model(json_schema: dict) -> Strategy:
    """
    Validates the AI provided JSON Schema and converts the Pydantic StrategyModel into a runnable,
    Strategy object with all its logic components for backtesting
    :param json_schema: The AI produces JSON Schema dictionary
    :return: The runnable Strategy object for backtesting in the simulator
    """
    strategy_model = StrategyModel.model_validate(json_schema)
    return strategy_model.build()
