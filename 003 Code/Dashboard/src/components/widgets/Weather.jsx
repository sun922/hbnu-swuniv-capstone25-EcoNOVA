import styles from './Weather.module.css';
import React, { useState, useEffect } from 'react';
import { WiDaySunny, WiRain, WiCloudy, WiSnow, WiThunderstorm, WiFog, WiSunrise, WiSunset } from 'react-icons/wi';
import { FaThermometerHalf, FaTint, FaWind, FaEye, FaSun, FaMoon, FaCloudRain, FaEyeSlash } from 'react-icons/fa';
import { BsDroplet, BsSunrise, BsSunset, BsBrightnessHigh } from 'react-icons/bs';

export default function Weather() {
    const [weather, setWeather] = useState({
        temperature: 22,
        humidity: 65,
        windSpeed: 12,
        visibility: 10,
        condition: 'sunny',
        location: '울산',
        // 추가된 날씨 정보들
        feelsLike: 25,
        pressure: 1013,
        uvIndex: 6,
        dewPoint: 18,
        cloudCover: 20,
        precipitation: 0,
        sunrise: '06:30',
        sunset: '19:45',
        moonPhase: '초승달',
        airQuality: '좋음',
        aqi: 45
    });

    useEffect(() => {
        const fetchWeather = async () => {
            try {
                setTimeout(() => {
                    const conditions = ['sunny', 'cloudy', 'rainy', 'snowy', 'thunderstorm', 'foggy'];
                    const locations = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종'];
                    const moonPhases = ['초승달', '상현달', '보름달', '하현달', '그믐달'];
                    const airQualities = ['좋음', '보통', '나쁨', '매우나쁨'];
                    
                    const temp = Math.floor(Math.random() * 15) + 15; // 15-30도
                    const humidity = Math.floor(Math.random() * 30) + 50; // 50-80%
                    const condition = conditions[Math.floor(Math.random() * conditions.length)];
                    
                    setWeather({
                        temperature: temp,
                        humidity: humidity,
                        windSpeed: Math.floor(Math.random() * 20) + 5, // 5-25 km/h
                        visibility: Math.floor(Math.random() * 5) + 8, // 8-13 km
                        condition: condition,
                        location: locations[Math.floor(Math.random() * locations.length)],
                        // 추가된 날씨 정보들
                        feelsLike: temp + Math.floor(Math.random() * 6) - 2, // 체감온도
                        pressure: Math.floor(Math.random() * 40) + 990, // 990-1030 hPa
                        uvIndex: Math.floor(Math.random() * 8) + 1, // 1-8
                        dewPoint: Math.floor(Math.random() * 10) + 10, // 10-20도
                        cloudCover: Math.floor(Math.random() * 100), // 0-100%
                        precipitation: condition === 'rainy' ? Math.floor(Math.random() * 20) + 1 : 0, // 강수량
                        sunrise: `${String(Math.floor(Math.random() * 2) + 6).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
                        sunset: `${String(Math.floor(Math.random() * 3) + 18).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
                        moonPhase: moonPhases[Math.floor(Math.random() * moonPhases.length)],
                        airQuality: airQualities[Math.floor(Math.random() * airQualities.length)],
                        aqi: Math.floor(Math.random() * 200) + 1 // 1-200
                    });
                }, 1000);
            } catch (error) {
                console.error('날씨 데이터 로드 실패:', error);
            }
        };

        fetchWeather();
    }, []);

    const getWeatherIcon = (condition) => {
        const iconMap = {
            sunny: <WiDaySunny className={styles.weatherIcon} />,
            cloudy: <WiCloudy className={styles.weatherIcon} />,
            rainy: <WiRain className={styles.weatherIcon} />,
            snowy: <WiSnow className={styles.weatherIcon} />,
            thunderstorm: <WiThunderstorm className={styles.weatherIcon} />,
            foggy: <WiFog className={styles.weatherIcon} />
        };
        return iconMap[condition] || iconMap.sunny;
    };

    const getWeatherText = (condition) => {
        const textMap = {
            sunny: '맑음',
            cloudy: '흐림',
            rainy: '비',
            snowy: '눈',
            thunderstorm: '뇌우',
            foggy: '안개'
        };
        return textMap[condition] || '맑음';
    };


    return (
        <div className={styles.weatherWidget}>
            <div className={styles.weatherHeader}>
                <h3>날씨</h3>
                <div className={styles.location}>{weather.location}</div>
            </div>
            <div className={styles.weatherContent}>
                <div className={styles.weatherMain}>
                    <div className={styles.weatherIcon}>
                        {getWeatherIcon(weather.condition)}
                    </div>
                    <div className={styles.weatherInfo}>
                        <h2>{weather.temperature}°C</h2>
                        <p>{getWeatherText(weather.condition)}</p>
                        <div className={styles.feelsLike}>체감 {weather.feelsLike}°C</div>
                    </div>
                </div>
                
                {/* 상세 날씨 정보 */}
                <div className={styles.weatherDetails}>
                    <div className={styles.detailRow}>
                        <div className={styles.detailItem}>
                            <FaTint className={styles.detailIcon} />
                            <span>습도</span>
                            <span className={styles.detailValue}>{weather.humidity}%</span>
                        </div>
                        <div className={styles.detailItem}>
                            <FaWind className={styles.detailIcon} />
                            <span>풍속</span>
                            <span className={styles.detailValue}>{weather.windSpeed}km/h</span>
                        </div>
                    </div>
                    
                    <div className={styles.detailRow}>
                        <div className={styles.detailItem}>
                            <FaEye className={styles.detailIcon} />
                            <span>가시거리</span>
                            <span className={styles.detailValue}>{weather.visibility}km</span>
                        </div>
                        <div className={styles.detailItem}>
                            <BsBrightnessHigh className={styles.detailIcon} />
                            <span>조도</span>
                            <span className={styles.detailValue}>{weather.uvIndex}</span>
                        </div>
                    </div>
                    
                    <div className={styles.detailRow}>
                        <div className={styles.detailItem}>
                            <BsDroplet className={styles.detailIcon} />
                            <span>이슬점</span>
                            <span className={styles.detailValue}>{weather.dewPoint}°C</span>
                        </div>
                        <div className={styles.detailItem}>
                            <FaThermometerHalf className={styles.detailIcon} />
                            <span>기압</span>
                            <span className={styles.detailValue}>{weather.pressure}hPa</span>
                        </div>
                    </div>
                    
                    <div className={styles.detailRow}>
                        <div className={styles.detailItem}>
                            <BsSunrise className={styles.detailIcon} />
                            <span>일출</span>
                            <span className={styles.detailValue}>{weather.sunrise}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <BsSunset className={styles.detailIcon} />
                            <span>일몰</span>
                            <span className={styles.detailValue}>{weather.sunset}</span>
                        </div>
                    </div>
                    
                    <div className={styles.detailRow}>
                        <div className={styles.detailItem}>
                            <FaMoon className={styles.detailIcon} />
                            <span>달</span>
                            <span className={styles.detailValue}>{weather.moonPhase}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <FaCloudRain className={styles.detailIcon} />
                            <span>강수량</span>
                            <span className={styles.detailValue}>{weather.precipitation}mm</span>
                        </div>
                    </div>
                    
                    <div className={styles.airQuality}>
                        <div className={styles.aqLabel}>대기질</div>
                        <div className={styles.aqValue}>
                            <span className={styles.aqText}>{weather.airQuality}</span>
                            <span className={styles.aqNumber}>({weather.aqi})</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}