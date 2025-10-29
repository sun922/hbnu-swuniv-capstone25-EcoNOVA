import ReactECharts from "echarts-for-react";

export default function LineChart({
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
    if ("ref" in bands && "upper" in bands && "lower" in bands) {
      return { ref: bands.ref, upper: bands.upper, lower: bands.lower };
    }
    if ("target" in bands && "band" in bands) {
      return { ref: bands.target, upper: bands.target + bands.band, lower: bands.target - bands.band };
    }
    if ("up" in bands && "down" in bands) return { ref: bands.up, upper: bands.up, lower: bands.down };
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
    tooltip: { 
      trigger: "axis",
      formatter: function(params) {
        let result = params[0].name + '<br/>';
        params.forEach(function(item) {
          if (item.seriesName === '현재 공정') {
            result += item.marker + item.seriesName + ': ' + Number(item.value).toFixed(2) + '<br/>';
          } else {
            result += item.marker + item.seriesName + ': ' + Number(item.value).toFixed(2) + '<br/>';
          }
        });
        return result;
      }
    },
    legend: showLegend ? { 
      top: 24, 
      right: 0, 
      textStyle: { color: "#A0A0A0" } 
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
      axisLabel: { 
        color: "#aaa",
        formatter: function(value) {
          return Number(value).toFixed(2);
        }
      },
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
        width: 3,
        color: Array.isArray(colors) ? undefined : colors?.[s.name],
      },
      areaStyle: visualPieces?.length ? {
        opacity: 0.1
        } : undefined,
      markPoint:
        idx === 0 && markPointData.length
          ? {
              symbol: "circle",
              symbolSize: 8,
              itemStyle: { color: "rgb(250, 19, 19)" }, 
              label: { show: false },
              data: markPointData,
            }
          : undefined,
    })),
  };

  if (bandUpDown && option.series.length > 0) {
    const currentProcessIndex = option.series.length - 1;
    
    const yRange = calculateYRange();
    const yMin = yRange.min;
    const yMax = yRange.max;
    
    const ref = Number(bandUpDown.ref) || 0;
    const upper = Number(bandUpDown.upper) || 0;
    const lower = Number(bandUpDown.lower) || 0;
    
    const isValidNumber = (val) => !isNaN(val) && isFinite(val);
    
    const safeUpper = isValidNumber(upper) ? Math.max(yMin, Math.min(yMax, upper)) : yMax;
    const safeLower = isValidNumber(lower) ? Math.max(yMin, Math.min(yMax, lower)) : yMin;
    
    const finalUpper = Math.max(safeUpper, safeLower);
    const finalLower = Math.min(safeLower, safeUpper);
    
    option.series[currentProcessIndex].markLine = {
      symbol: "none",
      lineStyle: { type: "dashed", color: "#c4c4c4" },
      label: {
        show: true,
        position: "end",
        formatter: function(params) {
          return Number(params.data.yAxis).toFixed(2);
        },
        textStyle: {
          color: "#666",
          fontSize: 12,
          textShadowColor: "transparent",
          textShadowBlur: 0,
          textShadowOffsetX: 0,
          textShadowOffsetY: 0,
          textBorderColor: "transparent",
          textBorderWidth: 0
        }
      },
      data: [
        { yAxis: finalUpper, name: "Upper", lineStyle: { type: "dashed", color: "#B5B5B5" } },
        { yAxis: finalLower, name: "Lower", lineStyle: { type: "dashed", color: "#B5B5B5" } }
      ],
      silent: true,
    };
    
    option.series[currentProcessIndex].markArea = option.series[currentProcessIndex].markArea || {};
    option.series[currentProcessIndex].markArea.silent = true;
    option.series[currentProcessIndex].markArea.data = (option.series[currentProcessIndex].markArea.data || []).concat([[
      { 
        xAxis: "min", 
        yAxis: finalLower
      },
      { 
        xAxis: "max", 
        yAxis: finalUpper,
        itemStyle: { 
          color: "rgba(70, 70, 70, 0.15)",
          borderColor: "transparent"
        }
      },
    ]]);
  }

  if (areaBandsData.length && option.series.length > 0) {
    const currentProcessIndex = option.series.length - 1;
    option.series[currentProcessIndex].markArea = option.series[currentProcessIndex].markArea || {};
    option.series[currentProcessIndex].markArea.silent = true;
    option.series[currentProcessIndex].markArea.data = (option.series[currentProcessIndex].markArea.data || []).concat(areaBandsData);
  }

  const hasData = series.length > 0 && series.some(s =>
    Array.isArray(s.data) && s.data.length > 0
  );

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {showTitle && title && (
        <h4 style={{ 
          margin: '0 0 10px 0', 
          fontSize: '16px', 
          color: 'var(--text)',
          fontWeight: '600'
        }}>
          {title}
        </h4>
      )}
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
            color: 'var(--muted)',
            fontSize: '14px'
          }}>
            데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
