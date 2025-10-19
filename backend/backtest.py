import copy
from typing import Dict, Any

from data.loader import load_yfinance_data
from strategies.loader import build_strategy_from_model
from simulator import Simulator
from simulator.metrics import calculate_metrics


def run_backtest(
    strategy_json: Dict[str, Any],
    benchmark_json: Dict[str, Any],
    asset: str,
    duration: int,
    interval: str,
    initial_cash: float
) -> Dict[str, Any]:
    """
    Run a backtest for a strategy and benchmark and return metrics + equity curves.
    """
    # 1. Load data
    df = load_yfinance_data(asset, interval)

    # 2. Build strategies from JSON DSL
    strategy = build_strategy_from_model(strategy_json)
    benchmark = build_strategy_from_model(benchmark_json)

    # 3. Create simulators
    strategy_simulator = Simulator(strategy, copy.deepcopy(df), initial_cash, duration)
    benchmark_simulator = Simulator(benchmark, copy.deepcopy(df), initial_cash, duration)

    # 4. Run simulation
    strategy_simulator.run()
    benchmark_simulator.run()

    # 5. Calculate metrics
    metrics = calculate_metrics(
        strategy_simulator.equity_curve,
        trades=strategy_simulator.trades,
        benchmark_curve=benchmark_simulator.equity_curve,
        interval=interval
    )

    # 6. Return as dict
    return {
        "equity_curve": strategy_simulator.equity_curve.tolist(),
        "benchmark_curve": benchmark_simulator.equity_curve.tolist(),
        "metrics": metrics
    }
