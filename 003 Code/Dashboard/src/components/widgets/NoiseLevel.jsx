import styles from './NoiseLevel.module.css';
import React, { useState, useEffect } from 'react';
import { FaVolumeUp, FaVolumeDown, FaVolumeMute, FaExclamationTriangle } from 'react-icons/fa';
import { BsSoundwave } from 'react-icons/bs';

export default function NoiseLevel() {
    const [noiseData, setNoiseData] = useState({
        level: 45.2,
        status: 'safe',
        trend: 'stable',
        peak: 67.8,
        average: 42.1
    });

    useEffect(() => {
        const fetchNoiseData = async () => {
            try {
                setTimeout(() => {
                    // 현장 소음 수준 시뮬레이션 (30-120 dBA)
                    const level = Math.floor(Math.random() * 90) + 30;
                    let status, trend;
                    
                    if (level < 50) {
                        status = 'safe';
                        trend = 'stable';
                    } else if (level < 70) {
                        status = 'moderate';
                        trend = Math.random() > 0.5 ? 'rising' : 'stable';
                    } else if (level < 85) {
                        status = 'high';
                        trend = Math.random() > 0.3 ? 'rising' : 'stable';
                    } else {
                        status = 'danger';
                        trend = 'rising';
                    }
                    
                    setNoiseData({
                        level: level + (Math.random() * 10 - 5), // 소수점 포함
                        status: status,
                        trend: trend,
                        peak: level + Math.floor(Math.random() * 20) + 10,
                        average: level - Math.floor(Math.random() * 15) - 5
                    });
                }, 1000);
            } catch (error) {
                console.error('소음 데이터 로드 실패:', error);
            }
        };

        fetchNoiseData();
        
        // 실시간 업데이트 (10초마다)
        const interval = setInterval(fetchNoiseData, 10000);
        return () => clearInterval(interval);
    }, []);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'safe': return <FaVolumeDown className={styles.statusIcon} />;
            case 'moderate': return <FaVolumeUp className={styles.statusIcon} />;
            case 'high': return <FaExclamationTriangle className={styles.statusIcon} />;
            case 'danger': return <FaExclamationTriangle className={styles.statusIcon} />;
            default: return <FaVolumeMute className={styles.statusIcon} />;
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'safe': return '안전';
            case 'moderate': return '주의';
            case 'high': return '높음';
            case 'danger': return '위험';
            default: return '알 수 없음';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'safe': return '#4CAF50';
            case 'moderate': return '#FF9800';
            case 'high': return '#FF5722';
            case 'danger': return '#F44336';
            default: return '#9E9E9E';
        }
    };

    const getBarHeight = (level) => {
        // 30-120 dBA 범위를 0-100%로 변환
        return Math.min(Math.max((level - 30) / 90 * 100, 0), 100);
    };


    return (
        <div className={styles.noiseLevel}>
            <div className={styles.header}>
                <h3>현장 소음 수준</h3>
            </div>

            {/* 알람창 - 헤더 바로 아래 */}
            <div className={styles.warning}>
                {noiseData.status === 'danger' && (
                    <div className={styles.dangerAlert}>
                        <FaExclamationTriangle />
                        <span>높은 소음 수준! 보호 장비 착용 필요</span>
                    </div>
                )}
                {noiseData.status === 'high' && (
                    <div className={styles.highAlert}>
                        <FaVolumeUp />
                        <span>소음 수준이 높습니다. 주의하세요</span>
                    </div>
                )}
                {(noiseData.status === 'safe' || noiseData.status === 'moderate') && (
                    <div className={styles.safeAlert}>
                        <FaVolumeDown />
                        <span>소음 수준이 안전합니다</span>
                    </div>
                )}
            </div>

            <div className={styles.mainDisplay}>
                <div className={styles.levelValue}>
                    <span className={styles.number}>{noiseData.level.toFixed(1)}</span>
                    <span className={styles.unit}>dBA</span>
                </div>
                
                <div className={styles.visualBars}>
                    {Array.from({ length: 10 }, (_, i) => {
                        const threshold = 30 + (i * 9); // 30, 39, 48, 57, 66, 75, 84, 93, 102, 111
                        const isActive = noiseData.level >= threshold;
                        
                        // 소음 수준에 따른 색상 그라데이션
                        let barColor = 'var(--gray-300)'; // 기본 회색
                        if (isActive) {
                            if (noiseData.level < 50) {
                                barColor = '#4CAF50'; // 녹색 - 안전
                            } else if (noiseData.level < 70) {
                                barColor = '#8BC34A'; // 연녹색 - 양호
                            } else if (noiseData.level < 85) {
                                barColor = '#FF9800'; // 주황색 - 주의
                            } else {
                                barColor = '#F44336'; // 빨간색 - 위험
                            }
                        }
                        
                        return (
                            <div
                                key={i}
                                className={`${styles.bar} ${isActive ? styles.active : ''}`}
                                style={{
                                    backgroundColor: barColor
                                }}
                            />
                        );
                    })}
                </div>
            </div>

            <div className={styles.details}>
                <div className={styles.detailItem}>
                    <span className={styles.label}>피크</span>
                    <span className={styles.value}>{noiseData.peak.toFixed(1)} dBA</span>
                </div>
                <div className={styles.detailItem}>
                    <span className={styles.label}>평균</span>
                    <span className={styles.value}>{noiseData.average.toFixed(1)} dBA</span>
                </div>
                <div className={styles.detailItem}>
                    <span className={styles.label}>추세</span>
                    <span className={styles.value}>
                        {noiseData.trend === 'rising' ? '↗ 상승' : '→ 안정'}
                    </span>
                </div>
            </div>
        </div>
    );
}