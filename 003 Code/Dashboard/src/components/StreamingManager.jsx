import { useEffect } from 'react';
import worker1Service from '../services/worker1Service.js';
import worker2Service from '../services/worker2Service.js';
import worker5Service from '../services/worker5Service.js';
import worker6Service from '../services/worker6Service.js';
import lotSyncService from '../services/lotSyncService.js';

export default function StreamingManager() {
    useEffect(() => {
        console.log('전역 스트리밍 매니저 시작');
        
        // Worker1 초기화
        const initializeWorker1 = async () => {
            try {
                const success = await worker1Service.initialize();
                if (success) {
                    console.log('전역 Worker1 초기화 완료');
                } else {
                    console.error('전역 Worker1 초기화 실패');
                }
            } catch (error) {
                console.error('전역 Worker1 초기화 오류:', error);
            }
        };
        
        // Worker2 초기화
        const initializeWorker2 = async () => {
            try {
                const success = await worker2Service.initialize();
                if (success) {
                    console.log('전역 Worker2 초기화 완료');
                } else {
                    console.error('전역 Worker2 초기화 실패');
                }
            } catch (error) {
                console.error('전역 Worker2 초기화 오류:', error);
            }
        };
        
        // Worker5 초기화
        const initializeWorker5 = async () => {
            try {
                const success = await worker5Service.initialize();
                if (success) {
                    console.log('전역 Worker5 초기화 완료');
                } else {
                    console.error('전역 Worker5 초기화 실패');
                }
            } catch (error) {
                console.error('전역 Worker5 초기화 오류:', error);
            }
        };
        
        // Worker6 초기화
        const initializeWorker6 = async () => {
            try {
                const success = await worker6Service.initialize();
                if (success) {
                    console.log('전역 Worker6 초기화 완료');
                } else {
                    console.error('전역 Worker6 초기화 실패');
                }
            } catch (error) {
                console.error('전역 Worker6 초기화 오류:', error);
            }
        };
        
        initializeWorker1();
        initializeWorker2();
        initializeWorker5();
        initializeWorker6();
        
        // InfoBox lot 및 시간 변경 감지 및 Worker1, Worker2, Worker5 동기화
        const initializeSync = async () => {
            const currentState = lotSyncService.getCurrentLot();
            
            if (currentState.lot) {
                try {
                    await worker1Service.setLot(currentState.lot);
                    console.log('전역 Worker1 lot 동기화 완료:', currentState.lot);
                } catch (error) {
                    console.error('전역 Worker1 lot 동기화 실패:', error);
                }
                
                try {
                    await worker2Service.setLot(currentState.lot);
                    console.log('전역 Worker2 lot 동기화 완료:', currentState.lot);
                } catch (error) {
                    console.error('전역 Worker2 lot 동기화 실패:', error);
                }
                
                try {
                    await worker5Service.setLot(currentState.lot);
                    console.log('전역 Worker5 lot 동기화 완료:', currentState.lot);
                } catch (error) {
                    console.error('전역 Worker5 lot 동기화 실패:', error);
                }
                
                try {
                    await worker6Service.setLot(currentState.lot);
                    console.log('전역 Worker6 lot 동기화 완료:', currentState.lot);
                } catch (error) {
                    console.error('전역 Worker6 lot 동기화 실패:', error);
                }
            }
            
            if (currentState.timestamp) {
                worker1Service.setInfoBoxTimestamp(currentState.timestamp);
                worker2Service.setInfoBoxTimestamp(currentState.timestamp);
                worker5Service.setInfoBoxTimestamp(currentState.timestamp);
                worker6Service.setInfoBoxTimestamp(currentState.timestamp);
                console.log('전역 timestamp 동기화 완료:', currentState.timestamp);
            }
        };
        
        initializeSync();
        
        // lot 변경 구독
        const unsubscribe = lotSyncService.subscribe(async (lotData) => {
            if (lotData.lot && lotData.lot !== worker1Service.currentLot) {
                try {
                    await worker1Service.setLot(lotData.lot);
                    console.log('전역 Worker1 lot 변경 동기화:', lotData.lot);
                } catch (error) {
                    console.error('전역 Worker1 lot 변경 동기화 실패:', error);
                }
            }
            
            if (lotData.lot && lotData.lot !== worker2Service.currentLot) {
                try {
                    await worker2Service.setLot(lotData.lot);
                    console.log('전역 Worker2 lot 변경 동기화:', lotData.lot);
                } catch (error) {
                    console.error('전역 Worker2 lot 변경 동기화 실패:', error);
                }
            }
            
            if (lotData.lot && lotData.lot !== worker5Service.currentLot) {
                try {
                    await worker5Service.setLot(lotData.lot);
                    console.log('전역 Worker5 lot 변경 동기화:', lotData.lot);
                } catch (error) {
                    console.error('전역 Worker5 lot 변경 동기화 실패:', error);
                }
            }
            
            if (lotData.lot && lotData.lot !== worker6Service.currentLot) {
                try {
                    await worker6Service.setLot(lotData.lot);
                    console.log('전역 Worker6 lot 변경 동기화:', lotData.lot);
                } catch (error) {
                    console.error('전역 Worker6 lot 변경 동기화 실패:', error);
                }
            }
            
            if (lotData.timestamp) {
                worker1Service.setInfoBoxTimestamp(lotData.timestamp);
                worker2Service.setInfoBoxTimestamp(lotData.timestamp);
                worker5Service.setInfoBoxTimestamp(lotData.timestamp);
                worker6Service.setInfoBoxTimestamp(lotData.timestamp);
            }
        });
        
        // 스트리밍 시작
        worker1Service.startStreaming();
        worker2Service.startStreaming();
        worker5Service.startStreaming();
        worker6Service.startStreaming();
        console.log('전역 스트리밍 시작 (Worker1, Worker2, Worker5)');
        
        // 정리 함수 (앱 종료 시에만 호출)
        return () => {
            console.log('전역 스트리밍 매니저 정리');
            unsubscribe();
            // worker1Service.stopStreaming(); // 페이지 이동 시에는 끄지 않음
        };
    }, []);

    return null; // UI를 렌더링하지 않음
}
