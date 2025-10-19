import copy

from data.loader import load_yfinance_data
from strategies.loader import load_schema_from_file, build_strategy_from_model
from simulator import Simulator
from simulator.metrics import calculate_metrics

asset = 'SPY'
duration = 365
interval = '1d'
initial_cash = 100_000


def main() -> None:
    """Main entry point to run old strategy backtest."""
    # 1. Load data
    df = load_yfinance_data(asset, interval)

    # 2. Load strategy class dynamically
    strategy = build_strategy_from_model(load_schema_from_file('sample'))
    benchmark = build_strategy_from_model(load_schema_from_file('buy_and_hold'))

    # 3. Create simulators for each strategy
    strategy_simulator = Simulator(strategy, copy.deepcopy(df), initial_cash, duration)
    benchmark_simulator = Simulator(benchmark, copy.deepcopy(df), initial_cash, duration)

    # 4. Run the simulators
    strategy_simulator.run()
    benchmark_simulator.run()

    # 5. Calculate metrics
    metrics = calculate_metrics(
        strategy_simulator.equity_curve,
        trades=strategy_simulator.trades,
        benchmark_curve=benchmark_simulator.equity_curve,
        interval=interval
    )

    import json
    data = {
        "equity_curve": strategy_simulator.equity_curve.tolist(),
        "benchmark_curve": benchmark_simulator.equity_curve.tolist(),
        "metrics": metrics
    }

    # Write to file
    with open("./data.json", "w") as file:
        json.dump(data, file, indent=4)

    # 6. Print results
    print("\n--- Performance Metrics ---")
    print("Comparison:")
    for key, vals in metrics["Comparison"].items():
        if isinstance(vals, dict):
            if key == "Outperformance":
                for subkey, subval in vals.items():
                    print(f"  {key}: {subval}")
            else:
                print(
                    f"  {key}: Strategy = {vals.get('Strategy')}, Benchmark = {vals.get('Benchmark', vals.get('Strategy'))}")
        else:
            print(f"  {key}: {vals}")

    print("\nDetails:")
    for key, val in metrics["Details"].items():
        print(f"  {key}: {val}")

    # 7. Plot trades
    # plot_trades(results_df, simulator.trades)


if __name__ == "__main__":
    main()
