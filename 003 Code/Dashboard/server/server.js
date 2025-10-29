// server.js
import express from "express";
import cors from "cors";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Node 18+ 환경 가정: 글로벌 fetch 사용

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 4000;

// 스트리밍 간격 설정 (밀리초)
const STREAMING_INTERVAL = 5000; // 5초

// CORS 설정 (credentials 미사용으로 통일)
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: false,
  })
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/**
 * 페이퍼 CSV 재생 상태
 */
let paperData = [];
let currentIndex = 0;
let isDataLoaded = false;

// 시작 지점 설정 (환경변수로 설정 가능, 기본값 50%)
const START_PERCENTAGE = parseInt(process.env.START_PERCENTAGE) || 30;

/**
 * Worker1 Flask 서버 프록시/상태
 */
class WorkerManager {
  constructor() {
    this.worker1Url = "http://localhost:5002/worker1";
    this.isInitialized = false;
    this.currentLot = null;
    this.currentMinute = 0;
    this.lotBaseTime = null; // Flask에서 회신한 기준 시간
    this.infoBoxTimestamp = null; // 클라이언트가 보낸 기준 시간
  }

  async initialize() {
    try {
      const response = await fetch(`${this.worker1Url}/init`);
      const result = await response.json();
      if (result?.status === "ok") {
        this.isInitialized = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error("WorkerManager initialize error:", error);
      return false;
    }
  }

  async setLot(lot) {
    if (!this.isInitialized) {
      throw new Error("WorkerManager not initialized");
    }

    this.currentLot = lot;
    this.currentMinute = 0;  // 리셋
    this.infoBoxTimestamp = null;  // timestamp 리셋하여 자동 진행 모드로 전환

    const response = await fetch(`${this.worker1Url}/set-lot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lot }),
    });

    const result = await response.json();
    if (result?.status === "ok") {
      this.lotBaseTime = result.base_time || null;
      return result;
    }
    throw new Error(result?.message || "Failed to set lot");
  }

  /**
   * Flask로 데이터 조회
   * - minute가 명시되면 해당 분을 기준
   * - 아니면 InfoBox timestamp가 있으면 lotBaseTime과 차이로 targetMinute 계산
   * - 둘 다 없으면 currentMinute 유지
   */
  async getData(minute = null, timestamp = null) {
    if (!this.isInitialized || !this.currentLot) {
      throw new Error("WorkerManager not initialized or no lot set");
    }

    const finalTimestamp = timestamp ?? this.infoBoxTimestamp ?? null;
    let targetMinute = minute;

    if (finalTimestamp && this.lotBaseTime) {
      try {
        const infoTime = new Date(finalTimestamp);
        const baseTime = new Date(this.lotBaseTime);
        const diffMinutes = Math.floor((infoTime - baseTime) / (1000 * 60));
        targetMinute = Math.max(0, diffMinutes);
      } catch (e) {
        console.warn("Timestamp diff calculation error:", e);
        targetMinute = minute ?? this.currentMinute;
      }
    } else if (!finalTimestamp && this.lotBaseTime) {
      // timestamp가 없으면 자동으로 시간 증가 (5초마다 1분씩)
      targetMinute = minute ?? this.currentMinute;
      // this.currentMinute은 이미 설정되어 있음
    } else {
      targetMinute = minute ?? this.currentMinute;
    }

    this.currentMinute = targetMinute ?? 0;

    // 쿼리 구성: 최종 계산된 targetMinute / finalTimestamp 적용
    const params = [];
    if (Number.isFinite(this.currentMinute)) {
      params.push(`minute=${this.currentMinute}`);
    }
    if (finalTimestamp) {
      params.push(`timestamp=${encodeURIComponent(finalTimestamp)}`);
    }
    const url = `${this.worker1Url}/data${params.length ? `?${params.join("&")}` : ""}`;

    try {
      const response = await fetch(url);
      const result = await response.json();

      if (result?.status === "ok") {
        // Python 서버에서 받은 증가된 current_minute를 반영
        this.currentMinute = result.current_minute || (this.currentMinute + 1);
        
        // Python 서버에서 받은 timestamp가 있으면 업데이트
        if (result.timestamp && !finalTimestamp) {
          this.infoBoxTimestamp = result.timestamp;
          console.log('[WorkerManager] Python에서 받은 timestamp 업데이트:', result.timestamp);
        }
        
        return {
          ...result.data,
          current_minute: this.currentMinute,
        };
      }
      throw new Error(result?.message || "Failed to get data");
    } catch (error) {
      console.error("WorkerManager getData error:", error);
      throw error;
    }
  }

  getMockData(minute, timestamp) {
    const baseTime = this.lotBaseTime ? new Date(this.lotBaseTime) : new Date("2022-04-11 06:40");
    const currentTime = timestamp ? new Date(timestamp) : new Date(baseTime.getTime() + minute * 60000);
    const dataLength = 60;

    const timeLabels = [];
    if (timestamp) {
      const infoTime = new Date(timestamp);
      for (let i = 0; i < dataLength; i++) {
        const t = new Date(infoTime.getTime() - (dataLength - 1 - i) * 60000);
        timeLabels.push(t.toTimeString().slice(0, 5));
      }
    } else {
      for (let i = 0; i < dataLength; i++) {
        const t = new Date(baseTime.getTime() + i * 60000);
        timeLabels.push(t.toTimeString().slice(0, 5));
      }
    }

    const rnd = (min, max, f = 3) => parseFloat((min + Math.random() * (max - min)).toFixed(f));

    return {
      similar_lots: ["C1513", "C2891", "C1454"],
      similar_lots_data: {
        x1: { C1513: Array(dataLength).fill(0).map(() => rnd(120, 140)), C2891: Array(dataLength).fill(0).map(() => rnd(125, 140)), C1454: Array(dataLength).fill(0).map(() => rnd(118, 136)) },
        x2: { C1513: Array(dataLength).fill(0).map(() => rnd(700, 900)), C2891: Array(dataLength).fill(0).map(() => rnd(750, 900)), C1454: Array(dataLength).fill(0).map(() => rnd(720, 900)) },
        x3: { C1513: Array(dataLength).fill(0).map(() => rnd(4.5, 5.0)), C2891: Array(dataLength).fill(0).map(() => rnd(4.7, 5.1)), C1454: Array(dataLength).fill(0).map(() => rnd(4.6, 5.2)) },
        x4: { C1513: Array(dataLength).fill(0).map(() => rnd(2.5, 3.0)), C2891: Array(dataLength).fill(0).map(() => rnd(2.7, 3.1)), C1454: Array(dataLength).fill(0).map(() => rnd(2.6, 3.2)) },
        x5: { C1513: Array(dataLength).fill(0).map(() => rnd(8.0, 10.0)), C2891: Array(dataLength).fill(0).map(() => rnd(8.5, 10.0)), C1454: Array(dataLength).fill(0).map(() => rnd(8.2, 10.0)) },
      },
      current_lot_data: {
        x1: Array(dataLength).fill(0).map(() => rnd(120, 140)),
        x2: Array(dataLength).fill(0).map(() => rnd(700, 900)),
        x3: Array(dataLength).fill(0).map(() => rnd(4.5, 5.0)),
        x4: Array(dataLength).fill(0).map(() => rnd(2.5, 3.0)),
        x5: Array(dataLength).fill(0).map(() => rnd(8.0, 10.0)),
      },
      current_data: {
        x1: rnd(120, 140),
        x2: rnd(700, 900),
        x3: rnd(4.5, 5.0),
        x4: rnd(2.5, 3.0),
        x5: rnd(8.0, 10.0),
      },
      bands: {
        x1: { lower: 110.0, ref: 130.0, upper: 150.0 },
        x2: { lower: 650.0, ref: 750.0, upper: 850.0 },
        x3: { lower: 4.0, ref: 4.5, upper: 5.0 },
        x4: { lower: 2.0, ref: 2.5, upper: 3.0 },
        x5: { lower: 7.0, ref: 8.0, upper: 9.0 },
      },
      variable_names: {
        x1: "평량",
        x2: "속도",
        x3: "수분",
        x4: "건조기 압력",
        x5: "지료 유량",
      },
      time_labels: timeLabels,
      timestamp: timestamp || currentTime.toISOString().slice(0, 16).replace("T", " "),
    };
  }

  setInfoBoxTimestamp(timestamp) {
    this.infoBoxTimestamp = timestamp || null;
  }

  stop() {
    this.isInitialized = false;
  }
}

/**
 * Worker2 Flask 서버 프록시/상태
 */
class WorkerManager2 {
  constructor() {
    this.worker2Url = "http://localhost:5002/worker2";
    this.isInitialized = false;
    this.currentLot = null;
    this.currentMinute = 0;
    this.lotBaseTime = null; // Flask에서 회신한 기준 시간
    this.infoBoxTimestamp = null; // 클라이언트가 보낸 기준 시간
  }

  async initialize() {
    try {
      const response = await fetch(`${this.worker2Url}/init`);
      const result = await response.json();
      if (result?.status === "ok") {
        this.isInitialized = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error("WorkerManager2 initialize error:", error);
      return false;
    }
  }

  async setLot(lot) {
    if (!this.isInitialized) {
      throw new Error("WorkerManager2 not initialized");
    }

    this.currentLot = lot;
    this.currentMinute = 0;  // 리셋
    this.infoBoxTimestamp = null;  // timestamp 리셋하여 자동 진행 모드로 전환

    const response = await fetch(`${this.worker2Url}/set-lot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lot }),
    });

    const result = await response.json();
    if (result?.status === "ok") {
      this.lotBaseTime = result.base_time || null;
      return result;
    }
    throw new Error(result?.message || "Failed to set lot");
  }

  /**
   * Flask로 데이터 조회
   * - minute가 명시되면 해당 분을 기준
   * - 아니면 InfoBox timestamp가 있으면 lotBaseTime과 차이로 targetMinute 계산
   * - 둘 다 없으면 currentMinute 유지
   */
  async getData(minute = null, timestamp = null) {
    if (!this.isInitialized || !this.currentLot) {
      throw new Error("WorkerManager2 not initialized or no lot set");
    }

    // Worker1과 동일한 로직으로 timestamp 계산
    const finalTimestamp = timestamp ?? this.infoBoxTimestamp ?? null;
    let targetMinute = minute;

    if (finalTimestamp && this.lotBaseTime) {
      try {
        const infoTime = new Date(finalTimestamp);
        const baseTime = new Date(this.lotBaseTime);
        const diffMinutes = Math.floor((infoTime - baseTime) / (1000 * 60));
        targetMinute = Math.max(0, diffMinutes);
      } catch (e) {
        console.warn("Worker2 timestamp diff calculation error:", e);
        targetMinute = minute ?? this.currentMinute;
      }
    } else if (!finalTimestamp && this.lotBaseTime) {
      // timestamp가 없으면 자동으로 시간 증가 (5초마다 1분씩)
      targetMinute = minute ?? this.currentMinute;
    } else {
      targetMinute = minute ?? this.currentMinute;
    }

    this.currentMinute = targetMinute ?? 0;

    // 쿼리 구성: 최종 계산된 targetMinute / finalTimestamp 적용
    const params = [];
    if (Number.isFinite(this.currentMinute)) {
      params.push(`minute=${this.currentMinute}`);
    }
    if (finalTimestamp) {
      params.push(`timestamp=${encodeURIComponent(finalTimestamp)}`);
    }
    const url = `${this.worker2Url}/data${params.length ? `?${params.join("&")}` : ""}`;

    try {
      const response = await fetch(url);
      const result = await response.json();

      if (result?.status === "ok") {
        // Python 서버에서 받은 증가된 current_minute를 반영 (Worker1과 동일)
        this.currentMinute = result.current_minute || (this.currentMinute + 1);
        
        // Python 서버에서 받은 timestamp가 있으면 업데이트
        if (result.timestamp && !finalTimestamp) {
          this.infoBoxTimestamp = result.timestamp;
          console.log('[WorkerManager2] Python에서 받은 timestamp 업데이트:', result.timestamp);
        }
        
        return {
          ...result.data,
          current_minute: this.currentMinute,
        };
      }
      throw new Error(result?.message || "Failed to get data");
    } catch (error) {
      console.error("WorkerManager2 getData error:", error);
      throw error;
    }
  }

  setInfoBoxTimestamp(timestamp) {
    this.infoBoxTimestamp = timestamp || null;
  }

  stop() {
    this.isInitialized = false;
  }
}

