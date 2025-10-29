import ReactECharts from "echarts-for-react";

export default function PieChart({ title, data, showTitle = true, colors = {} }) {
  const safeData = Array.isArray(data) ? data : [];
  const hasData = safeData.length > 0;

  const option = {
    tooltip: { 
      trigger: "item",
      formatter: "{a} <br/>{b}: {c} ({d}%)"
    },
    legend: { 
      bottom: 0,
      orient: 'horizontal',
      textStyle: { 
        color: '#A0A0A0',
        fontSize: 14 
      }
    },
    series: [{
      name: title || '분포',
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      data: safeData.map(item => ({
        ...item,
        itemStyle: {
          color: colors[item.name] || null
        }
      })),
      label: {
        show: true,
        position: 'outside',
        formatter: '{b}',
        color: '#A0A0A0',
        fontSize: 14
      },
      labelLine: {
        show: true,
        lineStyle: {
          color: '#A0A0A0'
        }
      },
      emphasis: {
        itemStyle: {
          shadowBlur: 10,
          shadowOffsetX: 0,
          shadowColor: 'rgba(0, 0, 0, 0.5)'
        }
      }
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
