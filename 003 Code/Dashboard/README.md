# Dashboard 실행 방법

## 1. 사전 준비
- Node.js (v18 이상)
- Python (3.8 이상)
- npm

## 2. Node.js 의존성 설치
```bash
cd Dashboard
npm install
```

## 3. Python 가상환경 설정 및 의존성 설치
```bash
# Windows PowerShell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 4. 서버 실행
```bash
npm run dev
```
이 명령어는 Express 서버, Python 워커 서버, React 개발 서버를 모두 동시에 실행합니다.

## 주의사항
- Python 워커 서버가 실행되지 않으면 Worker 관련 기능이 작동하지 않습니다.
- `npm run dev`를 사용하기 전에 `concurrently` 패키지가 설치되어 있어야 합니다 (`npm install concurrently`).
