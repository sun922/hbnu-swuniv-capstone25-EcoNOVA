import PagesStyles from "./pages.module.css";
import styles from "./Custom.module.css";

import LineChart from "../components/chart/LineChart.jsx";
import BarChart from "../components/chart/BarChart.jsx";
import DataTable from "../components/chart/DataTable.jsx";
import PieChart from "../components/chart/PieChart.jsx";
import RadarChart from "../components/chart/RadarChart.jsx";

import React, { useState, useRef, useEffect } from "react";

import worker1Service from "../services/worker1Service.js";
import worker2Service from "../services/worker2Service.js";
import worker5Service from "../services/worker5Service.js";
import worker6Service from "../services/worker6Service.js";
import lotSyncService from "../services/lotSyncService.js";

import {
  date,
  speed_current,
  speed_similar1,
  speed_similar2,
  speed_similar3,
  PreSteam,
  ActSteam,
  warnPoints,
  moisture_current,
  moisture_similar1,
  moisture_similar2,
  moisture_similar3,
  steam_current,
  steam_similar1,
  steam_similar2,
  steam_similar3,
  basisWeight_current,
  basisWeight_similar1,
  basisWeight_similar2,
  basisWeight_similar3,
  flowRate_current,
  flowRate_similar1,
  flowRate_similar2,
  flowRate_similar3,
} from "../components/chart/sampleData.js";

