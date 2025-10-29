import BaseStreamingService from './BaseStreamingService.js';

/* Worker5 데이터 스트리밍 서비스 */
class Worker5Service extends BaseStreamingService {
    constructor() {
        super();
        this.currentLot = null;
        this.infoBoxTimestamp = null;
        this._setLotInProgress = false;
        this.currentData = {
            importanceData: [],
            timeLabels: [],
            currentMinute: 0
        };
    }

    async initialize() {
        try {
            const response = await fetch(`${this.serverUrl}/api/worker5/init`);
            const data = await response.json();
            return data.status === 'ok';
        } catch (error) {
            console.error('Worker5 초기화 실패:', error);
            return false;
        }
    }

    async setLot(lot) {
        if (this.currentLot === lot || this._setLotInProgress) {
            console.log(`Worker5: setLot 스킵 (이미 ${lot} 설정됨 또는 진행 중)`);
            return { status: 'ok', skipped: true };
        }
        
        this._setLotInProgress = true;
        
        try {
            const response = await fetch(`${this.serverUrl}/api/worker5/set-lot`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ lot: lot })
            });
            const data = await response.json();
            
            if (data.status === 'ok') {
                this.currentLot = lot;
                return data;
            } else {
                throw new Error(data.message || 'Lot 설정 실패');
            }
        } catch (error) {
            console.error('Worker5 Lot 설정 오류:', error);
            throw error;
        } finally {
            this._setLotInProgress = false;
        }
    }

    async getData(minute = null) {
        try {
            const url = minute !== null 
                ? `${this.serverUrl}/api/worker5/data?minute=${minute}`
                : `${this.serverUrl}/api/worker5/data`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'ok') {
                this.currentData = data.data;
                return data.data;
            } else {
                throw new Error(data.message || '데이터 조회 실패');
            }
        } catch (error) {
            console.error('Worker5 데이터 조회 오류:', error);
            throw error;
        }
    }

    startStreaming() {
        super.startStreaming('/api/worker5/stream');
    }

    processStreamingData(data) {
        this.currentData = {
            importanceData: data.importance_data || [],
            timeLabels: data.time_labels || [],
            currentMinute: data.current_minute || data.minute || 0,
            timestamp: data.timestamp,
            base_time: data.base_time || null,
        };
        
        return this.currentData;
    }

    transformToChartFormat(data) {
        const { importanceData, timeLabels, currentMinute, timestamp, base_time } = data;
        
        if (!importanceData) {
            console.warn('Worker5 데이터 구조가 불완전합니다:', data);
            return {};
        }
        
        return {
            importanceData: importanceData,
            timeLabels: timeLabels,
            currentMinute: currentMinute,
            timestamp: timestamp,
            base_time: base_time
        };
    }

    setInfoBoxTimestamp(timestamp) {
        this.infoBoxTimestamp = timestamp;
        this.sendInfoBoxTimestamp(timestamp);
    }
    
    async sendInfoBoxTimestamp(timestamp) {
        try {
            const response = await fetch(`${this.serverUrl}/api/worker5/set-timestamp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ timestamp: timestamp })
            });
            
            if (!response.ok) {
                console.error('Worker5 InfoBox 시간 서버 전달 실패:', timestamp);
            }
        } catch (error) {
            console.error('Worker5 InfoBox 시간 서버 전달 실패:', error);
        }
    }

    getCurrentData() {
        return this.currentData;
    }

    getImportanceDataForChart() {
        const { importanceData } = this.currentData;
        
        if (!importanceData || importanceData.length === 0) {
            return [];
        }

        return importanceData.map(item => ({
            name: item.name,
            value: item.importance
        }));
    }
}

const worker5Service = new Worker5Service();

export default worker5Service;

