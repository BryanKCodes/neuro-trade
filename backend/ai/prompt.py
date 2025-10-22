import json
from ai.schemas import StrategyModel, AnyExpression, AnyPredicate


def generate_prompt():
    """
    Generates the complete AI prompt using Pydantic schema information
    """
    # Get the JSON schema and its definitions
    schema = StrategyModel.model_json_schema()
    defs = schema.get("$defs", {})

    # Create sets of expression and predicate model names
    expression_models = {m.__name__ for m in AnyExpression.__args__}
    predicate_models = {m.__name__ for m in AnyPredicate.__args__}

    # ===================================================================
    # 1. Build the prompt header with instructions
    # ===================================================================
    # TODO This is temporary and follows the old version. Not sure how pydantic validation affects this.
    prompt = ["You are an expert trading strategy configuration assistant.\n\n",
              "Your job is to take the user's request for a trading strategy, ",
              "analyze it carefully, and then produce a JSON object that specifies the strategy configuration.\n\n",
              "The JSON you produce will be consumed by an automated backtesting engine. ",
              "It must be **valid JSON**, following these rules:\n\n",
              "- The output is a JSON object with a \"rules\" key containing a list of rule objects\n",
              "- Each rule must have these fields:\n", "    • \"trade\": either \"long\" or \"short\"\n",
              "    • \"filter\": a Predicate block\n",
              "    • \"entry\": a Predicate block that defines when to enter\n",
              "    • \"exit\": a Predicate block that defines when to exit\n",
              "    • \"stop_loss\": an Expression block that calculates the stop loss price\n",
              "    • \"take_profit\": an Expression block that calculates the take profit price\n",
              "    • \"sizing\": an Expression block that controls position sizing\n\n", "### JSON Structure\n\n",
              "Each Predicate or Expression is defined as a JSON object with these properties:\n",
              "  - \"type\": the name of the component (MUST match exactly)\n",
              "  - Component-specific parameters as direct properties\n\n", "Example of an Add expression:\n", "{\n",
              "  \"type\": \"Add\",\n", "  \"left\": { ... nested expression ... },\n",
              "  \"right\": { ... nested expression ... }\n", "}\n\n", "### Strict constraints\n",
              "- Only use the available components listed below. \n", "- Never invent new components or parameters.\n",
              "- Always return valid JSON. Do not explain or output anything except the JSON.\n\n",
              "### Available Components\n", "\n===== EXPRESSION COMPONENTS =====\n\n"]

    # ===================================================================
    # 2. Add Expression Components Section
    # ===================================================================
    for model_name, model_def in defs.items():
        if model_name not in expression_models:
            continue

        # Get display name by removing "Model" suffix
        display_name = model_name[:-5] if model_name.endswith("Model") else model_name
        description = " ".join(model_def.get("description", "No description.").split())

        # Skip the "type" literal in parameters
        properties = {
            k: v for k, v in model_def.get("properties", {}).items()
            if k != "type"
        }

        comp_prompt = [
            f"Component: {display_name}",
            f"Description: {' '.join(description.split())}",
            f"Parameters: {'No Parameters.' if not properties else ''}"
        ]

        for prop_name, prop_def in properties.items():
            prop_type = prop_def.get("type", "object")
            prop_desc = prop_def.get("description", "No description available.")
            comp_prompt.append(f"  • {prop_name} ({prop_type}): {prop_desc}")

        comp_prompt.append("\n")  # Empty line for spacing
        prompt.append("\n".join(comp_prompt))

    # ===================================================================
    # 3. Add Predicate Components Section
    # ===================================================================
    prompt.append("\n===== PREDICATE COMPONENTS =====\n\n")
    for model_name, model_def in defs.items():
        if model_name not in predicate_models:
            continue

        # Get display name by removing "Model" suffix
        display_name = model_name[:-5] if model_name.endswith("Model") else model_name
        description = " ".join(model_def.get("description", "No description.").split())

        # Skip the "type" literal in parameters
        properties = {
            k: v for k, v in model_def.get("properties", {}).items()
            if k != "type"
        }

        comp_prompt = [
            f"Component: {display_name}",
            f"Description: {description}",
            f"Parameters: {'No Parameters.' if not properties else ''}"
        ]

        for prop_name, prop_def in properties.items():
            prop_type = prop_def.get("type", "object")
            prop_desc = prop_def.get("description", "No description available.")
            comp_prompt.append(f"  • {prop_name} ({prop_type}): {prop_desc}")

        comp_prompt.append("\n")  # Empty line for spacing
        prompt.append("\n".join(comp_prompt))

    # ===================================================================
    # 4. Add Example Strategy
    # ===================================================================
    with open('strategies/json/sample.json', 'r') as file:
        example = json.load(file)

    prompt.append("\n### Example JSON Strategy\n")
    prompt.append(json.dumps(example, indent=2))

    return "".join(prompt)


if __name__ == "__main__":
    print(generate_prompt())


