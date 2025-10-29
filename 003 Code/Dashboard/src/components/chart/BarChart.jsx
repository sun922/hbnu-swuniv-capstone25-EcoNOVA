import ReactECharts from "echarts-for-react";

export default function BarChart({ 
  title, 
  data = [], 
  seriesName = "데이터",
  showLabel = true,
  sortOrder = "desc", 
  colors = [],
  height = "100%",
  showTitle = true
}) {
  const safeData = Array.isArray(data) ? data : [];
  const hasData = safeData.length > 0;

  let processedData = [...safeData];
  if (sortOrder === "desc") {
    processedData.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
  } else if (sortOrder === "asc") {
    processedData.sort((a, b) => Math.abs(a.value) - Math.abs(b.value));
  }

  const defaultColors = [
    "#5470C6", "#91CC75", "#FAC858", "#EE6666", "#73C0DE",
    "#3BA272", "#FC8452", "#9A60B4", "#EA7CCC", "#5D7092"
  ];
  
  const colorPalette = colors.length > 0 ? colors : defaultColors;

  const getItemColor = (index, itemName) => {
    if (itemName && typeof itemName === 'string') {
      const colorMap = {
        "속도": "#F6C344",
        "수분": "#7AC46D", 
        "지료 유량": "#4C6EF5",
        "평량": "#EF6464",
        "건조기 압력": "#67C3DB",
      };
      return colorMap[itemName] || colorPalette[index % colorPalette.length];
    }
    return colorPalette[index % colorPalette.length];
  };

  const option = {
    tooltip: { 
      trigger: "axis", 
      axisPointer: { type: "shadow" }
    },
    grid: {
      left: '1%',
      right: '1%',
      top: '5%',
    },
    xAxis: { 
      type: "category", 
      data: processedData.map(item => item.name),
      axisLabel: { 
        rotate: 0,
        color: '#A0A0A0',
        fontSize: 14
      }
    },
    yAxis: { type: "value",
      splitLine: { lineStyle: { color: "rgba(218 218 218 / 0.44)" } },
     },
    series: [{
      name: seriesName,
      type: "bar",
      data: processedData.map((item, index) => ({
        value: item.value,
        itemStyle: { 
          color: getItemColor(index, item.name)
        },
        name: item.name 
      })),
      label: {
        show: showLabel,
        position: 'top',
        formatter: '{c}',
        fontSize: 14,
        color: '#A0A0A0'
      }
    }],
  };

  return (
    <div style={{ width: '100%', height: height, display: 'flex', flexDirection: 'column' }}>
      {showTitle && title && <h4 style={{ margin: '0 0 10px 0', color: 'var(--text)', fontWeight: '600' }}>{title}</h4>}
      <div style={{ flex: 1, width: '100%' }}>
        {hasData ? (
          <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
        ) : (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--muted)'
          }}>
            데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}