/**
 * Worker5 Flask 서버 프록시/상태
 */
class WorkerManager5 {
  constructor() {
    this.worker5Url = "http://localhost:5002/worker5";
    this.isInitialized = false;
    this.currentLot = null;
    this.currentMinute = 0;
    this.lotBaseTime = null;
    this.infoBoxTimestamp = null;
  }

  async initialize() {
    try {
      const response = await fetch(`${this.worker5Url}/init`);
      const result = await response.json();
      if (result?.status === "ok") {
        this.isInitialized = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error("WorkerManager5 initialize error:", error);
      return false;
    }
  }

  async setLot(lot) {
    if (!this.isInitialized) {
      throw new Error("WorkerManager5 not initialized");
    }

    this.currentLot = lot;
    this.currentMinute = 0;
    this.infoBoxTimestamp = null;  // timestamp 리셋하여 자동 진행 모드로 전환

    const response = await fetch(`${this.worker5Url}/set-lot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lot }),
    });

    const result = await response.json();
    if (result?.status === "ok") {
      this.lotBaseTime = result.base_time || null;
      return result;
    }
    throw new Error(result?.message || "Failed to set lot");
  }

  async getData(minute = null, timestamp = null) {
    if (!this.isInitialized || !this.currentLot) {
      throw new Error("WorkerManager5 not initialized or no lot set");
    }

    const finalTimestamp = timestamp ?? this.infoBoxTimestamp ?? null;
    let targetMinute = minute;

    if (finalTimestamp && this.lotBaseTime) {
      try {
        const infoTime = new Date(finalTimestamp);
        const baseTime = new Date(this.lotBaseTime);
        const diffMinutes = Math.floor((infoTime - baseTime) / (1000 * 60));
        targetMinute = Math.max(0, diffMinutes);
      } catch (e) {
        console.warn("Worker5 timestamp diff calculation error:", e);
        targetMinute = minute ?? this.currentMinute;
      }
    } else if (!finalTimestamp && this.lotBaseTime) {
      targetMinute = minute ?? this.currentMinute;
    } else {
      targetMinute = minute ?? this.currentMinute;
    }

    this.currentMinute = targetMinute ?? 0;

    const params = [];
    if (Number.isFinite(this.currentMinute)) {
      params.push(`minute=${this.currentMinute}`);
    }
    if (finalTimestamp) {
      params.push(`timestamp=${encodeURIComponent(finalTimestamp)}`);
    }
    const url = `${this.worker5Url}/data${params.length ? `?${params.join("&")}` : ""}`;

    try {
      const response = await fetch(url);
      const result = await response.json();

      if (result?.status === "ok") {
        this.currentMinute = result.current_minute || (this.currentMinute + 1);
        
        if (result.timestamp && !finalTimestamp) {
          this.infoBoxTimestamp = result.timestamp;
          console.log('[WorkerManager5] Python에서 받은 timestamp 업데이트:', result.timestamp);
        }
        
        return {
          ...result.data,
          current_minute: this.currentMinute,
        };
      }
      throw new Error(result?.message || "Failed to get data");
    } catch (error) {
      console.error("WorkerManager5 getData error:", error);
      throw error;
    }
  }

  setInfoBoxTimestamp(timestamp) {
    this.infoBoxTimestamp = timestamp || null;
  }

  stop() {
    this.isInitialized = false;
  }
}

/**
 * Worker6 Flask 서버 프록시/상태
 */
class WorkerManager6 {
  constructor() {
    this.worker6Url = "http://localhost:5002/worker6";
    this.isInitialized = false;
    this.currentLot = null;
    this.currentMinute = 0;
    this.lotBaseTime = null;
    this.infoBoxTimestamp = null;
  }

  async initialize() {
    try {
      const response = await fetch(`${this.worker6Url}/init`);
      const result = await response.json();
      if (result?.status === "ok") {
        this.isInitialized = true;
        return true;
      }
      return false;
    } catch (error) {
      console.error("WorkerManager6 initialize error:", error);
      return false;
    }
  }

  async setLot(lot) {
    if (!this.isInitialized) {
      throw new Error("WorkerManager6 not initialized");
    }

    this.currentLot = lot;
    this.currentMinute = 0;
    this.infoBoxTimestamp = null;  // timestamp 리셋하여 자동 진행 모드로 전환

    const response = await fetch(`${this.worker6Url}/set-lot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lot }),
    });

    const result = await response.json();
    if (result?.status === "ok") {
      this.lotBaseTime = result.base_time || null;
      return result;
    }
    throw new Error(result?.message || "Failed to set lot");
  }

  async getData(minute = null, timestamp = null) {
    if (!this.isInitialized || !this.currentLot) {
      throw new Error("WorkerManager6 not initialized or no lot set");
    }

    const finalTimestamp = timestamp ?? this.infoBoxTimestamp ?? null;
    let targetMinute = minute;

    if (finalTimestamp && this.lotBaseTime) {
      try {
        const infoTime = new Date(finalTimestamp);
        const baseTime = new Date(this.lotBaseTime);
        const diffMinutes = Math.floor((infoTime - baseTime) / (1000 * 60));
        targetMinute = Math.max(0, diffMinutes);
      } catch (e) {
        console.warn("Worker6 timestamp diff calculation error:", e);
        targetMinute = minute ?? this.currentMinute;
      }
    } else if (!finalTimestamp && this.lotBaseTime) {
      targetMinute = minute ?? this.currentMinute;
    } else {
      targetMinute = minute ?? this.currentMinute;
    }

    this.currentMinute = targetMinute ?? 0;

    const params = [];
    if (Number.isFinite(this.currentMinute)) {
      params.push(`minute=${this.currentMinute}`);
    }
    if (finalTimestamp) {
      params.push(`timestamp=${encodeURIComponent(finalTimestamp)}`);
    }
    const url = `${this.worker6Url}/data${params.length ? `?${params.join("&")}` : ""}`;

    try {
      const response = await fetch(url);
      const result = await response.json();

      if (result?.status === "ok") {
        // Python 서버에서 받은 minute 값 사용 (요청한 분 그대로)
        this.currentMinute = result.minute ?? result.current_minute ?? this.currentMinute;
        
        if (result.timestamp && !finalTimestamp) {
          this.infoBoxTimestamp = result.timestamp;
          console.log('[WorkerManager6] Python에서 받은 timestamp 업데이트:', result.timestamp);
        }
        
        return {
          ...result.data,
          current_minute: this.currentMinute,
        };
      }
      throw new Error(result?.message || "Failed to get data");
    } catch (error) {
      console.error("WorkerManager6 getData error:", error);
      throw error;
    }
  }

  setInfoBoxTimestamp(timestamp) {
    this.infoBoxTimestamp = timestamp || null;
  }

  stop() {
    this.isInitialized = false;
  }
}

