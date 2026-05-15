from datetime import datetime
from math import sqrt
import pandas as pd
from pyxirr import xirr
from components.trades import Trade
from typing import Dict, List, Optional, Tuple, Union

# ==============================================================================
# Private Helper Functions
# ==============================================================================

def _calculate_periods_per_year(interval: str) -> int:
    """Determines the number of periods per year based on data interval."""
    if interval == "1d":
        return 252  # Trading days in a year
    elif interval == "1h":
        return int(252 * 6.5)  # ~6.5 trading hours/day
    elif interval == "5m":
        return 252 * 78  # ~78 5-min intervals/day
    else:
        return 252  # Default to daily if unknown
    

def _calculate_xirr(cash_flows: List[Tuple[datetime, float]]) -> Optional[float]:
    """Calculates the internal rate of return (XIRR) using the py-xirr library."""
    if not cash_flows or len(cash_flows) < 2:
        return None
    try:
        # Separate dates and values for the xirr function
        dates = [cf[0] for cf in cash_flows]
        values = [cf[1] for cf in cash_flows]
        
        # Ensure there's at least one positive and one negative flow
        if not any(v > 0 for v in values) or not any(v < 0 for v in values):
            return None

        rate = xirr(dates, values)
        return float(rate) if pd.notna(rate) else None
        
    except Exception:
        # Catches potential errors if calculation fails
        return None

def _generate_mwr_curve(
    rate: float,
    periods: int,
    periods_per_year: int,
    initial_value: float
) -> pd.Series:
    """Generates a smooth equity curve growing at a constant annualized rate."""
    periodic_rate = (1 + rate)**(1 / periods_per_year) - 1
    growth_factors = [(1 + periodic_rate)**i for i in range(periods)]
    return pd.Series(growth_factors) * initial_value


# ==============================================================================
# Public API Functions
# ==============================================================================

def calculate_equity_curves(
    simple_equity_curve: pd.Series,
    cash_flows: List[Tuple[datetime, float]],
    interval: str = "1d"
) -> Dict[str, List[float]]:
    """
    Generates a dictionary of simple, time-weighted, and money-weighted equity curves.
    """
    if simple_equity_curve.empty:
        return {"simple": [], "time_weighted": [], "money_weighted": []}

    initial_value = simple_equity_curve.iloc[0]

    # 1. Simple Equity Curve
    simple_curve = simple_equity_curve.copy()

    # 2. Time-Weighted Curve (normalized to show growth of $1)
    time_weighted_curve = simple_curve / initial_value

    # 3. Money-Weighted Curve (hypothetical curve based on MWRR)
    periods_per_year = _calculate_periods_per_year(interval)

    mwr_rate = _calculate_xirr(cash_flows)
    if mwr_rate is not None:
        money_weighted_curve = _generate_mwr_curve(
            mwr_rate, len(simple_curve), periods_per_year, initial_value
        )
    else:
        money_weighted_curve = pd.Series([initial_value] * len(simple_curve))

    return {
        "simple": simple_curve.tolist(),
        "time_weighted": time_weighted_curve.tolist(),
        "money_weighted": money_weighted_curve.tolist()
    }


def calculate_metrics(
        equity_curve: pd.Series,
        trades: Optional[List[Trade]] = None,
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

    periods_per_year = _calculate_periods_per_year(interval)
    total_periods = len(equity_curve)

    # Metrics
    cumulative_return = (equity_curve.iloc[-1] / equity_curve.iloc[0]) - 1
    annualized_return = (1 + cumulative_return) ** (periods_per_year / total_periods) - 1
    volatility = returns.std() * sqrt(periods_per_year)
    sharpe = (returns.mean() * periods_per_year) / volatility if volatility != 0 else 0
    max_drawdown = ((equity_curve / equity_curve.cummax()) - 1).min()

    ending_value = equity_curve.iloc[-1]
    trade_count = len(trades) if trades is not None else 0

    # Win rate — only count closed trades; open trades have no realised PnL yet.
    closed_trades = [t for t in trades if not t.is_open] if trades else []
    if closed_trades:
        winners = sum(1 for t in closed_trades if (t.pnl() or 0) > 0)
        win_rate: Optional[float] = winners / len(closed_trades)
    else:
        win_rate = None

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
            }
        },
        "Details": {
            "Trades Taken": trade_count,
            "Win Rate": f"{win_rate:.1%}" if win_rate is not None else "N/A",
            "Outperformance": f"{outperformance:.2%}" if outperformance is not None else "N/A",
            "Volatility": f"{volatility:.2%}",
            "Sharpe Ratio": f"{sharpe:.2f}",
            "Max Drawdown": f"{max_drawdown:.2%}"
        }
    }

    return metrics
