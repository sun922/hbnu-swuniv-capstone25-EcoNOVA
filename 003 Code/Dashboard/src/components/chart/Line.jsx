import ReactECharts from "echarts-for-react";

export default function Line({
  title = "",
  xData = [],
  series = [],
  colors,
  yMin,
  yMax,
  bands = null,
  warnPoints = [],
  visualPieces = [],
  areaBands = [],
  showLegend = true,
  showTitle = true,
}) {
  const colorArray = Array.isArray(colors)
    ? colors
    : Array.isArray(series)
      ? series.map(s => (colors && colors[s.name]) || "var(--gray-600)")
      : "var(--gray-600)";

  const bandUpDown = (() => {
    if (!bands) return null;
    if ("target" in bands && "band" in bands) {
      return { up: bands.target + bands.band, down: bands.target - bands.band };
    }
    if ("up" in bands && "down" in bands) return bands;
    return null;
  })();

  const markPointData = warnPoints
    .map(p => (p?.x != null && p?.y != null ? { xAxis: p.x, yAxis: p.y } : null))
    .filter(Boolean);

  const areaBandsData = areaBands?.length
    ? areaBands.map(b => ([
        { yAxis: b.from, itemStyle: { color: b.color } },
        { yAxis: b.to }
      ]))
    : [];

  const calculateYRange = () => {
    if (yMin !== undefined && yMax !== undefined) {
      return { min: yMin, max: yMax };
    }
    
    const allValues = series.flatMap(s => s.data || []).filter(val => typeof val === 'number' && !isNaN(val));
    
    if (allValues.length === 0) {
      return { min: 0, max: 100 };
    }
    
    const dataMin = Math.min(...allValues);
    const dataMax = Math.max(...allValues);
    const range = dataMax - dataMin;
    const padding = range * 0.1;
    
    return {
      min: dataMin - padding,
      max: dataMax + padding
    };
  };

  const yRange = calculateYRange();

  const option = {
    title: {
      text: title,
      textStyle: { color: "#121212", fontSize: 16, fontWeight: 500 },
    },
    tooltip: { trigger: "axis" },
    legend: showLegend ? { 
      top: 24, 
      right: 0, 
      textStyle: { color: "#ccc" } 
    } : undefined,
    grid: { left: "6%", right: "7%", top: showLegend ? 54 : 36, bottom: 36 },
    xAxis: {
      type: "category",
      data: xData,
      axisLabel: { color: "#aaa" },
      axisLine: { lineStyle: { color: "rgba(218 218 218 / 0.44)" } },
    },
    yAxis: {
      type: "value",
      min: yRange.min,
      max: yRange.max,
      axisLabel: { color: "#aaa" },
      splitLine: { lineStyle: { color: "rgba(218 218 218 / 0.44)" } },
    },
    color: colorArray,

    visualMap: visualPieces?.length
      ? {
          show: false,
          type: "piecewise",
          dimension: 1,
          pieces: visualPieces,
          seriesIndex: 0,
        }
      : undefined,
    series: series.map((s, idx) => ({
      name: s.name,
      type: "line",
      data: s.data,
      smooth: false,
      showSymbol: false,
      lineStyle: {
        width: 2,
        color: Array.isArray(colors) ? undefined : colors?.[s.name],
      },
      markPoint:
        idx === 0 && markPointData.length
          ? {
              symbol: "circle",
              symbolSize: 10,
              itemStyle: { color: "#FF5252", borderColor: "#fff", borderWidth: 2 },
              label: { show: false },
              data: markPointData,
            }
          : undefined,
    })),
  };

  if (bandUpDown && option.series.length > 0) {
    option.series[0].markLine = {
      symbol: "none",
      lineStyle: { type: "dashed", color: "#88888861" },
      data: [{ yAxis: bandUpDown.up, name: "UpBand" }, { yAxis: bandUpDown.down, name: "DownBand" }],
    };
    option.series[0].markArea = option.series[0].markArea || {};
    option.series[0].markArea.silent = true;
    option.series[0].markArea.data = (option.series[0].markArea.data || []).concat([[
      { xAxis: "min", yAxis: bandUpDown.down, itemStyle: { color: "rgba(197 197 197 / 0.27)" } },
      { xAxis: "max", yAxis: bandUpDown.up },
    ]]);
  }

  if (areaBandsData.length && option.series.length > 0) {
    option.series[0].markArea = option.series[0].markArea || {};
    option.series[0].markArea.silent = true;
    option.series[0].markArea.data = (option.series[0].markArea.data || []).concat(areaBandsData);
  }

  const hasData = series.length > 0 && series.some(s => 
    Array.isArray(s.data) && s.data.length > 0 && s.data.some(val => val != null)
  );

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, width: '100%', height: '100%' }}>
        {hasData ? (
          <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
        ) : (
          <div style={{
            flex: 1,
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#8a8f98',
            fontSize: '14px'
          }}>
            데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
