import BaseStreamingService from './BaseStreamingService.js';

/* 페이퍼 데이터 스트리밍 서비스 */
class PaperDataService extends BaseStreamingService {
    constructor() {
        super();
    }

    async loadData() {
        try {
            const response = await fetch(`${this.serverUrl}/api/paper-data/current`);
            const data = await response.json();
            return true;
        } catch (error) {
            console.error('서버 연결 실패:', error);
            return false;
        }
    }

    startStreaming() {
        super.startStreaming('/api/paper-data/stream');
    }

    processStreamingData(data) {
        return data;
    }

    formatData(rawData) {
        if (!rawData) return null;

        return {
            timestamp: rawData.timestamp || '',
            paper: rawData.paper || '',
            bw: rawData.bw || '',
            lot: rawData.lot || '',
            width: rawData.width || '',
            pressure_hpa: rawData.pressure_hpa || '',
            season: rawData.season || '',
            production: rawData.production || ''
        };
    }
}

const paperDataService = new PaperDataService();

export default paperDataService;
