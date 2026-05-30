// ── V2 Types ──────────────────────────────────────────────────────────────────

export type ParamDef = {
  name:    string;
  label:   string;
  dtype:   "int" | "float";
  default: number;
  min_val: number | null;
  max_val: number | null;
};

export type SeriesStyleMeta = {
  key_suffix:  string;
  label:       string;
  color:       string;
  series_type: "line" | "histogram";
  line_width:  number;
  line_style:  "solid" | "dashed";
};

export type IndicatorTypeMeta = {
  type_id:       string;
  label:         string;
  description:   string;
  category:      string;
  pane:          "main" | "sub";
  render_type:   "line" | "band" | "histogram" | "multi_line" | "macd_composite";
  series_styles: SeriesStyleMeta[];
  param_schema:  ParamDef[];
  y_min:         number | null;
  y_max:         number | null;
  ref_lines:     number[];
};

// An active indicator instance on the user's chart.
// Keyed by UUID so multiple instances of the same type are distinct.
export type IndicatorInstance = {
  uuid:    string;                   // crypto.randomUUID()
  type_id: string;                   // "EMA"
  params:  Record<string, number>;   // { period: 50 }
};

// Flat response map: uuid (single-output) or uuid+suffix (multi-output) → values.
// Nulls represent NaN warmup periods, filtered before being passed to lw-charts.
export type IndicatorData = Record<string, (number | null)[]>;

// OHLCV bar from the preview endpoint — aligned with lw-charts bar format.
export type PreviewBar = {
  time:    number;
  open:    number;
  high:    number;
  low:     number;
  close:   number;
  volume?: number;
};

// Convenience lookup: type_id → IndicatorTypeMeta, fetched once on mount.
export type IndicatorCatalogue = Record<string, IndicatorTypeMeta>;

// ── V1 Legacy Type ────────────────────────────────────────────────────────────

export type IndicatorMeta = {
  indicator_id:  string;
  label:         string;
  category:      string;
  pane:          "main" | "sub";
  render_type:   "line" | "band" | "histogram" | "multi_line" | "macd_composite";
  series_styles: SeriesStyleMeta[];
  y_min:         number | null;
  y_max:         number | null;
  ref_lines:     number[];
};
