import React, { useState, useEffect } from 'react';
import { FaTrophy, FaMedal, FaStar, FaFire, FaHeart, FaGift, FaPlus } from 'react-icons/fa';
import styles from './Celebrations.module.css';

export default function Celebrations() {
    const [celebrations, setCelebrations] = useState([]);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        // 시뮬레이션된 기쁜소식 데이터
        const sampleCelebrations = [
            {
                id: 1,
                type: 'wedding',
                title: '김철수님 결혼 소식',
                description: '제지공학과 김철수님이 2월 14일 결혼합니다. 축하해주세요!',
                likes: 12,
                icon: <FaHeart />,
                timestamp: '2025-01-10'
            },
            {
                id: 2,
                type: 'safety',
                title: '연속 무사고 100일 달성',
                description: '안전 사고 없이 100일을 달성했습니다. 안전한 작업 환경을 만들어주신 모든 분들께 감사드립니다.',
                likes: 8,
                icon: <FaMedal />,
                timestamp: '2025-01-08'
            },
            {
                id: 3,
                type: 'birth',
                title: '이영희님 아들 출산',
                description: '품질관리팀 이영희님이 건강한 아들을 출산했습니다. 축하드립니다!',
                likes: 15,
                icon: <FaHeart />,
                timestamp: '2025-01-05'
            },
            {
                id: 4,
                type: 'promotion',
                title: '박민수님 승진 소식',
                description: '생산팀 박민수님이 주임으로 승진했습니다. 축하드립니다!',
                likes: 6,
                icon: <FaStar />,
                timestamp: '2025-01-03'
            },
            {
                id: 5,
                type: 'achievement',
                title: '품질 목표 달성',
                description: '12월 품질 점수 평균 95점을 달성했습니다. 팀원들의 노고에 감사드립니다.',
                likes: 10,
                icon: <FaTrophy />,
                timestamp: '2024-12-30'
            },
            {
                id: 6,
                type: 'birthday',
                title: '신입사원 환영',
                description: '새로운 동료 3명이 팀에 합류했습니다. 따뜻하게 맞아주세요!',
                likes: 4,
                icon: <FaGift />,
                timestamp: '2024-12-28'
            }
        ];
        setCelebrations(sampleCelebrations);
    }, []);

    const toggleLike = (id) => {
        setCelebrations(celebrations.map(celebration => 
            celebration.id === id 
                ? { ...celebration, likes: celebration.likes + (celebration.liked ? -1 : 1), liked: !celebration.liked }
                : celebration
        ));
    };

    const getCelebrationTypeText = (type) => {
        const typeMap = {
            wedding: '결혼',
            safety: '안전',
            birth: '출산',
            promotion: '승진',
            achievement: '성과',
            birthday: '환영'
        };
        return typeMap[type] || '기타';
    };

    return (
        <div className={styles.celebrationWidget}>
            <div className={styles.celebrationHeader}>
                <h3>기쁜소식</h3>
            </div>

            <div className={styles.celebrationList}>
                {celebrations.length === 0 ? (
                    <div className={styles.emptyCelebration}>
                        <FaHeart className={styles.emptyIcon} />
                        <p>아직 기쁜소식이 없습니다.</p>
                    </div>
                ) : (
                    celebrations.map(celebration => (
                        <div 
                            key={celebration.id} 
                            className={styles.celebrationItem}
                        >
                            <div className={styles.celebrationContent}>
                                <div className={styles.celebrationTitle}>
                                    {celebration.title}
                                    <span className={styles.celebrationType}>
                                        {getCelebrationTypeText(celebration.type)}
                                    </span>
                                </div>
                                <div className={styles.celebrationDescription}>
                                    {celebration.description}
                                </div>
                                <div className={styles.celebrationMeta}>
                                    <span className={styles.celebrationDate}>
                                        {celebration.timestamp}
                                    </span>
                                    <button 
                                        onClick={() => toggleLike(celebration.id)}
                                        className={`${styles.likeButton} ${celebration.liked ? styles.liked : ''}`}
                                    >
                                        <FaHeart />
                                        <span>{celebration.likes}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}