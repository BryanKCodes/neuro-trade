from strategies.rule import Rule


class Strategy:
    """
    Loads the rules for the strategy from JSON
    """
    def __init__(self, rules: list[Rule]) -> None:
        self.rules = rules
