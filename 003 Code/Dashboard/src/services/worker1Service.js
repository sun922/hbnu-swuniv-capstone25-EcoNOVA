import BaseStreamingService from './BaseStreamingService.js';

/* Worker1 데이터 스트리밍 서비스 */
class Worker1Service extends BaseStreamingService {
    constructor() {
        super();
        this.currentLot = null;
        this.infoBoxTimestamp = null;
        this._setLotInProgress = false;
        this.currentData = {
            similarLots: [],
            similarLotsData: {},
            currentData: {},
            bands: {},
            variableNames: {}
        };
    }

    async initialize() {
        try {
            const response = await fetch(`${this.serverUrl}/api/worker1/init`);
            const data = await response.json();
            return data.status === 'ok';
        } catch (error) {
            console.error('Worker1 초기화 실패:', error);
            return false;
        }
    }

    async setLot(lot) {
        if (this.currentLot === lot || this._setLotInProgress) {
            console.log(`Worker1: setLot 스킵 (이미 ${lot} 설정됨 또는 진행 중)`);
            return { status: 'ok', skipped: true };
        }
        
        this._setLotInProgress = true;
        
        try {
            const response = await fetch(`${this.serverUrl}/api/worker1/set-lot`, {
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
            console.error('Lot 설정 오류:', error);
            throw error;
        } finally {
            this._setLotInProgress = false;
        }
    }

    async getData(minute = null) {
        try {
            const url = minute !== null 
                ? `${this.serverUrl}/api/worker1/data?minute=${minute}`
                : `${this.serverUrl}/api/worker1/data`;
            
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.status === 'ok') {
                this.currentData = data.data;
                return data.data;
            } else {
                throw new Error(data.message || '데이터 조회 실패');
            }
        } catch (error) {
            console.error('데이터 조회 오류:', error);
            throw error;
        }
    }

    startStreaming() {
        super.startStreaming('/api/worker1/stream');
    }

    processStreamingData(data) {
        this.currentData = {
            similarLots: data.similar_lots || [],
            similarLotsData: data.similar_lots_data || {},
            currentLotData: data.current_lot_data || {},
            currentData: data.current_data || {},
            bands: data.bands || {},
            variableNames: data.variable_names || {},
            minute: data.minute || 0,
            current_minute: data.current_minute || data.minute || 0,
            timestamp: data.timestamp,
            time_labels: data.time_labels || data.index_labels || null,
            base_time: data.base_time || null,
        };
        
        return this.currentData;
    }

    transformToChartFormat(data) {
        const { similarLots, similarLotsData, currentLotData, currentData, bands, variableNames, current_minute, time_labels, base_time, timestamp } = data;
        
        if (!similarLots || !similarLotsData || !variableNames) {
            console.warn('Worker1 데이터 구조가 불완전합니다:', data);
            return {};
        }
        
        const chartData = {};
        
        ['x2', 'x3', 'x4', 'x1', 'x5'].forEach(varKey => {
            const varName = variableNames[varKey] || varKey;
            const similarData = similarLotsData[varKey] || {};
            
            const lotKeys = Array.isArray(similarLots) && similarLots.length
                ? similarLots
                : Object.keys(similarData || {}).slice(0, 3);
            
            chartData[varKey] = {
                name: varName,
                current_lot_data: (currentLotData && currentLotData[varKey]) ? currentLotData[varKey] : [],
                current: (currentData && currentData[varKey]) ? currentData[varKey] : 0,
                similar1: similarData[lotKeys[0]] || [],
                similar2: similarData[lotKeys[1]] || [],
                similar3: similarData[lotKeys[2]] || [],
                bands: (bands && bands[varKey]) ? bands[varKey] : {}
            };
        });
        
        return {
            ...chartData,
            current_minute: current_minute,
            time_labels: time_labels,
            base_time: base_time,
            timestamp: timestamp
        };
    }

    setInfoBoxTimestamp(timestamp) {
        this.infoBoxTimestamp = timestamp;
        this.sendInfoBoxTimestamp(timestamp);
    }
    
    async sendInfoBoxTimestamp(timestamp) {
        try {
            const response = await fetch(`${this.serverUrl}/api/worker1/set-timestamp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ timestamp: timestamp })
            });
            
            if (!response.ok) {
                console.error('InfoBox 시간 서버 전달 실패:', timestamp);
            }
        } catch (error) {
            console.error('InfoBox 시간 서버 전달 실패:', error);
        }
    }

    getCurrentData() {
        return this.currentData;
    }
}

const worker1Service = new Worker1Service();

export default worker1Service;
