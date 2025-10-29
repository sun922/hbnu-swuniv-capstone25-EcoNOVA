// InfoBox.jsx (교체)

import { FaSearch, FaPlay, FaPause } from "react-icons/fa"; 
import styles from "../layout/layout.module.css"; 
import pageStyles from "../pages/pages.module.css"; 
import customStyles from "../pages/Custom.module.css";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import paperDataService from "../services/paperDataService.js";
import lotSyncService from "../services/lotSyncService.js";
import worker1Service from "../services/worker1Service.js";
import worker2Service from "../services/worker2Service.js";
import worker5Service from "../services/worker5Service.js";
import worker6Service from "../services/worker6Service.js";

export default function InfoBox() {
  const location = useLocation();

  // UI 상태
  const [currentDateTime, setCurrentDateTime] = useState("0000-00-00 00:00");
  const [paperType, setPaperType] = useState("paper0");
  const [paperWeight, setPaperWeight] = useState("100.0 g/m²");
  const [lotNumber, setLotNumber] = useState("C0000");
  const [inputValue, setInputValue] = useState("");
  const [isPaused, setIsPaused] = useState(false);

  // 디바운스 타이머 ref
  const highlightTimerRef = useRef(null);

  useEffect(() => {
    let unsubscribe = () => {};
    (async () => {
      try {
        const connected = await paperDataService.loadData();
        if (connected) {
          paperDataService.startStreaming();
          setIsPaused(false);
          unsubscribe = paperDataService.subscribe((data) => {
            if (!data) return;
            const formattedData = paperDataService.formatData(data) || {};
            const ts = formattedData.timestamp || "";
            const paper = formattedData.paper || "";
            const bw = formattedData.bw != null ? `${formattedData.bw} g/m²` : "";
            const lot = formattedData.lot || "";

            setCurrentDateTime(ts);
            setPaperType(paper);
            setPaperWeight(bw);
            setLotNumber(lot);

            if (lot && ts) {
              lotSyncService.setCurrentLot(lot, ts);
            } else if (lot) {
              // lot만 있고 timestamp가 없으면 기존 timestamp 유지
              lotSyncService.setCurrentLot(lot);
            }
          });
        } else {
          console.error("서버 연결 실패");
        }
      } catch (err) {
        console.error("데이터 스트리밍 초기화 실패:", err);
      }
    })();

    return () => {
      try { unsubscribe(); } catch {}
      paperDataService.stopStreaming();
    };
  }, []);

  // 로컬 스토리지 복원
  useEffect(() => {
    const saved = localStorage.getItem("pf.searchValue");
    if (saved) setInputValue(saved);
  }, []);

  const applyHighlight = (searchTerm) => {
    try {
      document
        .querySelectorAll(`.${pageStyles.highlight}`)
        .forEach((el) => el.classList.remove(pageStyles.highlight));
      document
        .querySelectorAll(`.${customStyles.chartHighlight}`)
        .forEach((el) => el.classList.remove(customStyles.chartHighlight));

      const term = (searchTerm || "").trim();
      if (!term) return;

      const cards = document.querySelectorAll(`.${pageStyles.card}`);
      cards.forEach((card) => {
        const title = card?.getAttribute?.("data-title") || "";
        if (title.includes(term)) {
          card.classList.add(pageStyles.highlight);
        }
      });

      const customCards = document.querySelectorAll(".chartCard");
      customCards.forEach((card) => {
        const titleElement = card.querySelector('[class*="chartHeader"] span');
        const title = titleElement?.textContent || "";
        if (title.includes(term)) {
          card.classList.add(customStyles.chartHighlight);
        }
      });
    } catch (err) {
      console.warn("하이라이트 처리 중 오류:", err);
    }
  };

  useEffect(() => {
    localStorage.setItem("pf.searchValue", inputValue);
    if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = setTimeout(() => applyHighlight(inputValue), 120);
    return () => {
      if (highlightTimerRef.current) clearTimeout(highlightTimerRef.current);
    };
  }, [inputValue]);

  useEffect(() => {
    if (!inputValue?.trim()) return;
    const t = setTimeout(() => applyHighlight(inputValue), 280);
    return () => clearTimeout(t);
  }, [location.pathname]);

  const toggleStreaming = () => {
    if (isPaused) {
      // 전체 스트리밍 재시작
      paperDataService.startStreaming();
      worker1Service.startStreaming();
      worker2Service.startStreaming();
      worker5Service.startStreaming();
      worker6Service.startStreaming();
      setIsPaused(false);
      console.log('전체 스트리밍 재시작');
    } else {
      // 전체 스트리밍 중지
      paperDataService.stopStreaming();
      worker1Service.stopStreaming();
      worker2Service.stopStreaming();
      worker5Service.stopStreaming();
      worker6Service.stopStreaming();
      setIsPaused(true);
      console.log('전체 스트리밍 중지');
    }
  };

  const clearSearch = () => {
    setInputValue("");
    applyHighlight("");
  };

  return (
    <div className={styles.infogruop}>
      <div id="dateBox" className={styles.infobox}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div>
            <label>날짜</label>
            <span className={styles.output}>{currentDateTime}</span>
          </div>
          <button
            onClick={toggleStreaming}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isPaused ? "#4CAF50" : "#f44336",
              fontSize: "16px",
            }}
            title={isPaused ? "재생" : "일시정지"}
          >
            {isPaused ? <FaPlay /> : <FaPause />}
          </button>
        </div>
      </div>

      <div id="paperTypeBox" className={styles.infobox}>
        <label>지종</label>
        <span className={styles.output}>{paperType}</span>
      </div>

      <div id="weightBox" className={styles.infobox}>
        <label>평량</label>
        <span className={styles.output}>{paperWeight}</span>
      </div>

      <div id="lotBox" className={styles.infobox}>
        <label>공정 번호</label>
        <span className={styles.output}>{lotNumber}</span>
      </div>

      <div id="searchBox" className={styles.infobox}>
        <label>검색</label>
        <input
          type="text"
          placeholder="설비/배치/센서 검색..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        {inputValue && (
          <button
            className={styles.clearBtn}
            onClick={clearSearch}
            title="검색어 지우기"
          >
            ×
          </button>
        )}
        <button className={styles.searchBtn}>
          <FaSearch />
        </button>
      </div>
    </div>
  );
}
