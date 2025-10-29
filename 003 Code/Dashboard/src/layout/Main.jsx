import { Outlet, useLocation } from "react-router-dom";
import PixelStreamingPlayer from "../components/PixelStreamingPlayer.jsx";
import InfoBox from "../components/InfoBox.jsx";
import Dashboard from "../pages/Dashboard.jsx";
import Custom from "../pages/Custom.jsx";

export default function Main(){
    const location = useLocation();
    const isDigitalTwinPage = location.pathname === '/digital-twin';
    const isDashboardPage = location.pathname === '/';
    const isCustomPage = location.pathname === '/custom';

    return (
        <main style={{ 
            height: '100%', // 그리드에서 1fr로 설정된 높이 사용
            overflow: 'hidden', // 메인 영역에서 스크롤 방지
            position: 'relative'
        }}>
            {/* InfoBox를 항상 마운트된 상태로 유지 */}
            <div style={{
                display: (isDashboardPage || isCustomPage) ? 'block' : 'none'
            }}>
                <InfoBox />
            </div>
            
            {/* Pixel Streaming Player를 항상 마운트된 상태로 유지 */}
            <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 1,
                display: isDigitalTwinPage ? 'block' : 'none'
            }}>
                <PixelStreamingPlayer />
            </div>
            
            {/* Dashboard를 항상 마운트된 상태로 유지 */}
            <div style={{
                position: 'relative',
                height: '100%',
                display: isDashboardPage ? 'block' : 'none'
            }}>
                <Dashboard />
            </div>
            
            {/* Custom을 항상 마운트된 상태로 유지 */}
            <div style={{
                position: 'relative',
                height: '100%',
                display: isCustomPage ? 'block' : 'none'
            }}>
                <Custom />
            </div>
            
            {/* 다른 페이지들은 조건부로 렌더링 */}
            {!isDashboardPage && !isDigitalTwinPage && !isCustomPage && <Outlet />}  
        </main>
    );
}

