import styles from "./layout.module.css"; 
import { CgProfile } from "react-icons/cg";
import { NavLink } from "react-router-dom";
import logo from "../assets/logo.png";
import { useState, useEffect } from "react"; //react hook, 상태저장 및 실행 타이밍 제어

export default function Aside() { //사이드바 전체를 당당하는 컴포넌트 선언
    const [isDarkMode, setIsDarkMode] = useState(false); //isDarkMode 상태저장, setIsDarkMode() 상태값 변경 함수 기본적으로 라이트 모드(false)

    // 초기 로드시 실행, 이전에 저장된 테마 복원원
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme'); //localStorage에서 테마 상태 가져오기
        if (savedTheme === 'dark') { //저장된 테마가 다크모드면 다크모드 상태로 변경
            setIsDarkMode(true);
            document.documentElement.setAttribute('data-theme', 'dark'); // <html> 태그에 data-theme="dark" 속성 추가
        }
    }, []);

    // 다크모드 토글, 지금 상태를 반대로 바꿈
    const toggleDarkMode = () => {
        const newDarkMode = !isDarkMode; //현재 상태의 반대값 저장
        setIsDarkMode(newDarkMode);
        console.log('다크모드 토글:', newDarkMode);

        if (newDarkMode) {
            document.documentElement.setAttribute('data-theme', 'dark'); // <html> 태그에 data-theme="dark" 속성 추가
            localStorage.setItem('theme', 'dark'); //localStorage에 테마 상태 저장
            console.log('다크모드 적용됨');
        } else {
            document.documentElement.removeAttribute('data-theme'); // <html> 태그에 data-theme="dark" 속성 제거
            localStorage.setItem('theme', 'light'); //localStorage에 테마 상태 저장
            console.log('라이트모드 적용됨');
        }
    };

    return (
      <aside className={styles.aside}>
        <div className={styles.logoSection}>
          <img src={logo} alt="PAPER" className={styles.logo} />
        </div>
  
        <div className={styles.profile}>
            <div className={styles.avatar}>
                <CgProfile className={styles.icon} />
                <span className={styles.status} />
            </div>
            <div className={styles.meta}>
                <strong>Guest</strong>
                <span>Viewer</span>
            </div>
        </div>
  
        <nav className={styles.menu}>
          <NavLink to="/info-hub" className={({isActive})=>isActive?styles.active:undefined}>Info Hub</NavLink>
          <NavLink to="/" end className={({isActive})=>isActive?styles.active:undefined}>Dashboard</NavLink>
          <NavLink to="/custom" className={({isActive})=>isActive?styles.active:undefined}>Custom</NavLink>
          <NavLink to="/digital-twin" className={({isActive})=>isActive?styles.active:undefined}>Digital Twin</NavLink>
        </nav>
  
        <div className={styles.spacer}/>
  
        <div className={styles.footer}>
            {/* 다크모드 토글 스위치 */}
            <div className={styles.themeToggleContainer}>
                <span className={styles.themeToggleText}>DARK</span>
                <button
                    type="button"
                    className={`${styles.themeToggleBtn} ${isDarkMode ? styles.active : ''}`}
                    // isDarkMode가 ture면 themeToggleBtn.active, false면 themeToggleBtn 
                    onClick={toggleDarkMode}
                    title={isDarkMode ? "라이트 모드로 전환" : "다크 모드로 전환"}//툴팁 표시
                />
                <span className={styles.themeToggleText}>LIGHT</span>
            </div>
        </div>
  
      </aside>
    );
  }
  