const workerManager = new WorkerManager();
const workerManager2 = new WorkerManager2();
const workerManager5 = new WorkerManager5();
const workerManager6 = new WorkerManager6();

/**
 * CSV 로드
 */
const loadPaperData = async () => {
  try {
    const csvPath = path.join(__dirname, "..", "public", "worker_dashboard", "simulate_paper_data.csv");
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found: ${csvPath}`);
    }

    const csvContent = fs.readFileSync(csvPath, "utf8");
    const lines = csvContent.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      throw new Error("CSV has no data rows.");
    }

    const headers = lines[0].split(",").map((h) => h.trim());
    paperData = lines
      .slice(1)
      .filter((line) => line.trim())
      .map((line, index) => {
        try {
          const values = line.split(",");
          const record = {};
          headers.forEach((header, i) => {
            record[header] = values[i]?.trim() || "";
          });
          return record;
        } catch (e) {
          console.warn(`CSV parse warning at line ${index + 2}:`, e.message);
          return null;
        }
      })
      .filter(Boolean);

    currentIndex = Math.floor((paperData.length * START_PERCENTAGE) / 100);
    isDataLoaded = true;

    console.log(`Paper data loaded: ${paperData.length} rows`);
    console.log(`Start index at ${START_PERCENTAGE}% → ${currentIndex}`);
  } catch (error) {
    console.error("Failed to load paper data:", error.message);
    isDataLoaded = false;
  }
};

// 부팅시 CSV 로드
loadPaperData();

/**
 * Paper Data REST
 */
app.get("/api/paper-data", (req, res) => {
  try {
    if (!isDataLoaded) {
      return res.status(503).json({ error: "Data not loaded yet.", message: "Try again later." });
    }
    const { page = 1, limit = 1 } = req.query;
    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const startIndex = (pageNum - 1) * limitNum;
    const endIndex = startIndex + limitNum;

    const data = paperData.slice(startIndex, endIndex);
    const total = paperData.length;
    res.json({ data, total, currentPage: pageNum, hasNext: endIndex < total, success: true });
  } catch (error) {
    console.error("paper-data error:", error);
    res.status(500).json({ error: "Internal server error.", message: error.message });
  }
});

app.get("/api/paper-data/current", (req, res) => {
  try {
    if (!isDataLoaded) {
      return res.status(503).json({ error: "Data not loaded yet.", message: "Try again later." });
    }
    if (paperData.length === 0) {
      return res.status(404).json({ error: "No data.", message: "No loaded data." });
    }
    const data = paperData[currentIndex];
    res.json({ ...data, success: true });
  } catch (error) {
    console.error("paper-data/current error:", error);
    res.status(500).json({ error: "Internal server error.", message: error.message });
  }
});

app.get("/api/paper-data/next", (req, res) => {
  try {
    if (!isDataLoaded) {
      return res.status(503).json({ error: "Data not loaded yet.", message: "Try again later." });
    }
    if (paperData.length === 0) {
      return res.status(404).json({ error: "No data.", message: "No loaded data." });
    }
    currentIndex = (currentIndex + 1) % paperData.length;
    const data = paperData[currentIndex];
    res.json({ ...data, success: true });
  } catch (error) {
    console.error("paper-data/next error:", error);
    res.status(500).json({ error: "Internal server error.", message: error.message });
  }
});

/**
 * Paper Data SSE
 */
app.get("/api/paper-data/stream", (req, res) => {
  try {
    if (!isDataLoaded || paperData.length === 0) {
      res.writeHead(isDataLoaded ? 404 : 503, {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "X-Accel-Buffering": "no",
      });
      res.write(
        `data: ${JSON.stringify({
          error: isDataLoaded ? "No data." : "Data not loaded yet.",
        })}\n\n`
      );
      res.end();
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    });

    // heartbeat
    const ping = setInterval(() => {
      try {
        res.write(`:ping\n\n`);
      } catch {}
    }, 25000);

    const interval = setInterval(() => {
      try {
        currentIndex = (currentIndex + 1) % paperData.length;
        const raw = paperData[currentIndex];
        const out = { ...raw };
        if (out.timestamp && typeof out.timestamp === "string" && out.timestamp.includes(":")) {
          out.timestamp = out.timestamp.replace(/:\d{2}$/, "");
        }
        res.write(`data: ${JSON.stringify({ ...out, success: true })}\n\n`);
      } catch (err) {
        res.write(`data: ${JSON.stringify({ error: "Stream send error", message: err.message })}\n\n`);
      }
    }, STREAMING_INTERVAL);

    req.on("close", () => {
      clearInterval(interval);
      clearInterval(ping);
    });

    req.on("error", () => {
      clearInterval(interval);
      clearInterval(ping);
    });
  } catch (error) {
    console.error("paper-data/stream init error:", error);
    res.writeHead(500, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(`data: ${JSON.stringify({ error: "Stream init error", message: error.message })}\n\n`);
    res.end();
  }
});

/**
 * Worker1 API (Flask 프록시)
 */

// InfoBox timestamp 설정
app.post("/api/worker1/set-timestamp", (req, res) => {
  try {
    const { timestamp } = req.body || {};
    if (!timestamp) {
      return res.status(400).json({ status: "error", message: "Timestamp required" });
    }
    workerManager.setInfoBoxTimestamp(timestamp);
    res.json({ status: "ok", message: "InfoBox timestamp set" });
  } catch (error) {
    console.error("set-timestamp error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 초기화
app.get("/api/worker1/init", async (req, res) => {
  try {
    const success = await workerManager.initialize();
    res.json({
      status: success ? "ok" : "error",
      message: success ? "Worker1 initialized" : "Worker1 initialization failed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("worker1 init error:", error);
    res.status(500).json({ status: "error", message: error.message, timestamp: new Date().toISOString() });
  }
});

// LOT 설정
app.post("/api/worker1/set-lot", async (req, res) => {
  try {
    const { lot } = req.body || {};
    if (!lot) return res.status(400).json({ error: "Lot is required" });

    const result = await workerManager.setLot(lot);
    res.json({
      status: "ok",
      lot,
      similar_lots: result.similar_lots,
      y_current: result.y_current,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("set-lot error:", error);
    res.status(500).json({ status: "error", message: error.message, timestamp: new Date().toISOString() });
  }
});

// 데이터 조회
app.get("/api/worker1/data", async (req, res) => {
  try {
    const { minute, timestamp } = req.query || {};
    const parsedMinute = Number.isFinite(parseInt(minute, 10)) ? parseInt(minute, 10) : null;
    const data = await workerManager.getData(parsedMinute, timestamp || null);
    res.json({ status: "ok", data, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("worker1/data error:", error);
    res.status(500).json({ status: "error", message: error.message, timestamp: new Date().toISOString() });
  }
});

// Worker1 SSE
app.get("/api/worker1/stream", (req, res) => {
  try {
    if (!workerManager.isInitialized) {
      res.writeHead(503, {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "X-Accel-Buffering": "no",
      });
      res.write(`data: ${JSON.stringify({ error: "Worker1 not initialized" })}\n\n`);
      res.end();
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    });

    // heartbeat
    const ping = setInterval(() => {
      try {
        res.write(`:ping\n\n`);
      } catch {}
    }, 25000);

    const interval = setInterval(async () => {
      try {
        // InfoBox의 timestamp를 항상 사용 (자동 동기화)
        const timestampToUse = workerManager.infoBoxTimestamp;
        console.log('[Worker1 Stream] infoBoxTimestamp:', timestampToUse, 'currentMinute:', workerManager.currentMinute);
        
        const data = await workerManager.getData(null, timestampToUse);
        const payload = {
          ...data,
          success: true,
          timestamp: data?.timestamp || new Date().toISOString(),
        };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch (error) {
        res.write(`data: ${JSON.stringify({ error: "stream error", message: error.message })}\n\n`);
      }
    }, STREAMING_INTERVAL);

    req.on("close", () => {
      clearInterval(interval);
      clearInterval(ping);
    });

    req.on("error", () => {
      clearInterval(interval);
      clearInterval(ping);
    });
  } catch (error) {
    console.error("worker1/stream init error:", error);
    res.writeHead(500, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(`data: ${JSON.stringify({ error: "Stream init error", message: error.message })}\n\n`);
    res.end();
  }
});

/**
 * Worker2 API 엔드포인트
 */

// InfoBox timestamp 설정
app.post("/api/worker2/set-timestamp", (req, res) => {
  try {
    const { timestamp } = req.body || {};
    if (!timestamp) {
      return res.status(400).json({ status: "error", message: "Timestamp required" });
    }
    workerManager2.setInfoBoxTimestamp(timestamp);
    res.json({ status: "ok", message: "InfoBox timestamp set" });
  } catch (error) {
    console.error("worker2 set-timestamp error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 초기화
app.get("/api/worker2/init", async (req, res) => {
  try {
    const success = await workerManager2.initialize();
    res.json({
      status: success ? "ok" : "error",
      message: success ? "Worker2 initialized" : "Worker2 initialization failed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("worker2 init error:", error);
    res.status(500).json({ status: "error", message: error.message, timestamp: new Date().toISOString() });
  }
});

// LOT 설정
app.post("/api/worker2/set-lot", async (req, res) => {
  try {
    const { lot } = req.body || {};
    if (!lot) return res.status(400).json({ error: "Lot is required" });

    const result = await workerManager2.setLot(lot);
    res.json({
      status: "ok",
      lot,
      max_minutes: result.max_minutes,
      base_time: result.base_time,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("worker2 set-lot error:", error);
    res.status(500).json({ status: "error", message: error.message, timestamp: new Date().toISOString() });
  }
});

// 데이터 조회
app.get("/api/worker2/data", async (req, res) => {
  try {
    const { minute, timestamp } = req.query || {};
    const parsedMinute = Number.isFinite(parseInt(minute, 10)) ? parseInt(minute, 10) : null;
    const data = await workerManager2.getData(parsedMinute, timestamp || null);
    res.json({ status: "ok", data, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("worker2/data error:", error);
    res.status(500).json({ status: "error", message: error.message, timestamp: new Date().toISOString() });
  }
});

// Worker2 SSE
app.get("/api/worker2/stream", (req, res) => {
  try {
    if (!workerManager2.isInitialized) {
      res.writeHead(503, {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "X-Accel-Buffering": "no",
      });
      res.write(`data: ${JSON.stringify({ error: "Worker2 not initialized" })}\n\n`);
      res.end();
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    });

    // heartbeat
    const ping = setInterval(() => {
      try {
        res.write(`:ping\n\n`);
      } catch {}
    }, 25000);

    const interval = setInterval(async () => {
      try {
        // InfoBox의 timestamp를 항상 사용 (자동 동기화) - Worker1과 동일하게
        const timestampToUse = workerManager2.infoBoxTimestamp;
        console.log('[Worker2 Stream] infoBoxTimestamp:', timestampToUse, 'currentMinute:', workerManager2.currentMinute);
        
        const data = await workerManager2.getData(null, timestampToUse);
        const payload = {
          ...data,
          success: true,
          timestamp: data?.timestamp || new Date().toISOString(),
        };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch (error) {
        res.write(`data: ${JSON.stringify({ error: "stream error", message: error.message })}\n\n`);
      }
    }, STREAMING_INTERVAL);

    req.on("close", () => {
      clearInterval(interval);
      clearInterval(ping);
    });

    req.on("error", () => {
      clearInterval(interval);
      clearInterval(ping);
    });
  } catch (error) {
    console.error("worker2/stream init error:", error);
    res.writeHead(500, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(`data: ${JSON.stringify({ error: "Stream init error", message: error.message })}\n\n`);
    res.end();
  }
});

/**
 * Worker5 API 엔드포인트
 */

// InfoBox timestamp 설정
app.post("/api/worker5/set-timestamp", (req, res) => {
  try {
    const { timestamp } = req.body || {};
    if (!timestamp) {
      return res.status(400).json({ status: "error", message: "Timestamp required" });
    }
    workerManager5.setInfoBoxTimestamp(timestamp);
    res.json({ status: "ok", message: "InfoBox timestamp set" });
  } catch (error) {
    console.error("worker5 set-timestamp error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 초기화
app.get("/api/worker5/init", async (req, res) => {
  try {
    const success = await workerManager5.initialize();
    res.json({
      status: success ? "ok" : "error",
      message: success ? "Worker5 initialized" : "Worker5 initialization failed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("worker5 init error:", error);
    res.status(500).json({ status: "error", message: error.message, timestamp: new Date().toISOString() });
  }
});

// LOT 설정
app.post("/api/worker5/set-lot", async (req, res) => {
  try {
    const { lot } = req.body || {};
    if (!lot) return res.status(400).json({ error: "Lot is required" });

    const result = await workerManager5.setLot(lot);
    res.json({
      status: "ok",
      lot,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("worker5 set-lot error:", error);
    res.status(500).json({ status: "error", message: error.message, timestamp: new Date().toISOString() });
  }
});

// 데이터 조회
app.get("/api/worker5/data", async (req, res) => {
  try {
    const { minute, timestamp } = req.query || {};
    const parsedMinute = Number.isFinite(parseInt(minute, 10)) ? parseInt(minute, 10) : null;
    const data = await workerManager5.getData(parsedMinute, timestamp || null);
    res.json({ status: "ok", data, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("worker5/data error:", error);
    res.status(500).json({ status: "error", message: error.message, timestamp: new Date().toISOString() });
  }
});

// Worker5 SSE
app.get("/api/worker5/stream", (req, res) => {
  try {
    if (!workerManager5.isInitialized) {
      res.writeHead(503, {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "X-Accel-Buffering": "no",
      });
      res.write(`data: ${JSON.stringify({ error: "Worker5 not initialized" })}\n\n`);
      res.end();
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    });

    // heartbeat
    const ping = setInterval(() => {
      try {
        res.write(`:ping\n\n`);
      } catch {}
    }, 25000);

    const interval = setInterval(async () => {
      try {
        const timestampToUse = workerManager5.infoBoxTimestamp;
        console.log('[Worker5 Stream] infoBoxTimestamp:', timestampToUse, 'currentMinute:', workerManager5.currentMinute);
        
        const data = await workerManager5.getData(null, timestampToUse);
        const payload = {
          ...data,
          success: true,
          timestamp: data?.timestamp || new Date().toISOString(),
        };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch (error) {
        res.write(`data: ${JSON.stringify({ error: "stream error", message: error.message })}\n\n`);
      }
    }, STREAMING_INTERVAL);

    req.on("close", () => {
      clearInterval(interval);
      clearInterval(ping);
    });

    req.on("error", () => {
      clearInterval(interval);
      clearInterval(ping);
    });
  } catch (error) {
    console.error("worker5/stream init error:", error);
    res.writeHead(500, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(`data: ${JSON.stringify({ error: "Stream init error", message: error.message })}\n\n`);
    res.end();
  }
});

/**
 * Worker6 API 엔드포인트
 */

// InfoBox timestamp 설정
app.post("/api/worker6/set-timestamp", (req, res) => {
  try {
    const { timestamp } = req.body || {};
    if (!timestamp) {
      return res.status(400).json({ status: "error", message: "Timestamp required" });
    }
    workerManager6.setInfoBoxTimestamp(timestamp);
    res.json({ status: "ok", message: "InfoBox timestamp set" });
  } catch (error) {
    console.error("worker6 set-timestamp error:", error);
    res.status(500).json({ status: "error", message: error.message });
  }
});

// 초기화
app.get("/api/worker6/init", async (req, res) => {
  try {
    const success = await workerManager6.initialize();
    res.json({
      status: success ? "ok" : "error",
      message: success ? "Worker6 initialized" : "Worker6 initialization failed",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("worker6 init error:", error);
    res.status(500).json({ status: "error", message: error.message, timestamp: new Date().toISOString() });
  }
});

// LOT 설정
app.post("/api/worker6/set-lot", async (req, res) => {
  try {
    const { lot } = req.body || {};
    if (!lot) return res.status(400).json({ error: "Lot is required" });

    const result = await workerManager6.setLot(lot);
    res.json({
      status: "ok",
      lot,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("worker6 set-lot error:", error);
    res.status(500).json({ status: "error", message: error.message, timestamp: new Date().toISOString() });
  }
});

// 데이터 조회
app.get("/api/worker6/data", async (req, res) => {
  try {
    const { minute, timestamp } = req.query || {};
    const parsedMinute = Number.isFinite(parseInt(minute, 10)) ? parseInt(minute, 10) : null;
    const data = await workerManager6.getData(parsedMinute, timestamp || null);
    res.json({ status: "ok", data, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("worker6/data error:", error);
    res.status(500).json({ status: "error", message: error.message, timestamp: new Date().toISOString() });
  }
});

// Worker6 SSE
app.get("/api/worker6/stream", (req, res) => {
  try {
    if (!workerManager6.isInitialized) {
      res.writeHead(503, {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "X-Accel-Buffering": "no",
      });
      res.write(`data: ${JSON.stringify({ error: "Worker6 not initialized" })}\n\n`);
      res.end();
      return;
    }

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": "*",
      "X-Accel-Buffering": "no",
    });

    // heartbeat
    const ping = setInterval(() => {
      try {
        res.write(`:ping\n\n`);
      } catch {}
    }, 25000);

    const interval = setInterval(async () => {
      try {
        const timestampToUse = workerManager6.infoBoxTimestamp;
        console.log('[Worker6 Stream] infoBoxTimestamp:', timestampToUse, 'currentMinute:', workerManager6.currentMinute);
        
        const data = await workerManager6.getData(null, timestampToUse);
        const payload = {
          ...data,
          success: true,
          timestamp: data?.timestamp || new Date().toISOString(),
        };
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch (error) {
        res.write(`data: ${JSON.stringify({ error: "stream error", message: error.message })}\n\n`);
      }
    }, STREAMING_INTERVAL);

    req.on("close", () => {
      clearInterval(interval);
      clearInterval(ping);
    });

    req.on("error", () => {
      clearInterval(interval);
      clearInterval(ping);
    });
  } catch (error) {
    console.error("worker6/stream init error:", error);
    res.writeHead(500, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(`data: ${JSON.stringify({ error: "Stream init error", message: error.message })}\n\n`);
    res.end();
  }
});

/**
 * 헬스체크
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    dataLoaded: isDataLoaded,
    dataCount: paperData.length,
    currentIndex,
    startPercentage: START_PERCENTAGE,
    worker1Initialized: workerManager.isInitialized,
    worker1CurrentLot: workerManager.currentLot,
    worker2Initialized: workerManager2.isInitialized,
    worker2CurrentLot: workerManager2.currentLot,
    uptime: process.uptime(),
  });
});

/**
 * 404 핸들러
 */
app.use((req, res) => {
  res.status(404).json({
    error: "API endpoint not found.",
    message: `${req.method} ${req.path} does not exist.`,
    availableEndpoints: [
      "GET /api/health",
      "GET /api/paper-data",
      "GET /api/paper-data/current",
      "GET /api/paper-data/next",
      "GET /api/paper-data/stream",
      "GET /api/worker1/init",
      "POST /api/worker1/set-lot",
      "POST /api/worker1/set-timestamp",
      "GET /api/worker1/data",
      "GET /api/worker1/stream",
      "GET /api/worker2/init",
      "POST /api/worker2/set-lot",
      "POST /api/worker2/set-timestamp",
      "GET /api/worker2/data",
      "GET /api/worker2/stream",
    ],
  });
});

/**
 * 전역 에러 핸들러
 */
app.use((error, req, res, next) => {
  console.error("Unhandled error:", error);
  res.status(500).json({
    error: "Internal server error.",
    message: process.env.NODE_ENV === "development" ? error.message : "Unknown server error.",
    timestamp: new Date().toISOString(),
  });
});

/**
 * 종료 처리
 */
process.on("SIGINT", () => {
  console.log("Shutting down...");
  workerManager.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("Shutting down...");
  workerManager.stop();
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

/**
 * 부팅
 */
app.listen(port, async () => {
  console.log(`Server running on http://localhost:${port}`);
  console.log(`Health check: http://localhost:${port}/api/health`);
  console.log(`Paper stream: http://localhost:${port}/api/paper-data/stream`);

  try {
    const success = await workerManager.initialize();
    if (success) {
      console.log("Worker1 initialized");
    } else {
      console.log("Worker1 init failed (manual init required)");
    }
  } catch (error) {
    console.error("Worker1 auto init error:", error);
  }
});
