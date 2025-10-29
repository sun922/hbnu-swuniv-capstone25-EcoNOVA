import styles from './ProductionPlan.module.css';
import React, { useState, useEffect } from 'react';
import { FaCalendarAlt, FaClock, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';

export default function ProductionPlan() {
    const [productionPlan, setProductionPlan] = useState([
        {
            id: 1,
            order: 'PO-2025-001',
            product: 'A4 용지 80g',
            quantity: 5000,
            target: 5000,
            status: 'completed',
            startTime: '00:00',
            endTime: '08:00',
            progress: 100
        },
        {
            id: 2,
            order: 'PO-2025-002',
            product: 'A3 용지 100g',
            quantity: 3000,
            target: 3000,
            status: 'completed',
            startTime: '08:00',
            endTime: '12:00',
            progress: 100
        },
        {
            id: 3,
            order: 'PO-2025-003',
            product: 'B4 용지 70g',
            quantity: 2000,
            target: 2000,
            status: 'in_progress',
            startTime: '12:00',
            endTime: '16:00',
            progress: 65
        },
        {
            id: 4,
            order: 'PO-2025-004',
            product: 'A5 용지 60g',
            quantity: 4000,
            target: 4000,
            status: 'in_progress',
            startTime: '14:00',
            endTime: '18:00',
            progress: 30
        },
        {
            id: 5,
            order: 'PO-2025-005',
            product: 'A4 용지 90g',
            quantity: 3500,
            target: 3500,
            status: 'pending',
            startTime: '16:00',
            endTime: '20:00',
            progress: 0
        },
        {
            id: 6,
            order: 'PO-2025-006',
            product: 'B5 용지 80g',
            quantity: 2500,
            target: 2500,
            status: 'pending',
            startTime: '18:00',
            endTime: '22:00',
            progress: 0
        },
        {
            id: 7,
            order: 'PO-2025-007',
            product: 'A3 용지 120g',
            quantity: 1500,
            target: 1500,
            status: 'pending',
            startTime: '20:00',
            endTime: '24:00',
            progress: 0
        },
        {
            id: 8,
            order: 'PO-2025-008',
            product: 'A4 용지 70g',
            quantity: 6000,
            target: 6000,
            status: 'pending',
            startTime: '22:00',
            endTime: '02:00',
            progress: 0
        },
        {
            id: 9,
            order: 'PO-2025-009',
            product: 'B4 용지 85g',
            quantity: 1800,
            target: 1800,
            status: 'pending',
            startTime: '02:00',
            endTime: '06:00',
            progress: 0
        },
        {
            id: 10,
            order: 'PO-2025-010',
            product: 'A5 용지 75g',
            quantity: 3200,
            target: 3200,
            status: 'pending',
            startTime: '06:00',
            endTime: '10:00',
            progress: 0
        }
    ]);

    useEffect(()=>{
        const fetchProductionPlan = async () => {
            try {
                setTimeout(() => {
                    setProductionPlan([
                        {
                            id: 1,
                            order: 'PO-2025-001',
                            product: 'A4 용지 80g',
                            quantity: 5000,
                            target: 5000,
                            status: 'completed',
                            startTime: '00:00',
                            endTime: '08:00',
                            progress: 100
                        },
                        {
                            id: 2,
                            order: 'PO-2025-002',
                            product: 'A3 용지 100g',
                            quantity: 3000,
                            target: 3000,
                            status: 'completed',
                            startTime: '08:00',
                            endTime: '12:00',
                            progress: 100
                        },
                        {
                            id: 3,
                            order: 'PO-2025-003',
                            product: 'B4 용지 70g',
                            quantity: 2000,
                            target: 2000,
                            status: 'in_progress',
                            startTime: '12:00',
                            endTime: '16:00',
                            progress: 65
                        },
                        {
                            id: 4,
                            order: 'PO-2025-004',
                            product: 'A5 용지 60g',
                            quantity: 4000,
                            target: 4000,
                            status: 'in_progress',
                            startTime: '14:00',
                            endTime: '18:00',
                            progress: 30
                        },
                        {
                            id: 5,
                            order: 'PO-2025-005',
                            product: 'A4 용지 90g',
                            quantity: 3500,
                            target: 3500,
                            status: 'pending',
                            startTime: '16:00',
                            endTime: '20:00',
                            progress: 0
                        },
                        {
                            id: 6,
                            order: 'PO-2025-006',
                            product: 'B5 용지 80g',
                            quantity: 2500,
                            target: 2500,
                            status: 'pending',
                            startTime: '18:00',
                            endTime: '22:00',
                            progress: 0
                        },
                        {
                            id: 7,
                            order: 'PO-2025-007',
                            product: 'A3 용지 120g',
                            quantity: 1500,
                            target: 1500,
                            status: 'pending',
                            startTime: '20:00',
                            endTime: '24:00',
                            progress: 0
                        },
                        {
                            id: 8,
                            order: 'PO-2025-008',
                            product: 'A4 용지 70g',
                            quantity: 6000,
                            target: 6000,
                            status: 'pending',
                            startTime: '22:00',
                            endTime: '02:00',
                            progress: 0
                        },
                        {
                            id: 9,
                            order: 'PO-2025-009',
                            product: 'B4 용지 85g',
                            quantity: 1800,
                            target: 1800,
                            status: 'pending',
                            startTime: '02:00',
                            endTime: '06:00',
                            progress: 0
                        },
                        {
                            id: 10,
                            order: 'PO-2025-010',
                            product: 'A5 용지 75g',
                            quantity: 3200,
                            target: 3200,
                            status: 'pending',
                            startTime: '06:00',
                            endTime: '10:00',
                            progress: 0
                        }
                    ]);
                }, 1000);
            } catch (error) {
                console.error('생산 계획 로드 실패:', error);
            }
        };

        fetchProductionPlan();
        const interval = setInterval(fetchProductionPlan, 30000); // 30초마다 업데이트
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'completed': return '#10b981';
            case 'in_progress': return '#3b82f6';
            case 'pending': return '#f59e0b';
            default: return '#6b7280';
        }
    };

    const getStatusText = (status) => {
        switch (status) {
            case 'completed': return '완료';
            case 'in_progress': return '진행중';
            case 'pending': return '대기';
            default: return '알 수 없음';
        }
    };


    return (
        <div className={styles.productionPlanWidget}>
            <div className={styles.productionPlanHeader}>
                <h3>생산 계획</h3>
                <div className={styles.statusBadge} style={{ 
                    backgroundColor: 'var(--brand)',
                    color: 'white'
                }}>
                    {productionPlan.filter(p => p.status === 'in_progress').length}개 진행중
                </div>
            </div>
            
            <div className={styles.productionPlanList}>
                {productionPlan.map((plan) => (
                    <div key={plan.id} className={`${styles.productionPlanItem} ${styles[plan.status]}`} style={{
                        borderLeftColor: getStatusColor(plan.status)
                    }}>
                        <div className={styles.productionPlanContent}>
                            <div className={styles.productionPlanTitle}>
                                {plan.order} - {plan.product}
                            </div>
                            <div className={styles.productionPlanMeta}>
                                <span className={styles.productionPlanQuantity}>
                                    수량: {plan.quantity.toLocaleString()}kg
                                </span>
                                <span className={styles.productionPlanStatus} style={{ 
                                    color: getStatusColor(plan.status)
                                }}>
                                    {getStatusText(plan.status)}
                                </span>
                            </div>
                            <div className={styles.productionPlanTime}>
                                <span>
                                    <FaClock style={{ marginRight: '4px' }} />
                                    {plan.startTime} - {plan.endTime}
                                </span>
                                <span>
                                    {plan.progress}%
                                </span>
                            </div>
                            <div className={styles.productionPlanProgress}>
                                <div className={`${styles.productionPlanProgressBar} ${styles[plan.status]}`} style={{
                                    width: `${plan.progress}%`
                                }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};