import React from 'react';
import NoiseLevel from '../components/widgets/NoiseLevel.jsx';
import styles from './InfoHub.module.css';
import Weather from '../components/widgets/Weather.jsx';
import ProductionPlan from '../components/widgets/ProductionPlan.jsx';
import Notice from '../components/widgets/Notice.jsx';
import ShiftNotes from '../components/widgets/ShiftNotes.jsx';
import Celebration from '../components/widgets/Celebrations.jsx';

export default function InfoHub() {
    return (
        
            <div className={styles.InfoHubPositon}>
                
                <div className={styles.productionPlan}>
                    <ProductionPlan />
                </div>
                <div className={styles.noiseLevel}>
                    <NoiseLevel />
                </div>
                <div className={styles.weather}>
                    <Weather /> 
                </div>

                <div className={styles.notice}>
                    <Notice />
                </div>
                <div className={styles.shiftNotes}>
                    <ShiftNotes />
                </div>
                <div className={styles.celebrations}>
                    <Celebration />     
                </div>

        </div>
    );
}



