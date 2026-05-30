export type SeriesStyleMeta = {
  key_suffix:  string;
  label:       string;
  color:       string;
  series_type: "line" | "histogram";
  line_width:  number;
  line_style:  "solid" | "dashed";
};

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

// Flat map of response_key → values aligned to bars.
// Nulls are NaN warmup periods, filtered before being passed to lw-charts.
export type IndicatorData = Record<string, (number | null)[]>;
