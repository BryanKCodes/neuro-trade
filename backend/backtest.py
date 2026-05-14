import copy
from typing import Dict, Any, List

from data.loader import load_yfinance_data
from strategies.loader import build_strategy_from_model
from simulator import Simulator
from simulator.metrics import calculate_equity_curves, calculate_metrics
from components.trades.long import Long


def _serialize_trades(trades, start_index: int) -> List[Dict[str, Any]]:
    markers = []
    for trade in trades:
        is_long = isinstance(trade, Long)
        rel_entry = trade.entry_i - start_index
        markers.append({
            "index": rel_entry,
            "type": "buy" if is_long else "sell",
            "price": round(float(trade._entry_price), 4),
        })
        if trade.exit_i is not None:
            rel_exit = trade.exit_i - start_index
            markers.append({
                "index": rel_exit,
                "type": "sell" if is_long else "buy",
                "price": round(float(trade._exit_price), 4),
            })
    return sorted(markers, key=lambda m: m["index"])


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
    print(strategy_json)
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

    # 5. Calculate equity curves and metrics
    simple_equity_curve = strategy_simulator.equity_curve
    cash_flows = strategy_simulator.cash_flows

    equity_curves = calculate_equity_curves(
        simple_equity_curve=simple_equity_curve,
        cash_flows=cash_flows,
        interval=interval
    )

    metrics = calculate_metrics(
        strategy_simulator.equity_curve,
        trades=strategy_simulator.trades,
        benchmark_curve=benchmark_simulator.equity_curve,
        interval=interval
    )

    # 6. Slice the df to the simulated window and build price_data + trades
    start = strategy_simulator.start_index
    df_slice = strategy_simulator.df.iloc[start:]
    price_data = [
        {
            "open":  round(float(row.Open),  4),
            "high":  round(float(row.High),  4),
            "low":   round(float(row.Low),   4),
            "close": round(float(row.Close), 4),
        }
        for row in df_slice.itertuples()
    ]

    trades = _serialize_trades(strategy_simulator.trades, start)

    return {
        "equity_curve": equity_curves,
        "benchmark_curve": benchmark_simulator.equity_curve.tolist(),
        "metrics": metrics,
        "price_data": price_data,
        "trades": trades,
    }
