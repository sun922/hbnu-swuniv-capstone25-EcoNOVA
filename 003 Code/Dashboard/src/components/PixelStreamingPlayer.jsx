import React, { useRef, useEffect, useState } from "react";
import "../App.css"; // 스타일 재사용

export default function PixelStreamingPlayer({ onConnectionStatusChange }) {
  const iframeRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  // Pixel Streaming 서버 주소들 (여러 옵션 제공)
  const STREAM_URLS = [
    "http://127.0.0.1:80/", // 로컬호스트 (이미지에서 확인된 주소)
    "http://172.16.11.156:80/", // 내부 네트워크 IP (이미지에서 확인된 주소)
    "http://172.21.224.1:80/", // 또 다른 내부 네트워크 IP (이미지에서 확인된 주소)
    "http://192.168.35.221:80/", // 기존 주소 (백업)
    "http://localhost/", // 기본 웹 서버
  ];

  useEffect(() => {
    console.log("[PixelStreaming] Pixel Streaming 컴포넌트 마운트됨");
    
    // Unreal Engine RenderTexture 오류 방지
    const suppressUnrealErrors = () => {
      // 원본 console.error를 백업
      const originalError = console.error;
      
      // console.error를 오버라이드하여 Unreal Engine 오류 필터링
      console.error = (...args) => {
        const message = args.join(' ');
        
        // Unreal Engine 관련 오류는 무시
        if (message.includes('RenderTexture.Create failed') || 
            message.includes('width & height must be larger than 0') ||
            message.includes('Look rotation viewing vector is zero') ||
            message.includes('The AudioContext was not allowed to start') ||
            message.includes('AudioContext') && message.includes('user gesture')) {
          console.warn('[PixelStreaming] Unreal Engine 오류 (무시됨):', ...args);
          return;
        }
        
        // 다른 오류는 정상 출력
        originalError.apply(console, args);
      };
      
      // 컴포넌트 언마운트 시 원본 복원
      return () => {
        console.error = originalError;
      };
    };

    // 컴포넌트가 마운트될 때만 초기화
    if (!isInitialized) {
      setIsLoading(true);
      setHasError(false);
      setIsInitialized(true);
      
      // Unreal Engine 오류 억제 시작
      const cleanup = suppressUnrealErrors();
      
      // cleanup 함수를 반환하여 언마운트 시 실행
      return cleanup;
    }
  }, [isInitialized]);

  // iframe 로드 완료 핸들러
  const handleIframeLoad = () => {
    console.log("[PixelStreaming] iframe 로드 완료");
    setIsLoading(false);
    setHasError(false);
    onConnectionStatusChange?.({ connected: true, loading: false, error: false });
  };

  // iframe 에러 핸들러
  const handleIframeError = () => {
    console.error("[PixelStreaming] iframe 로드 실패");
    setIsLoading(false);
    setHasError(true);
    onConnectionStatusChange?.({ connected: false, loading: false, error: true });
  };

  // 현재 사용할 URL (첫 번째 URL 사용, 한 번만 설정)
  const currentUrl = STREAM_URLS[0];

  return (
    <div
      id="pixel-streaming-container"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        background: "black"
      }}
    >
      {/* 로딩 상태 */}
      {isLoading && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "white",
          textAlign: "center",
          zIndex: 1000,
        }}>
          
          <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px" }}>
            언리얼 엔진 로딩 중...
          </div>
          <div style={{ fontSize: "14px", opacity: 0.8 }}>
            Pixel Streaming 연결을 시도하고 있습니다
          </div>
        </div>
      )}

      {/* 에러 상태 */}
      {hasError && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          color: "white",
          textAlign: "center",
          zIndex: 1000,
          background: "rgba(255, 0, 0, 0.1)",
          padding: "20px",
          borderRadius: "8px",
          border: "1px solid rgba(255, 0, 0, 0.3)",
        }}>
          <div style={{ fontSize: "24px", marginBottom: "16px" }}>⚠️</div>
          <div style={{ fontSize: "18px", fontWeight: "bold", marginBottom: "8px" }}>
            Pixel Streaming 연결 실패
          </div>
          <div style={{ fontSize: "14px", opacity: 0.8, marginBottom: "16px" }}>
            언리얼 엔진 서버가 실행 중인지 확인해주세요
          </div>
          <div style={{ fontSize: "12px", opacity: 0.6 }}>
            시도한 URL: {currentUrl}
          </div>
        </div>
      )}

      {/* Pixel Streaming iframe */}
      <iframe
        key="pixel-streaming-iframe"
        ref={iframeRef}
        src={currentUrl}
        width="100%"
        height="100%"
        frameBorder="0"
        allow="autoplay; fullscreen; camera; microphone; gamepad"
        title="Unreal Pixel Streaming"
        style={{ 
          border: "none",
          background: "#000",
          display: isLoading || hasError ? "none" : "block"
        }}
        onLoad={handleIframeLoad}
        onError={handleIframeError}
      />
    </div>
  );
}
