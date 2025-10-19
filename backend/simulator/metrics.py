from math import sqrt
import pandas as pd
from components.trades import Trade
from typing import Dict, List, Optional, Union


def calculate_metrics(
        equity_curve: pd.Series,
        trades: List[Trade] = None,
        benchmark_curve: Optional[pd.Series] = None,
        interval: str = "1d"
) -> Dict[str, Dict[str, Union[str, int]]]:
    """
    Calculate performance metrics, auto adjusting for data interval.

    :param equity_curve: Equity curve series.
    :param trades: Executed trades.
    :param benchmark_curve: Optional benchmark equity curve.
    :param interval: Data interval string (e.g. '1d', '1h', '5m')
    :return: Nested dict of metrics.
    """
    returns = equity_curve.pct_change().fillna(0)

    # Determine periods per year based on interval
    if interval == "1d":
        periods_per_year = 252
    elif interval == "1h":
        periods_per_year = 252 * 6.5  # ~6.5 trading hours/day
    elif interval == "5m":
        periods_per_year = 252 * 78  # ~78 5-min bars/day
    else:
        print(f"[WARN] Unrecognized interval '{interval}', defaulting to 252 (daily).")
        periods_per_year = 252

    total_periods = len(equity_curve)

    # Metrics
    cumulative_return = (equity_curve.iloc[-1] / equity_curve.iloc[0]) - 1
    annualized_return = (1 + cumulative_return) ** (periods_per_year / total_periods) - 1
    volatility = returns.std() * sqrt(periods_per_year)
    sharpe = (returns.mean() * periods_per_year) / volatility if volatility != 0 else 0
    max_drawdown = ((equity_curve / equity_curve.cummax()) - 1).min()

    ending_value = equity_curve.iloc[-1]
    trade_count = len(trades) if trades is not None else 0

    # Benchmark
    if benchmark_curve is not None:
        benchmark_return = (benchmark_curve.iloc[-1] / benchmark_curve.iloc[0]) - 1
        benchmark_annualized = (1 + benchmark_return) ** (periods_per_year / len(benchmark_curve)) - 1
        outperformance = cumulative_return - benchmark_return
        benchmark_value = benchmark_curve.iloc[-1]
    else:
        benchmark_return = benchmark_annualized = outperformance = benchmark_value = None

    metrics = {
        "Comparison": {
            "Ending Value": {
                "Strategy": f"${ending_value:,.2f}",
                "Benchmark": f"${benchmark_value:,.2f}" if benchmark_value is not None else "N/A"
            },
            "Cumulative Return": {
                "Strategy": f"{cumulative_return:.2%}",
                "Benchmark": f"{benchmark_return:.2%}" if benchmark_value is not None else "N/A"
            },
            "Annualized Return": {
                "Strategy": f"{annualized_return:.2%}",
                "Benchmark": f"{benchmark_annualized:.2%}" if benchmark_value is not None else "N/A"
            },
            "Outperformance": {
                "Strategy vs Benchmark": f"{outperformance:.2%}" if outperformance is not None else "N/A"
            }
        },
        "Details": {
            "Trades Taken": trade_count,
            "Volatility": f"{volatility:.2%}",
            "Sharpe Ratio": f"{sharpe:.2f}",
            "Max Drawdown": f"{max_drawdown:.2%}"
        }
    }

    return metrics
