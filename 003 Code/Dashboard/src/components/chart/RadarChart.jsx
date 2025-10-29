import ReactECharts from "echarts-for-react";

export default function RadarChart({ title, data, indicators, showTitle = true, colors = {} }) {
  const safeData = Array.isArray(data) ? data : [];
  const safeIndicators = Array.isArray(indicators) ? indicators : [];
  const hasData = safeData.length > 0 && safeIndicators.length > 0;

  const getItemColor = (itemName) => {
    if (colors && colors[itemName]) {
      return colors[itemName];
    }
    const defaultColors = ["#5470C6", "#91CC75", "#FAC858", "#EE6666", "#73C0DE"];
    const index = safeData.findIndex(item => item.name === itemName);
    return defaultColors[index % defaultColors.length];
  };

  const dataWithColors = safeData.map(item => ({
    ...item,
    itemStyle: {
      color: getItemColor(item.name)
    }
  }));

  const option = {
    tooltip: { trigger: "item" },
    legend: { 
      bottom: 0,
      textStyle: {
        color: "#A0A0A0",
        fontSize: 14
      }
    },
    radar: {
      indicator: safeIndicators,
      center: ['50%', '50%'],
      radius: '70%',
      splitArea: {
        show: true,
        areaStyle: {
          color: ['rgba(250, 250, 250, 0.1)', 'rgba(200, 200, 200, 0.1)']
        }
      },
      splitLine: {
        lineStyle: {
          color: 'rgba(160, 160, 160, 0.3)'
        }
      },
      name: {
        textStyle: {
          color: "#A0A0A0",
          fontSize: 13
        }
      }
    },
    series: [{
      name: title || '성능',
      type: 'radar',
      data: dataWithColors,
      lineStyle: {
        width: 3
      },
      symbolSize: 10
    }]
  };

  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {showTitle && <h4 style={{ margin: '0 0 10px 0', fontSize: '16px', color: 'var(--text)', fontWeight: '600' }}>{title}</h4>}
      <div style={{ flex: 1, width: '100%' }}>
        {hasData ? (
          <ReactECharts option={option} style={{ width: '100%', height: '100%' }} />
        ) : (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#8a8f98'
          }}>
            데이터가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
}
