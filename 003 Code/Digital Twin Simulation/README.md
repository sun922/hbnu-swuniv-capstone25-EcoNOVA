# Digital Twin Simulation 실행 방법

## 1. 사전 준비
- influxDB (2.7.12 이상)
- Python (3.10 이상)
- Unreal Engine (5.3)

## 2. InfluxDB 실행
```bash
# Windows PowerShell
influxd.exe
```

## 3. Python 가상환경 설정 및 패키지 설치
```bash
# Windows PowerShell
python -m venv venv
venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

## 4. Flask 서버 실행
```bash
# Windows PowerShell
python app.py
```

## 5. Unreal 에셋 다운로드
Unreal 프로젝트 실행시 Content/폴더가 필요합니다.<br>
(파일 용량 문제로 인해 에셋은 Google Drive에 별도 첨부)<br>
- 링크 : https://drive.google.com/file/d/1WTVutaAZqCYgSe-1KS6SbL6c9LWu79GC/view?usp=drive_link

- 설치 방법
1. 위 링크에서 unreal_assets.zip 파일 다운로드
2. 압축 해제 후 내부의 Content/, Saved/, DerivedDataChche/ 폴더를 .uproject 파일이 있는 폴더(프로젝트 루트)에 붙여넣기

## 6. Unreal 플러그인 설정
Unreal 실행 후 다음 플러그인 활성화가 필요합니다.(최초 1회만 필요)<br>
- 메뉴 → Edit > Plugins → 검색 및 활성화
1. VaRest(Flask API 연동용)
2. HttpBlueprint(HTTP 요청)

## 7. Unreal 실행 절차 요약
1. Unreal Editor 실행
2. 시뮬레이션 진행
3. 에셋 선택 → 좌측 하단 UI에 LOT, 시간 입력 → 전송시 결과값 UI 표시
4. 우측 상단 UI 선택 → 위치 이동 > 카메라모드 선택시 이동 불가, 카메라모드 미선택시 wasd 키로 이동 가능

## 주의사항
- Flask 및 Unreal 실행 전, InfluxDB 서버가 항상 켜져있어야 합니다.
- Unreal 실행 전 반드시 Flask API(python app.py)와 InfluxDB(influxd.exe)가 구동중이어야합니다.
- .gitignore에 의해 Content/, Saved/, DerivedDataCache/ 등은 업로드되지 않습니다.
- Unreal 플러그인 설정을 하지 않을 경우, 에셋 및 위젯 관련 블루프린트가 작동하지 않습니다. 