export default function Custom() {
  const savedCharts = localStorage.getItem("customCharts");
  const initialCharts = savedCharts ? (() => {
    try {
      return JSON.parse(savedCharts);
    } catch (e) {
      return [];
    }
  })() : [];
  
  const [charts, setCharts] = useState(initialCharts);
  const [draggedChart, setDraggedChart] = useState(null);
  const canvasRef = useRef(null);

  const [qualityScore, setQualityScore] = useState({ y_now: 0, y_best: 0, y_gain: 0 });
  const [currentProgress, setCurrentProgress] = useState({ current: 0, total: 1 });

  const savedStickers = localStorage.getItem("customStickers");
  const initialStickers = savedStickers ? (() => {
    try {
      return JSON.parse(savedStickers);
    } catch (e) {
      return [];
    }
  })() : [];
  
  const [stickers, setStickers] = useState(initialStickers);
  const [draggedSticker, setDraggedSticker] = useState(null);
  const [isDraggingSticker, setIsDraggingSticker] = useState(false);
  const [isResizingSticker, setIsResizingSticker] = useState(false);
  const [editingSticker, setEditingSticker] = useState(null);

  const subLotColors = "rgba(161, 161, 161, 0.4)";

  useEffect(() => {
    let unsubData1 = null;
    let unsubData2 = null;
    let unsubData5 = null;
    let unsubData6 = null;
    let unsubLot = null;
    let mounted = true;

    const init = async () => {
      try {
        const ok1 = await worker1Service.initialize();
        const ok2 = await worker2Service.initialize();
        const ok5 = await worker5Service.initialize();
        const ok6 = await worker6Service.initialize();
        
        if (!mounted) return;
        if (!ok1) console.warn("Worker1 initialize failed");
        if (!ok2) console.warn("Worker2 initialize failed");
        if (!ok5) console.warn("Worker5 initialize failed");
        if (!ok6) console.warn("Worker6 initialize failed");

        unsubLot = lotSyncService.subscribe(async ({ lot, timestamp }) => {
          try {
            if (lot && lot !== worker1Service.currentLot) {
              await worker1Service.setLot(lot);
              await worker2Service.setLot(lot);
              await worker5Service.setLot(lot);
              await worker6Service.setLot(lot);
            }
            if (timestamp) {
              worker1Service.setInfoBoxTimestamp(timestamp);
              worker2Service.setInfoBoxTimestamp(timestamp);
              worker5Service.setInfoBoxTimestamp(timestamp);
              worker6Service.setInfoBoxTimestamp(timestamp);
            }
          } catch (e) {
            console.warn("Custom lot/timestamp sync error:", e?.message || e);
          }
        });

        unsubData1 = worker1Service.subscribe((data) => {
          if (!mounted || !data) return;
          applyIncomingData(data);
        });
        
        unsubData2 = worker2Service.subscribe((data) => {
          if (!mounted || !data) return;
          applyIncomingData2(data);
        });
        
        unsubData5 = worker5Service.subscribe((data) => {
          if (!mounted || !data) return;
          applyIncomingData5(data);
        });
        
        unsubData6 = worker6Service.subscribe((data) => {
          if (!mounted || !data) return;
          applyIncomingData6(data);
        });

        worker1Service.startStreaming();
        worker2Service.startStreaming();
        worker5Service.startStreaming();
        worker6Service.startStreaming();
      } catch (e) {
        console.warn("Custom workers init error:", e?.message || e);
      }
    };

    init();

    return () => {
      mounted = false;
      if (unsubData1) unsubData1();
      if (unsubData2) unsubData2();
      if (unsubData5) unsubData5();
      if (unsubData6) unsubData6();
      if (unsubLot) unsubLot();
    };
  }, []);

  const applyIncomingData = (raw) => {
    const chartData = worker1Service.transformToChartFormat(raw);
    if (!chartData || Object.keys(chartData).length === 0) return;

    const labels =
      (Array.isArray(raw.time_labels) && raw.time_labels.length && raw.time_labels) ||
      (Array.isArray(raw.index_labels) && raw.index_labels.length && raw.index_labels) ||
      Array.from({ length: 60 }, (_, i) => i);

    const currentMinute = raw.current_minute || 0;
    const totalLength = labels.length;

    if (totalLength > 0) {
      setCurrentProgress({
        current: currentMinute,
        total: totalLength
      });
    }

    const getStreamingSeries = (full) => {
      if (!Array.isArray(full)) return Array.from({ length: totalLength }, () => null);
      const head = full.slice(0, Math.min(currentMinute + 1, totalLength));
      const padded = [...head];
      while (padded.length < totalLength) padded.push(null);
      return padded;
    };

    setCharts((prev) =>
      prev.map((ch) => {
        if (
          ch.type === "linechart" &&
          typeof ch.varKey === "string" &&
          ["x1", "x2", "x3", "x4", "x5"].includes(ch.varKey)
        ) {
          const c = chartData[ch.varKey] || {};
          const next = {
            ...ch,
            data: {
              ...(ch.data || {}),
              xData: labels,
              series: [
                { name: "유사 공정1", data: c.similar1 || [] },
                { name: "유사 공정2", data: c.similar2 || [] },
                { name: "유사 공정3", data: c.similar3 || [] },
                { name: "현재 공정", data: getStreamingSeries(c.current_lot_data || []) },
              ],
              colors: ch.data?.colors || {
                "현재 공정": "#F6C344",
                "유사 공정1": subLotColors,
                "유사 공정2": subLotColors,
                "유사 공정3": subLotColors,
              },
              bands:
                c.bands && c.bands.ref != null && c.bands.upper != null && c.bands.lower != null
                  ? { ref: c.bands.ref, upper: c.bands.upper, lower: c.bands.lower }
                  : null,
              showTitle: false,
            },
          };
          return next;
        }
        return ch;
      })
    );
  };

  const applyIncomingData2 = (raw) => {
    const currentData = worker2Service.getCurrentData();
    if (!currentData || Object.keys(currentData).length === 0) return;

    if (currentData.qualityScore) {
      setQualityScore(currentData.qualityScore);
    }

    setCharts((prev) =>
      prev.map((ch) => {
        if (ch.serviceId === 'worker2') {
          if (ch.chartType === 'strategy' && currentData.strategyData) {
            const strategyData = currentData.strategyData.map(row => ({
              센서: row.센서,
              '현재 시점값': row['현재 시점값'],
              평균: row.평균,
              '권장 조정': row['권장 조정'],
              '품질 향상': row['품질 향상']
            }));
            return {
              ...ch,
              data: { ...ch.data, rows: strategyData, qualityScore: currentData.qualityScore }
            };
          }
          if (ch.chartType === 'quality') {
            const qualityChartData = worker2Service.getQualityTimelineForChart();
            if (qualityChartData && qualityChartData.xData && qualityChartData.series) {
              return {
                ...ch,
                data: {
                  ...ch.data,
                  xData: qualityChartData.xData,
                  series: qualityChartData.series,
                  visualPieces: ch.data.visualPieces,
                  showLegend: ch.data.showLegend !== undefined ? ch.data.showLegend : true
                }
              };
            }
          }
        }
        return ch;
      })
    );
  };

  const applyIncomingData5 = (raw) => {
    const currentData = worker5Service.getCurrentData();
    if (!currentData || !currentData.importanceData || currentData.importanceData.length === 0) return;

    setCharts((prev) =>
      prev.map((ch) => {
        if (ch.serviceId === 'worker5' && ch.chartType === 'importance') {
          return {
            ...ch,
            data: {
              ...ch.data,
              data: currentData.importanceData.map(item => ({
                name: item.name,
                value: item.importance
              }))
            }
          };
        }
        return ch;
      })
    );
  };

  const applyIncomingData6 = (raw) => {
    const currentData = worker6Service.getCurrentData();
    if (!currentData || !currentData.sensitivityData || currentData.sensitivityData.length === 0) return;

    setCharts((prev) =>
      prev.map((ch) => {
        if (ch.serviceId === 'worker6' && ch.chartType === 'sensitivity') {
          return {
            ...ch,
            data: {
              ...ch.data,
              data: currentData.sensitivityData.map(item => ({
                name: item.variable_name || item.name,
                value: item.sensitivity || item.value
              }))
            }
          };
        }
        return ch;
      })
    );
  };

  useEffect(() => {
    if (charts.length > 0) {
      localStorage.setItem("customCharts", JSON.stringify(charts));
    }
  }, [charts]);

  useEffect(() => {
    if (stickers.length > 0) {
      localStorage.setItem("customStickers", JSON.stringify(stickers));
    }
  }, [stickers]);

  useEffect(() => {
    const searchValue = localStorage.getItem("searchValue");
    if (!searchValue || !searchValue.trim()) return;
    const timer = setTimeout(() => {
      document.querySelectorAll(".chartCard").forEach((el) => {
        el.classList.remove(styles.chartHighlight);
      });
      const cards = document.querySelectorAll(".chartCard");
      cards.forEach((card) => {
        const titleElement = card.querySelector('[class*="chartHeader"] span');
        const title = titleElement ? titleElement.textContent : "";
        if (title.includes(searchValue)) {
          card.classList.add(styles.chartHighlight);
        }
      });
    }, 100);
    return () => clearTimeout(timer);
  }, [charts]);

  const availableCharts = [
    {
      id: "speed",
      name: "유사 공정 운전 경로(속도)",
      type: "linechart",
      varKey: "x2",
      data: {
        title: "",
        xData: date,
        series: [
          { name: "유사 공정1", data: speed_similar1 },
          { name: "유사 공정2", data: speed_similar2 },
          { name: "유사 공정3", data: speed_similar3 },
          { name: "현재 공정", data: speed_current },
        ],
        colors: {
          "현재 공정": "#F6C344",
          "유사 공정1": subLotColors,
          "유사 공정2": subLotColors,
          "유사 공정3": subLotColors,
        },
        bands: null,
      },
    },
    {
      id: "moisture",
      name: "유사 공정 운전 경로(수분)",
      type: "linechart",
      varKey: "x3",
      data: {
        title: "",
        xData: date,
        series: [
          { name: "유사 공정1", data: moisture_similar1 },
          { name: "유사 공정2", data: moisture_similar2 },
          { name: "유사 공정3", data: moisture_similar3 },
          { name: "현재 공정", data: moisture_current },
        ],
        colors: {
          "현재 공정": "#7AC46D",
          "유사 공정1": subLotColors,
          "유사 공정2": subLotColors,
          "유사 공정3": subLotColors,
        },
        bands: null,
      },
    },
    {
      id: "pressure",
      name: "유사 공정 운전 경로(건조기 압력)",
      type: "linechart",
      varKey: "x4",
      data: {
        title: "",
        xData: date,
        series: [
          { name: "유사 공정1", data: steam_similar1 },
          { name: "유사 공정2", data: steam_similar2 },
          { name: "유사 공정3", data: steam_similar3 },
          { name: "현재 공정", data: steam_current },
        ],
        colors: {
          "현재 공정": "#67C3DB",
          "유사 공정1": subLotColors,
          "유사 공정2": subLotColors,
          "유사 공정3": subLotColors,
        },
        bands: null,
      },
    },
    {
      id: "basisWeight",
      name: "유사 공정 운전 경로(평량)",
      type: "linechart",
      varKey: "x1",
      data: {
        title: "",
        xData: date,
        series: [
          { name: "유사 공정1", data: basisWeight_similar1 },
          { name: "유사 공정2", data: basisWeight_similar2 },
          { name: "유사 공정3", data: basisWeight_similar3 },
          { name: "현재 공정", data: basisWeight_current },
        ],
        colors: {
          "현재 공정": "#EF6464",
          "유사 공정1": subLotColors,
          "유사 공정2": subLotColors,
          "유사 공정3": subLotColors,
        },
        bands: null,
      },
    },
    {
      id: "flowRate",
      name: "유사 공정 운전 경로(지료 유량)",
      type: "linechart",
      varKey: "x5",
      data: {
        title: "",
        xData: date,
        series: [
          { name: "유사 공정1", data: flowRate_similar1 },
          { name: "유사 공정2", data: flowRate_similar2 },
          { name: "유사 공정3", data: flowRate_similar3 },
          { name: "현재 공정", data: flowRate_current },
        ],
        colors: {
          "현재 공정": "#4C6EF5",
          "유사 공정1": subLotColors,
          "유사 공정2": subLotColors,
          "유사 공정3": subLotColors,
        },
        bands: null,
      },
    },

    {
      id: "quality_realtime",
      name: "생산 품질 (실시간)",
      type: "linechart",
      serviceId: "worker2",
      chartType: "quality",
      data: {
        title: "생산 품질 (실시간)",
        xData: [],
        series: [],
        visualPieces: [
          { lt: 70, color: "#EF5350" },
          { gte: 70, lt: 80, color: "#FFB300" },
          { gte: 80, lt: 90, color: "#1F6DFF" },
          { gte: 90, color: "#66BB6A" },
        ],
        showLegend: true,
      },
    },
    {
      id: "optimalStrategy_realtime",
      name: "최적 운전 전략 (실시간)",
      type: "table",
      serviceId: "worker2",
      chartType: "strategy",
      data: {
        title: "최적 운전 전략 (실시간)",
        rows: [],
      },
    },
    {
      id: "productionProgress",
      name: "생산 진행률",
      type: "progress",
      data: {
        title: "생산 진행률",
        percentage: 0,
      },
    },
    {
      id: "steamPressure",
      name: "스팀 사용량 예측 경로",
      type: "linechart",
      data: {
        title: "",
        xData: date,
        series: [
          { name: "Steam A", data: ActSteam },
          { name: "Steam B", data: PreSteam },
        ],
        colors: ["#67C3DB", "rgba(128, 128, 128, 0.57)"],
        warnPoints: warnPoints,
      },
    },
    {
      id: "steamExcess",
      name: "스팀 초과구간 요약",
      type: "table",
      data: {
        title: "스팀 초과구간 요약",
        rows: [
          { 시간: "19:55", 변수: "건조기 압력", 현재값: 2.53, 초과량: 0, 최대값: 3.20, 최소값: 2.54 },
          { 시간: "20:03", 변수: "전건조기 압력", 현재값: 2.28, 초과량: 0, 최대값: 2.28, 최소값: 1.77 },
          { 시간: "20:15", 변수: "지료 유량", 현재값: 1.95, 초과량: 0, 최대값: 2.10, 최소값: 1.80 },
          { 시간: "20:25", 변수: "수분", 현재값: 4.2, 초과량: 0, 최대값: 4.5, 최소값: 3.8 },
        ],
      },
    },
    {
      id: "stableMixing",
      name: "안정 배합비",
      type: "radar",
      data: {
        title: "안정 배합비",
        data: [
          { value: [85, 70, 60, 45, 78], name: "대표 배합" },
          { value: [78, 75, 65, 50, 93], name: "현재 배합" },
        ],
        indicators: [
          { name: "NBKP", max: 100 },
          { name: "CTMP", max: 100 },
          { name: "UB", max: 100 },
          { name: "CB", max: 100 },
          { name: "KMIP", max: 100 },
        ],
        colors: {
          "대표 배합": "#4C6EF5",
          "현재 배합": "#7AC46D",
        },
      },
    },
    {
      id: "sensorImportance_realtime",
      name: "공정 센서 중요도 (실시간)",
      type: "pie",
      serviceId: "worker5",
      chartType: "importance",
      data: {
        title: "공정 센서 중요도 (실시간)",
        data: [],
        nameKey: "name",
        valueKey: "value",
      },
    },
    {
      id: "sensorSensitivity_realtime",
      name: "공정 센서 민감도 (실시간)",
      type: "bar",
      serviceId: "worker6",
      chartType: "sensitivity",
      data: {
        title: "공정센서 민감도 (실시간)",
        data: [],
        xKey: "name",
        yKey: "value",
      },
    },
  ];

  const addChart = (chartConfig) => {
    const newChart = {
      id: `${chartConfig.id}_${Date.now()}`,
      type: chartConfig.type,
      name: chartConfig.name,
      data: chartConfig.data,
      varKey: chartConfig.varKey || null,
      serviceId: chartConfig.serviceId || null,
      chartType: chartConfig.chartType || null,
      x: 50 + charts.length * 20,
      y: 50 + charts.length * 20,
      width: 300,
      height: 250,
      zIndex: charts.length + 1,
    };
    setCharts((prev) => [...prev, newChart]);
  };

  const removeChart = (chartId) => {
    const next = charts.filter((c) => c.id !== chartId);
    setCharts(next);
    if (next.length === 0) {
      localStorage.removeItem("customCharts");
    }
  };

  const clearAllCharts = () => {
    setCharts([]);
    localStorage.removeItem("customCharts");
  };

  const addSticker = () => {
    const s = {
      id: `sticker_${Date.now()}`,
      text: "",
      x: 50 + stickers.length * 20,
      y: 50 + stickers.length * 20,
      width: 200,
      height: 120,
      color: "var(--panel)",
      zIndex: 1000 + stickers.length + 1,
    };
    setStickers((prev) => [...prev, s]);
    setEditingSticker(s.id);
  };

  const removeSticker = (id) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
  };

  const updateStickerText = (id, val) => {
    setStickers((prev) => prev.map((s) => (s.id === id ? { ...s, text: val } : s)));
  };

  const updateStickerSize = (id, width, height) => {
    setStickers((prev) =>
      prev.map((s) =>
        s.id === id
          ? { ...s, width: Math.max(150, width), height: Math.max(80, height) }
          : s
      )
    );
  };

  const startEditing = (id) => setEditingSticker(id);
  const stopEditing = () => setEditingSticker(null);

  const handleStickerClick = (e, sticker) => {
    e.stopPropagation();
    if (!isDraggingSticker && !isResizingSticker) startEditing(sticker.id);
  };

  const handleStickerMouseDown = (e, sticker) => {
    e.preventDefault();
    setDraggedSticker(sticker);
    setIsDraggingSticker(true);

    const rect = canvasRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left - sticker.x;
    const startY = e.clientY - rect.top - sticker.y;

    const handleMove = (ev) => {
      const newX = ev.clientX - rect.left - startX;
      const newY = ev.clientY - rect.top - startY;
      setStickers((prev) =>
        prev.map((s) => (s.id === sticker.id ? { ...s, x: newX, y: newY } : s))
      );
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      setDraggedSticker(null);
      setIsDraggingSticker(false);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const handleStickerResizeStart = (e, sticker) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizingSticker(true);
    setDraggedSticker(sticker);

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = sticker.width;
    const startHeight = sticker.height;

    const handleMove = (ev) => {
      const w = startWidth + (ev.clientX - startX);
      const h = startHeight + (ev.clientY - startY);
      updateStickerSize(sticker.id, w, h);
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
      setIsResizingSticker(false);
      setDraggedSticker(null);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const handleDragStart = (e, chartConfig) => {
    setDraggedChart(chartConfig);
    e.dataTransfer.effectAllowed = "copy";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (draggedChart) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const newChart = {
        id: `${draggedChart.id}_${Date.now()}`,
        type: draggedChart.type,
        name: draggedChart.name,
        data: draggedChart.data,
        varKey: draggedChart.varKey || null,
        x: Math.max(0, x - 150),
        y: Math.max(0, y - 125),
        width: 300,
        height: 250,
        zIndex: charts.length + 1,
      };
      setCharts((prev) => [...prev, newChart]);
    }
    setDraggedChart(null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleMouseDown = (e, chartId) => {
    e.preventDefault();
    e.stopPropagation();
    const chart = charts.find((c) => c.id === chartId);
    if (!chart) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const startX = e.clientX - rect.left - chart.x;
    const startY = e.clientY - rect.top - chart.y;

    const handleMove = (ev) => {
      const newX = ev.clientX - rect.left - startX;
      const newY = ev.clientY - rect.top - startY;
      setCharts((prev) =>
        prev.map((c) =>
          c.id === chartId
            ? { ...c, x: Math.max(0, newX), y: Math.max(0, newY) }
            : c
        )
      );
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const handleResizeStart = (e, chartId) => {
    e.preventDefault();
    e.stopPropagation();
    const chart = charts.find((c) => c.id === chartId);
    if (!chart) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = chart.width;
    const startHeight = chart.height;

    const handleMove = (ev) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      setCharts((prev) =>
        prev.map((c) =>
          c.id === chartId
            ? {
                ...c,
                width: Math.max(200, startWidth + dx),
                height: Math.max(150, startHeight + dy),
              }
            : c
        )
      );
    };
    const handleUp = () => {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleUp);
    };
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleUp);
  };

  const renderChart = (chart) => {
    const commonProps = {
      key: chart.id,
      onMouseDown: (e) => handleMouseDown(e, chart.id),
      style: {
        position: "absolute",
        left: chart.x,
        top: chart.y,
        width: chart.width,
        height: chart.height,
        zIndex: chart.zIndex,
        cursor: "move",
      },
      className: `${styles.chartCard} chartCard`,
    };

    switch (chart.type) {
      case "linechart":
        return (
          <div {...commonProps}>
            <div className={styles.chartHeader}>
              <span>{chart.name}</span>
              <button
                className={styles.removeBtn}
                onClick={() => removeChart(chart.id)}
              >
                ×
              </button>
            </div>
            <div className={styles.chartContent}>
              <LineChart {...(chart.data || {})} showTitle={false} />
            </div>
            <div
              className={styles.resizeHandle}
              onMouseDown={(e) => handleResizeStart(e, chart.id)}
            />
          </div>
        );
      case "bar":
        return (
          <div {...commonProps}>
            <div className={styles.chartHeader}>
              <span>{chart.name}</span>
              <button
                className={styles.removeBtn}
                onClick={() => removeChart(chart.id)}
              >
                ×
              </button>
            </div>
            <div className={styles.chartContent}>
              <BarChart {...(chart.data || {})} showTitle={false} />
            </div>
            <div
              className={styles.resizeHandle}
              onMouseDown={(e) => handleResizeStart(e, chart.id)}
            />
          </div>
        );
      case "pie":
        return (
          <div {...commonProps}>
            <div className={styles.chartHeader}>
              <span>{chart.name}</span>
              <button
                className={styles.removeBtn}
                onClick={() => removeChart(chart.id)}
              >
                ×
              </button>
            </div>
            <div className={styles.chartContent}>
              <PieChart {...(chart.data || {})} showTitle={false} />
            </div>
            <div
              className={styles.resizeHandle}
              onMouseDown={(e) => handleResizeStart(e, chart.id)}
            />
          </div>
        );
      case "radar":
        return (
          <div {...commonProps}>
            <div className={styles.chartHeader}>
              <span>{chart.name}</span>
              <button
                className={styles.removeBtn}
                onClick={() => removeChart(chart.id)}
              >
                ×
              </button>
            </div>
            <div className={styles.chartContent}>
              <RadarChart {...(chart.data || {})} showTitle={false} />
            </div>
            <div
              className={styles.resizeHandle}
              onMouseDown={(e) => handleResizeStart(e, chart.id)}
            />
          </div>
        );
      case "table":
        const chartQualityScore = chart.data?.qualityScore || qualityScore;
        return (
          <div {...commonProps}>
            <div className={styles.chartHeader}>
              <span>{chart.name}</span>
              <button
                className={styles.removeBtn}
                onClick={() => removeChart(chart.id)}
              >
                ×
              </button>
            </div>
            {chart.data?.qualityScore && (
              <div style={{ 
                padding: '10px 15px 0 15px',
                marginBottom: '10px',
                fontSize: '14px',
                display: 'flex',
                justifyContent: 'space-around',
                textAlign: 'center',
                color: 'var(--text)',
                borderBottom: '1px solid var(--border)'
              }}>
                <div>최적 점수<br/><strong style={{ color: 'var(--text)', fontSize: '16px' }}>{chartQualityScore.y_best || 0}</strong></div>
                <div>현재 점수<br/><strong style={{ color: 'var(--text)', fontSize: '16px' }}>{chartQualityScore.y_now || 0}</strong></div>
                <div>변화량<br/><strong style={{ color: 'var(--text)', fontSize: '16px' }}>{chartQualityScore.y_gain || 0}</strong></div>
              </div>
            )}
            <div className={styles.chartContent}>
              <DataTable {...(chart.data || {})} showTitle={false} />
            </div>
            <div
              className={styles.resizeHandle}
              onMouseDown={(e) => handleResizeStart(e, chart.id)}
            />
          </div>
        );
      case "progress":
        const percentage = chart.data?.percentage && chart.data.percentage > 0
          ? chart.data.percentage 
          : (currentProgress.total > 0 
              ? ((currentProgress.current / currentProgress.total) * 100) 
              : 0);
        return (
          <div {...commonProps}>
            <div className={styles.chartHeader}>
              <span>{chart.name}</span>
              <div style={{ fontSize: "18px", fontWeight: "bold" }}>
                {percentage.toFixed(1)}%
              </div>
              <button
                className={styles.removeBtn}
                onClick={() => removeChart(chart.id)}
              >
                ×
              </button>
            </div>
            <div className={styles.chartContent}>
              <div
                style={{
                  width: "100%",
                  height: "20px",
                  backgroundColor: "#e5e7eb",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${percentage}%`,
                    height: "100%",
                    backgroundColor: "#73C0DE",
                    borderRadius: "10px",
                    transition: "width 0.3s ease"
                  }}
                />
              </div>
            </div>
            <div
              className={styles.resizeHandle}
              onMouseDown={(e) => handleResizeStart(e, chart.id)}
            />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className={PagesStyles.background}>
      <div className={styles.customContainer}>
        <div className={styles.sidebar}>
          <h3>그래프 목록</h3>

          <div className={styles.stickerSection}>
            <button className={styles.addStickerBtn} onClick={addSticker}>
              스티커 메모
            </button>
          </div>

          <div className={styles.chartList}>
            {availableCharts.map((chart) => (
              <button
                key={chart.id}
                className={styles.chartButton}
                draggable
                onDragStart={(e) => handleDragStart(e, chart)}
                onClick={() => addChart(chart)}
              >
                {chart.name}
              </button>
            ))}
          </div>

          {charts.length > 0 && (
            <button className={styles.clearAllBtn} onClick={clearAllCharts}>
              모든 그래프 삭제
            </button>
          )}
        </div>

        {/* 캔버스 */}
        <div
          ref={canvasRef}
          className={styles.canvas}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          {charts.map(renderChart)}

          {stickers.map((sticker) => (
            <div
              key={sticker.id}
              className={styles.sticker}
              style={{
                left: sticker.x,
                top: sticker.y,
                width: sticker.width,
                height: sticker.height,
                backgroundColor: sticker.color,
                zIndex: sticker.zIndex,
                cursor:
                  isDraggingSticker && draggedSticker?.id === sticker.id
                    ? "grabbing"
                    : isResizingSticker && draggedSticker?.id === sticker.id
                    ? "se-resize"
                    : "grab",
              }}
              onMouseDown={(e) => {
                if (!e.target.closest(`[class*="stickerHeader"]`)) return;
                if (!isResizingSticker) handleStickerMouseDown(e, sticker);
              }}
            >
              <div className={styles.stickerHeader}>
                <span className={styles.stickerTitle}>메모</span>
                <button
                  className={styles.stickerDeleteBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSticker(sticker.id);
                  }}
                  title="삭제"
                >
                  ×
                </button>
              </div>
              <div className={styles.stickerContent}>
                {editingSticker === sticker.id ? (
                  <textarea
                    value={sticker.text}
                    onChange={(e) => updateStickerText(sticker.id, e.target.value)}
                    className={styles.stickerTextarea}
                    placeholder="메모를 입력하세요..."
                    onBlur={stopEditing}
                    autoFocus
                  />
                ) : (
                  <div
                    className={styles.stickerText}
                    onClick={(e) => handleStickerClick(e, sticker)}
                  >
                    {sticker.text || "클릭하여 편집..."}
                  </div>
                )}
              </div>
              <div
                className={styles.stickerResizeHandle}
                onMouseDown={(e) => handleStickerResizeStart(e, sticker)}
              />
            </div>
          ))}

          {charts.length === 0 && (
            <div className={styles.emptyMessage}>
              왼쪽에서 그래프를 드래그하거나 클릭하여 추가하세요
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
