# 한밭대학교 컴퓨터공학과 EcoNOVA팀

**팀 구성**
- 20222024 박선아 
- 20221991 서지윤

## <u>Teamate</u> Project Background
- ### 필요성
  - 제지 산업은 스팀을 사용하는 대표적인 에너지 다소비 산업으로, 에너지 절감과 탄소 배출 저감이 시급함.  
  - 디지털 트윈을 활용한 공정 시뮬레이션과 데이터 기반 최적화가 에너지 효율과 품질 향상에 필수적임. 
- ### 기존 해결책의 문제점
  - 기존 최적화 연구는 이론적 접근에 머물러 현장 적용성과 실시간 대응력이 부족함.  
  - 공정 데이터의 분산 및 관리 미흡으로 인해 경험 의존적 운전이 지속되고, 객관적 분석과 의사결정이 어려움. 
  
## System Design
  - ### System Requirements
    시스템은 **모델링 및 분석 모듈**, **웹 대시보드**, **디지털 트윈 시뮬레이션**으로 구성된다. <br>
    데이터 분석을 통해 품질 및 에너지 요인을 도출하고, 결과를 시각화하여 실시간으로 운전 상태를 확인할 수 있다.
    <p align="center">
    <img width="700" alt="image" src="https://github.com/user-attachments/assets/55c5a0e5-498d-45bb-abc0-75b88c7592e9" />
    </p>
    
  1. **모델링 및 분석 모듈** <br>
    - 공정 데이터를 활용해 품질 점수와 스팀 사용량 예측 모델을 구축  
    - 주요 공정 변수(속도, 수분, 압력 등)의 영향도를 분석  
    - 모델 결과는 Flask API를 통해 대시보드와 시뮬레이션에 전달
    <p align="center">
    <img width="600" alt="image" src="https://github.com/user-attachments/assets/9f827b09-00f4-4805-974c-fe134b028178" />
    </p>
   
  2. **웹 대시보드** <br>
    - React 기반 실시간 데이터 시각화 인터페이스  
    - 품질 예측, 유사 공정 비교, 센서 중요도 분석 결과를 통합 표시  
    - ECharts를 활용해 다양한 공정 지표를 직관적으로 표현
    <p align="center">
    <img width="700" alt="dashboard" src="https://github.com/user-attachments/assets/a71df513-4f7f-4ace-a2c2-3be1881d9e12" />
    </p>
    - 추가 기능
        -  Info Hub 페이지: 공정 계획, 메모, 알림, 뉴스 등 다양한 운전 정보를 한 화면에서 관리
        -   Custom 페이지: 실제 공장 작업자 인터뷰를 통해 도출된 현장 맞춤형 기능으로, 각 공정에 필요한 그래프만 선택적으로 표시
            <p align="center">
            <img width="400" alt="info-hub" src="https://github.com/user-attachments/assets/9e059c10-e10b-408e-bc10-690cc6addab4" />
            &nbsp;&nbsp;&nbsp;
            <img width="400" alt="custom" src="https://github.com/user-attachments/assets/71a44bf4-b2c4-4748-8746-39c45adfd150" />
            </p>   
        - 다크모드 / 라이트모드 전환:  사용자 환경에 맞는 시각적 편의성 확보
        - 포커스 검색 기능 지원: 설비명, 변수명등을 빠르게 탐색 가능
                <p align="center">
                <img width="290" alt="dashboard-wh" src="https://github.com/user-attachments/assets/ea943c2f-aa14-4225-bc48-1d97d57e2a5c" />
                &nbsp;&nbsp;&nbsp;
                <img width="290" alt="dashboard_fo" src="https://github.com/user-attachments/assets/4c1fb4f2-d017-46ea-a43b-4c69b94ca5c6" />
                &nbsp;&nbsp;&nbsp;
                <img width="290" alt="custom_fo" src="https://github.com/user-attachments/assets/418ebf92-169a-4223-9e53-ebbb167f4dbb" />
                </p>

  3. **디지털 트윈 시뮬레이션** <br>
    - Unreal Engine 기반 가상 공정 환경 구축  
    - Flask API로 전달된 예측 데이터를 HUD 및 3D UI에 반영  
    - 시뮬레이션을 통해 공정 상태 변화에 따른 품질, 에너지 상황을 반환
    <p align="center">
    <img width="550" alt="digital-twin" src="https://github.com/user-attachments/assets/46fd77ae-cfe3-421f-8c1a-04684f663ec8" />
    &nbsp;&nbsp;&nbsp;
    <img width="250" alt="트윈 화면" src="https://github.com/user-attachments/assets/b6958310-cede-402c-b39b-b19f13f6318f" />
    </p>

## Case Study
  - ### Description
  
  
## Conclusion
  - ### OOO
  - ### OOO
  
## Project Outcome
- ### 2025년 대한전자공학회 하계종합 학술대회 
<img width="3863" height="1698" alt="학술대회" src="https://github.com/user-attachments/assets/5c6429c0-fe35-4557-929f-7cc2959c48fe" />
