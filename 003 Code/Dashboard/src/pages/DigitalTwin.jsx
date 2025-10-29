import React, { useState } from "react";
import PixelStreamingPlayer from "../components/PixelStreamingPlayer";

export default function DigitalTwin() {
  const [connectionStatus, setConnectionStatus] = useState({
    connected: false,
    loading: true,
    error: false
  });

  const handleConnectionStatusChange = (status) => {
    setConnectionStatus(status);
  };

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <PixelStreamingPlayer onConnectionStatusChange={handleConnectionStatusChange} />
      
      <div
        style={{
          position: "absolute",
          top: 16,
          right: 16,
          pointerEvents: "none",
          zIndex: 1000,
        }}
      >
        <div
          style={{
            pointerEvents: "auto",
            background: "rgba(0,0,0,0.7)",
            color: "#fff",
            borderRadius: 8,
            padding: "12px 16px",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ 
              width: 8, 
              height: 8, 
              borderRadius: "50%", 
              background: connectionStatus.loading ? "#ffaa00" : 
                         connectionStatus.connected ? "#00ff00" : "#ff0000",
              animation: connectionStatus.loading ? "pulse 2s infinite" : "none"
            }}></div>
            <span style={{ fontSize: "14px", fontWeight: "500" }}>
              {connectionStatus.loading ? "연결 중..." :
               connectionStatus.connected ? "Unreal Pixel Streaming Active" :
               "연결 실패"}
            </span>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
