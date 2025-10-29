import PagesStyles from "./pages.module.css"; 
import styles from "./Dashboard.module.css";
import LineChart from "../components/chart/LineChart.jsx";
import DataTable from "../components/chart/DataTable.jsx";
import BarChart from "../components/chart/BarChart.jsx";
import PieChart from "../components/chart/PieChart.jsx";
import RadarChart from "../components/chart/RadarChart.jsx";
import { useState, useEffect } from "react";
import { PreSteam, ActSteam, warnPoints, date } from "../components/chart/sampleData.js";
import worker1Service from "../services/worker1Service.js";
import worker2Service from "../services/worker2Service.js";
import worker5Service from "../services/worker5Service.js";
import worker6Service from "../services/worker6Service.js";


export default function Dashboard(){
    const [loading, setLoading] = useState(true);
    
    const [worker1Data, setWorker1Data] = useState({
        speed: { current: [], similar1: [], similar2: [], similar3: [], bands: {} },
        moisture: { current: [], similar1: [], similar2: [], similar3: [], bands: {} },
        pressure: { current: [], similar1: [], similar2: [], similar3: [], bands: {} },
        basisWeight: { current: [], similar1: [], similar2: [], similar3: [], bands: {} },
        flowRate: { current: [], similar1: [], similar2: [], similar3: [], bands: {} }
    });
    const [worker1Labels, setWorker1Labels] = useState([]);
    const [currentProgress, setCurrentProgress] = useState({ current: 0, total: 1 });
    
    const [worker2Data, setWorker2Data] = useState({
        strategyData: [],
        qualityScore: { y_now: 0, y_best: 0, y_gain: 0 },
        sensitivityData: [],
        qualityTimeline: [],
        timeLabels: [],
        currentMinute: 0
    });
    
    const [worker5Data, setWorker5Data] = useState({
        importanceData: [],
        timeLabels: [],
        currentMinute: 0
    });
    
    const [worker6Data, setWorker6Data] = useState({
        sensitivityData: [],
        timeLabels: [],
        currentMinute: 0
    });

    useEffect(() => {
      const unsubscribe = worker1Service.subscribe((data) => {
        console.log('Dashboard Worker1 데이터 수신:', data);
        const chartData = worker1Service.transformToChartFormat(data);
        
        if (!chartData || Object.keys(chartData).length === 0) {
          console.warn('차트 데이터가 비어있습니다:', data);
          return;
        }
        
        const fixedLabels = (Array.isArray(data.time_labels) && data.time_labels.length ? data.time_labels : null) ||
            (Array.isArray(data.index_labels) && data.index_labels.length ? data.index_labels : null) ||
            Array.from({ length: 60 }, (_, i) => i);
        
        setWorker1Labels(fixedLabels);

        const currentMinute = data.current_minute || 0;
        const totalLength = fixedLabels.length;
        
        if (totalLength > 0) {
          setCurrentProgress({
            current: currentMinute,
            total: totalLength
          });
        }
        
        const getCurrentStreamingData = (fullData) => {
          if (!fullData || !Array.isArray(fullData)) return Array.from({length: totalLength}, () => null);
          const head = fullData.slice(0, currentMinute + 1);
          const padded = [...head];
          while (padded.length < totalLength) padded.push(null);
          return padded;
        };
        
        const chartDataMap = {
          speed: 'x2',
          moisture: 'x3', 
          pressure: 'x4',
          basisWeight: 'x1',
          flowRate: 'x5'
        };
        
        const newWorker1Data = {};
        Object.entries(chartDataMap).forEach(([key, varKey]) => {
          const data = chartData[varKey] || {};
          newWorker1Data[key] = {
            current: getCurrentStreamingData(data.current_lot_data),
            similar1: data.similar1 || [],
            similar2: data.similar2 || [],
            similar3: data.similar3 || [],
            bands: data.bands || {}
          };
        });
        
        setWorker1Data(newWorker1Data);
      });
      
      return () => {
        unsubscribe();
      };
    }, []);

    useEffect(() => {
      const unsubscribe = worker2Service.subscribe((data) => {
        console.log('Dashboard Worker2 데이터 수신:', data);
        const chartData = worker2Service.transformToChartFormat(data);
        
        if (!chartData || Object.keys(chartData).length === 0) {
          console.warn('Worker2 차트 데이터가 비어있습니다:', data);
          return;
        }
        
        setWorker2Data({
          strategyData: chartData.strategyData || [],
          qualityScore: chartData.qualityScore || { y_now: 0, y_best: 0, y_gain: 0 },
          sensitivityData: chartData.sensitivityData || [],
          qualityTimeline: chartData.qualityTimeline || [],
          timeLabels: chartData.timeLabels || [],
          currentMinute: chartData.currentMinute || 0
        });
      });
      
      return () => {
        unsubscribe();
      };
    }, []);

    useEffect(() => {
      const unsubscribe = worker5Service.subscribe((data) => {
        console.log('Dashboard Worker5 데이터 수신:', data);
        const chartData = worker5Service.transformToChartFormat(data);
        
        if (!chartData || Object.keys(chartData).length === 0) {
          console.warn('Worker5 차트 데이터가 비어있습니다:', data);
          return;
        }
        
        setWorker5Data({
          importanceData: chartData.importanceData || [],
          timeLabels: chartData.timeLabels || [],
          currentMinute: chartData.currentMinute || 0
        });
      });
      
      return () => {
        unsubscribe();
      };
    }, []);
    
    useEffect(() => {
      const unsubscribe = worker6Service.subscribe((data) => {
        console.log('Dashboard Worker6 데이터 수신:', data);
        const chartData = worker6Service.transformToChartFormat(data);
        
        if (!chartData || Object.keys(chartData).length === 0) {
          console.warn('Worker6 차트 데이터가 비어있습니다:', data);
          return;
        }
        
        setWorker6Data({
          sensitivityData: chartData.sensitivityData || [],
          timeLabels: chartData.timeLabels || [],
          currentMinute: chartData.currentMinute || 0
        });
      });
      
      return () => {
        unsubscribe();
      };
    }, []);

    useEffect(() => {
      setLoading(false);
    }, []);

    const excessData = [
      { time: "2025-10-02 19:55:00", current: 2.53, excess: 0, max: 3.20, min: 2.54, variable: "건조기 압력" },
      { time: "2025-10-02 20:03:00", current: 2.28, excess: 0, max: 2.28, min: 1.77, variable: "전건조기 압력" },
      { time: "2025-10-02 20:15:00", current: 1.95, excess: 0, max: 2.10, min: 1.80, variable: "지료 유량" },
      { time: "2025-10-02 20:25:00", current: 4.2, excess: 0, max: 4.5, min: 3.8, variable: "수분" }
    ];

    const mixingData = [
      { value: [0.4, 0.4, 0.4, 0.4, 0.4], name: '대표 배합'},
      { value: [0.2, 0.2, 0.2, 0.2, 0.2], name: '현재 배합'}
    ];
    const mixingIndicators = [
      { name: 'NBKP', max: 0.5 },
      { name: 'CTMP', max: 0.5 },
      { name: 'UB', max: 0.5 },
      { name: 'CB', max: 0.5 },
      { name: 'KMIP', max: 0.5 }
    ];

    const strategyData = worker2Data.strategyData.length > 0 ? 
      worker2Data.strategyData.map(row => ({
        센서: row.센서,
        '현재 시점값': row['현재 시점값'],
        평균: row.평균,
        '권장 조정': row['권장 조정'],
        '품질 향상': row['품질 향상']
      })) : [
        { 센서: "지료 유량", '현재 시점값': 0, 평균: 0, '권장 조정값': 0, '품질 향상': 0 },
        { 센서: "평량", '현재 시점값': 0, 평균: 0, '권장 조정값': 0, '품질 향상': 0 },
        { 센서: "수분", '현재 시점값': 0, 평균: 0, '권장 조정값': 0, '품질 향상': 0 },
        { 센서: "속도", '현재 시점값': 0, 평균: 0, '권장 조정값': 0, '품질 향상': 0 },
        { 센서: "건조기 압력", '현재 시점값': 0, 평균: 0, '권장 조정값': 0, '품질 향상': 0 }
      ];

    const sensitivityData = worker6Data.sensitivityData.length > 0 ? worker6Data.sensitivityData : [
      { name: "속도" , value: -14.0},
      { name: "수분", value: 9.04 },
      { name: "지료 유량", value: 11.2 },
      { name: "평량", value: 16.4 },
      { name: "건조기 압력", value: -8.45 }
    ];

    const qualityTimelineData = worker2Service.getQualityTimelineForChart();
    const qualityScore = worker2Data.qualityScore;

    if (loading) {
        return (
            <div className={styles.dashboard}>
                <div style={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    alignItems: 'center', 
                    height: '50vh',
                    fontSize: '18px',
                    color: '#666'
                }}>
                    데이터를 불러오는 중...
                </div>
            </div>
        );
    }

    const subLotColors = "rgba(161, 161, 161, 0.4)"

    return(
        <div className={PagesStyles.background}>
            <div className={styles.cardgruop}>
                <div className={styles.card1} >
                    <div className={`${PagesStyles.card} ${styles.card1_1}`}
                        data-title="유사 공정 운전 경로(속도)">
                        <LineChart
                            title="유사 공정 운전 경로(속도)"
                            xData={worker1Labels}
                            series={[
                                { name: "유사 공정1", data: worker1Data.speed.similar1 },
                                { name: "유사 공정2", data: worker1Data.speed.similar2 },
                                { name: "유사 공정3", data: worker1Data.speed.similar3 },
                                { name: "현재 공정", data: worker1Data.speed.current },
                            ]}
                            colors={{ "현재 공정": "#F6C344","유사 공정1": subLotColors, "유사 공정2": subLotColors, "유사 공정3": subLotColors}}
                            bands={worker1Data.speed.bands.ref && worker1Data.speed.bands.upper && worker1Data.speed.bands.lower ? 
                                { ref: worker1Data.speed.bands.ref, upper: worker1Data.speed.bands.upper, lower: worker1Data.speed.bands.lower } : 
                                null
                            }
                        />
                    </div>
                    <div className={`${PagesStyles.card} ${styles.card1_2}`}
                        data-title="유사 공정 운전 경로(수분)">
                        
                        <LineChart
                            title="유사 공정 운전 경로(수분)"
                            xData={worker1Labels}
                            series={[
                                { name: "유사 공정1", data: worker1Data.moisture.similar1 },
                                { name: "유사 공정2", data: worker1Data.moisture.similar2 },
                                { name: "유사 공정3", data: worker1Data.moisture.similar3 },
                                { name: "현재 공정", data: worker1Data.moisture.current },
                            ]}
                            colors={{ "현재 공정": "#7AC46D", "유사 공정1": subLotColors, "유사 공정2": subLotColors, "유사 공정3": subLotColors}}
                            bands={worker1Data.moisture.bands.ref && worker1Data.moisture.bands.upper && worker1Data.moisture.bands.lower ? 
                                { ref: worker1Data.moisture.bands.ref, upper: worker1Data.moisture.bands.upper, lower: worker1Data.moisture.bands.lower } : 
                                null
                            }
                        />
                    </div>
                    <div className={`${PagesStyles.card} ${styles.card1_3}`}
                        data-title="유사 공정 운전 경로(건조기 압력)">
                        <LineChart
                            title="유사 공정 운전 경로(건조기 압력)"
                            xData={worker1Labels}
                            series={[
                                { name: "유사 공정1", data: worker1Data.pressure.similar1 },
                                { name: "유사 공정2", data: worker1Data.pressure.similar2 },
                                { name: "유사 공정3", data: worker1Data.pressure.similar3 },
                                { name: "현재 공정", data: worker1Data.pressure.current },
                            ]}
                            colors={{ "현재 공정": "#67C3DB", "유사 공정1": subLotColors, "유사 공정2": subLotColors, "유사 공정3": subLotColors}}
                            bands={worker1Data.pressure.bands.ref && worker1Data.pressure.bands.upper && worker1Data.pressure.bands.lower ? 
                                { ref: worker1Data.pressure.bands.ref, upper: worker1Data.pressure.bands.upper, lower: worker1Data.pressure.bands.lower } : 
                                null
                            }
                        />
                    </div>
                    <div className={`${PagesStyles.card} ${styles.card1_4}`}
                        data-title="유사 공정 운전 경로(평량)">
                        <LineChart
                            title="유사 공정 운전 경로(평량)"
                            xData={worker1Labels}
                            series={[
                                { name: "유사 공정1", data: worker1Data.basisWeight.similar1 },
                                { name: "유사 공정2", data: worker1Data.basisWeight.similar2 },
                                { name: "유사 공정3", data: worker1Data.basisWeight.similar3 },
                                { name: "현재 공정", data: worker1Data.basisWeight.current },
                            ]}
                            colors={{ "현재 공정": "#EF6464", "유사 공정1": subLotColors, "유사 공정2": subLotColors, "유사 공정3": subLotColors}}
                            bands={worker1Data.basisWeight.bands.ref && worker1Data.basisWeight.bands.upper && worker1Data.basisWeight.bands.lower ? 
                                { ref: worker1Data.basisWeight.bands.ref, upper: worker1Data.basisWeight.bands.upper, lower: worker1Data.basisWeight.bands.lower } : 
                                null
                            }
                        />
                    </div>
                    <div className={`${PagesStyles.card} ${styles.card1_5}`}
                        data-title="유사 공정 운전 경로(지료 유량)">
                        <LineChart
                            title="유사 공정 운전 경로(지료 유량)"
                            xData={worker1Labels}
                            series={[
                                { name: "유사 공정1", data: worker1Data.flowRate.similar1 },
                                { name: "유사 공정2", data: worker1Data.flowRate.similar2 },
                                { name: "유사 공정3", data: worker1Data.flowRate.similar3 },
                                { name: "현재 공정", data: worker1Data.flowRate.current },
                            ]}
                            colors={{ "현재 공정": "#4C6EF5", "유사 공정1": subLotColors, "유사 공정2": subLotColors, "유사 공정3": subLotColors}}
                            bands={worker1Data.flowRate.bands.ref && worker1Data.flowRate.bands.upper && worker1Data.flowRate.bands.lower ? 
                                { ref: worker1Data.flowRate.bands.ref, upper: worker1Data.flowRate.bands.upper, lower: worker1Data.flowRate.bands.lower } : 
                                null
                            }
                        />
                    </div>
                </div>

                <div className={`${PagesStyles.card} ${styles.card4}`} 
                    data-title="목표 생산 달성률">
                    <div >
                        <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            marginBottom: '20px'
                        }}>
                            <h4 style={{ margin: '0', color: 'var(--text)', fontWeight: '600' }}>생산 진행률</h4>
                            <div style={{ 
                                fontSize: '18px', 
                                fontWeight: 'bold',
                                color: 'var(--text)'
                            }}>
                                {currentProgress.total > 0 
                                  ? `${((currentProgress.current / currentProgress.total) * 100).toFixed(1)}%`
                                  : '0%'}
                            </div>
                        </div>
                        <div style={{ 
                            width: '100%', 
                            height: '20px', 
                            backgroundColor: 'var(--gray-200)', 
                            borderRadius: '10px',
                            overflow: 'hidden'
                        }}>
                            <div style={{ 
                                width: currentProgress.total > 0 
                                  ? `${(currentProgress.current / currentProgress.total) * 100}%`
                                  : '0%', 
                                height: '100%', 
                                backgroundColor: '#73C0DE',
                                borderRadius: '10px',
                                transition: 'width 0.3s ease'
                            }}></div>
                        </div>
                    </div>
                </div>

                <div className={`${PagesStyles.card} ${styles.card7}`}
                    data-title="스팀 사용량 예측 경로">
                    <LineChart
                        title="스팀 사용량 예측 경로"
                        xData={date}
                        series={[
                            { name: "실제 사용량", data: ActSteam },
                            { name: "예측 사용량", data: PreSteam }
                        ]}
                        colors={["#67C3DB", "rgba(128, 128, 128, 0.57)"]}
                        warnPoints={warnPoints}    
                    />
                </div>

                <div className={`${PagesStyles.card} ${styles.card9}`} 
                    data-title="스팀 초과 구간 요약">
                    <DataTable title="스팀 초과 구간 요약" rows={excessData} />
                </div>

                <div className={`${PagesStyles.card} ${styles.card8}`} 
                    data-title="안정 배합비">
                    <RadarChart 
                        title="안정 배합비" 
                        data={mixingData} 
                        indicators={mixingIndicators} 
                        colors={{
                            "대표 배합": "#4C6EF5",
                            "현재 배합": "#7AC46D"
                        }} 
                    />
                </div>

                <div className={`${PagesStyles.card} ${styles.card5}`} 
                    data-title="공정 센서 중요도">
                    <PieChart 
                        title="공정 센서 중요도" 
                        data={worker5Data.importanceData.length > 0 ? worker5Data.importanceData.map(item => ({ name: item.name, value: item.importance })) : [
                            { name: "지료 유량", value: 25 },
                            { name: "평량", value: 20 },
                            { name: "수분", value: 15 },
                            { name: "속도", value: 25 },
                            { name: "건조기 압력", value: 15 }
                        ]}
                        colors={{
                            "지료 유량": "#4C6EF5",
                            "평량": "#EF6464",
                            "수분": "#7AC46D",
                            "속도": "#F6C344",
                            "건조기 압력": "#67C3DB"
                        }}
                    />
                </div>

                <div className={`${PagesStyles.card} ${styles.card3}`}
                    data-title="생산 품질 지수">
                    <LineChart
                        title="생산 품질"
                        xData={qualityTimelineData.xData}
                        series={qualityTimelineData.series}
                        visualPieces={[
                        { lt: 70, color: "#EF5350" },          
                        { gte: 70, lt: 80, color: "#FFB300" }, 
                        { gte: 80, lt: 90, color: "#1F6DFF" },
                        { gte: 90, color: "#66BB6A" },         
                        ]}
                        showLegend={true}
                    />
                </div>

                <div className={`${PagesStyles.card} ${styles.card2}`} 
                    data-title="최적 운전 전략">
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        <h4 style={{ margin: '0 0 15px 0', color: 'var(--text)', fontWeight: '600' }}>최적 운전 전략</h4>
                        <div style={{ 
                            paddingTop: '20px',
                            marginBottom: '15px', 
                            fontSize: '16px',
                            display: 'flex',
                            justifyContent: 'space-around',
                            textAlign: 'center',
                            color: 'var(--text)'
                        }}>
                            <div>최적 점수<br/><strong style={{ color: 'var(--text)' }}>{qualityScore.y_best || 0}</strong></div>
                            <div>현재 점수<br/><strong style={{ color: 'var(--text)' }}>{qualityScore.y_now || 0}</strong></div>
                            <div>변화량<br/><strong style={{ color: 'var(--text)' }}>{qualityScore.y_gain || 0}</strong></div>
                        </div>
                        <div style={{ flex: 1 }}>
                            <DataTable title="" rows={strategyData} />
                        </div>
                    </div>
                </div>

                <div className={`${PagesStyles.card} ${styles.card6}`} 
                    data-title="공정 센서 민감도">
                    <BarChart 
                        title="공정 센서 민감도" 
                        data={sensitivityData}
                        seriesName="민감도"
                        sortOrder="desc"
                        showLabel={true}
                    />
                </div>
            </div>
                
        </div>
        
    );
}

