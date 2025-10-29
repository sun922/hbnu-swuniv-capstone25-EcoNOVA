import React, { useState, useEffect } from 'react';
import { FaBell, FaExclamationTriangle, FaInfoCircle, FaCheckCircle, FaHeart } from 'react-icons/fa';
import styles from './Notice.module.css';

export default function Notice() {
    const [notices, setNotices] = useState([]);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        // 시뮬레이션된 공지사항 데이터
        const sampleNotices = [
            {
                id: 1,
                type: 'maintenance',
                title: '시스템 점검 안내',
                description: '2025년 1월 15일 02:00-04:00 시스템 점검 예정입니다.',
                timestamp: '2025-01-10'
            },
            {
                id: 2,
                type: 'safety',
                title: '안전 교육 일정',
                description: '월간 안전 교육이 1월 20일 오후 2시에 예정되어 있습니다.',
                timestamp: '2025-01-09'
            },
            {
                id: 3,
                type: 'welcome',
                title: '신규 직원 환영',
                description: '제지공학과 김철수님, 이영희님이 팀에 합류했습니다.',
                timestamp: '2025-01-08'
            },
            {
                id: 4,
                type: 'achievement',
                title: '품질 개선 성과',
                description: '12월 품질 점수 평균 95점 달성! 팀원들의 노고에 감사드립니다.',
                timestamp: '2025-01-07'
            },
            {
                id: 5,
                type: 'equipment',
                title: '설비 교체 완료',
                description: '건조기 압력 센서 교체가 완료되었습니다.',
                timestamp: '2025-01-06'
            },
            {
                id: 6,
                type: 'safety',
                title: '화재 대피 훈련 실시',
                description: '1월 25일 오전 10시 전 직원 화재 대피 훈련을 실시합니다.',
                timestamp: '2025-01-05'
            },
            {
                id: 7,
                type: 'maintenance',
                title: '공기압 시스템 점검',
                description: '공기압 시스템 정기 점검으로 1월 12일 오후 2-4시 가동 중단 예정입니다.',
                timestamp: '2025-01-03'
            },
            {
                id: 8,
                type: 'equipment',
                title: '압연기 정비 완료',
                description: '압연기 2호기 정비 작업이 완료되어 정상 가동을 재개합니다.',
                timestamp: '2024-12-23'
            },
            {
                id: 9,
                type: 'achievement',
                title: '생산량 목표 달성',
                description: '12월 생산량 목표 120% 달성! 팀원들의 열정적인 노력에 감사드립니다.',
                timestamp: '2024-12-29'
            },
            {
                id: 10,
                type: 'welcome',
                title: '신입사원 오리엔테이션',
                description: '신입사원 3명이 1월 14일부터 2주간 오리엔테이션을 받습니다.',
                timestamp: '2025-01-02'
            }
        ];
        setNotices(sampleNotices);
    }, []);

    const getNoticeTypeText = (type) => {
        const typeMap = {
            maintenance: '점검',
            safety: '안전',
            welcome: '인사',
            achievement: '성과',
            equipment: '설비'
        };
        return typeMap[type] || '일반';
    };

    const getNoticeIcon = (type) => {
        const iconMap = {
            maintenance: <FaExclamationTriangle />,
            safety: <FaBell />,
            welcome: <FaHeart />,
            achievement: <FaCheckCircle />,
            equipment: <FaInfoCircle />
        };
        return iconMap[type] || <FaInfoCircle />;
    };

    const filteredNotices = notices.filter(notice => {
        if (filter === 'all') return true;
        return notice.type === filter;
    });

    return (
        <div className={styles.noticeWidget}>
            <div className={styles.noticeHeader}>
                <h3>공지사항</h3>
                <div className={styles.filterContainer}>
                    <select 
                        value={filter} 
                        onChange={(e) => setFilter(e.target.value)}
                        className={styles.filterSelect}
                    >
                        <option value="all">전체</option>
                        <option value="maintenance">점검</option>
                        <option value="safety">안전</option>
                        <option value="welcome">인사</option>
                        <option value="achievement">성과</option>
                        <option value="equipment">설비</option>
                    </select>
                </div>
            </div>

            <div className={styles.noticeList}>
                {filteredNotices.length === 0 ? (
                    <div className={styles.emptyNotice}>
                        <FaBell className={styles.emptyIcon} />
                        <p>해당 카테고리의 공지사항이 없습니다.</p>
                    </div>
                ) : (
                    filteredNotices.map(notice => (
                        <div 
                            key={notice.id} 
                            className={styles.noticeItem}
                        >
                            <div className={styles.noticeIconContainer}>
                                {getNoticeIcon(notice.type)}
                            </div>
                            <div className={styles.noticeContent}>
                                <div className={styles.noticeTitle}>
                                    {notice.title}
                                    <span className={styles.noticeType}>
                                        {getNoticeTypeText(notice.type)}
                                    </span>
                                </div>
                                <div className={styles.noticeDescription}>
                                    {notice.description}
                                </div>
                                <div className={styles.noticeMeta}>
                                    <span className={styles.noticeDate}>
                                        {notice.timestamp}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}