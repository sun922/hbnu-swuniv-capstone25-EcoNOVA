// lotSyncService.js (교체)

// InfoBox와 Worker1 간의 lot 동기화 서비스
class LotSyncService {
  constructor() {
    this.currentLot = null;
    this.currentTimestamp = null;
    this.callbacks = new Set();
  }

  setCurrentLot(lot, timestamp = null) {
    const sameLot = this.currentLot === lot;
    const sameTs = this.currentTimestamp === timestamp;
    // 동일하면 불필요 브로드캐스트 방지
    if (sameLot && sameTs) return;

    this.currentLot = lot;
    // timestamp가 유효한 값일 때만 업데이트 (빈 문자열이면 기존 유지)
    if (timestamp && timestamp.trim()) {
      this.currentTimestamp = timestamp;
    }
    this.notifyCallbacks({ lot, timestamp });
  }

  getCurrentLot() {
    return { lot: this.currentLot, timestamp: this.currentTimestamp };
  }

  subscribe(callback) {
    this.callbacks.add(callback);
    return () => this.callbacks.delete(callback);
  }

  notifyCallbacks(data) {
    this.callbacks.forEach((cb) => {
      try { 
        cb(data); 
      } catch (e) { 
        console.error("LotSync 콜백 오류:", e); 
      }
    });
  }
}

// 싱글톤
const lotSyncService = new LotSyncService();
export default lotSyncService;
