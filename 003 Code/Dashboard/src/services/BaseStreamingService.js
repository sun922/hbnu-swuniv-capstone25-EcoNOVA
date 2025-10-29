/* 공통 스트리밍 서비스 베이스 클래스 */
class BaseStreamingService {
  constructor(serverUrl = "http://localhost:4000") {
    this.serverUrl = serverUrl;
    this.isStreaming = false;
    this.eventSource = null;
    this.callbacks = new Set();
    this._reconnectAttempts = 0;
    this._maxReconnect = 7;
    this._reconnectTimer = null;
    this._endpoint = null;
  }

  startStreaming(endpoint = "") {
    if (!endpoint) {
      console.warn(`${this.constructor.name} startStreaming: endpoint가 비었습니다.`);
      return;
    }
    if (this.isStreaming && this.eventSource) {
      console.log(`${this.constructor.name} 이미 스트리밍 중입니다.`);
      return;
    }

    this.stopStreaming();

    this.isStreaming = true;
    this._endpoint = endpoint;

    try {
      const url = `${this.serverUrl}${endpoint}`;
      this.eventSource = new EventSource(url);

      this.eventSource.onopen = () => {
        this._clearReconnect();
        console.log(`${this.constructor.name} 스트리밍 연결 성공`);
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.error) {
            console.error(`${this.constructor.name} 스트리밍 오류:`, data.error);
            this.handleStreamingError(data.error);
            return;
          }
          const processed = this.processStreamingData(data);
          this.notifyCallbacks(processed);
        } catch (e) {
          console.error(`${this.constructor.name} 데이터 파싱 오류:`, e);
        }
      };

      this.eventSource.onerror = (err) => {
        console.error(`${this.constructor.name} EventSource 오류:`, err);
        this._scheduleReconnect();
      };

      console.log(`${this.constructor.name} 스트리밍 시작 (SSE)`);
    } catch (e) {
      console.error(`${this.constructor.name} EventSource 생성 실패:`, e);
      this._scheduleReconnect();
    }
  }

  stopStreaming() {
    this.isStreaming = false;
    if (this.eventSource) {
      try { this.eventSource.close(); } catch {}
      this.eventSource = null;
    }
    this._clearReconnect();
  }

  subscribe(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  notifyCallbacks(data) {
    this.callbacks.forEach((cb) => {
      try { cb(data); } catch (e) { console.error(`${this.constructor.name} 콜백 실행 오류:`, e); }
    });
  }

  processStreamingData(_data) {
    throw new Error("processStreamingData must be implemented by subclass");
  }

  handleStreamingError(errorMsg = "") {
    if (typeof errorMsg === "string" && errorMsg.includes("이미 활성 연결")) {
      this.stopStreaming();
    }
  }

  _scheduleReconnect() {
    if (!this.isStreaming) return;
    if (this._reconnectAttempts >= this._maxReconnect) {
      console.error(`${this.constructor.name} 재연결 한도 초과`);
      return;
    }
    this._reconnectAttempts += 1;
    const delay = Math.min(30000, 1000 * 2 ** (this._reconnectAttempts - 1));
    this._reconnectTimer = setTimeout(() => {
      if (!this.isStreaming) return;
      console.log(`${this.constructor.name} 재연결 시도 #${this._reconnectAttempts} (delay=${delay}ms)`);
      this.startStreaming(this._endpoint);
    }, delay);
  }

  _clearReconnect() {
    this._reconnectAttempts = 0;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }
}

export default BaseStreamingService;
