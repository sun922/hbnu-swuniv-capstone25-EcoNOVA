# app.py
from flask import Flask, request, jsonify
from quality_preprocess import load_and_preprocess_data, calculate_current_lot_score_api
from utils.preprocess import load_resources, predict_steam

app = Flask(__name__)

# 🔹 스팀 예측용 리소스 캐싱
print("⏳ load_resources 시작")
resources = load_resources()
print("✅ load_resources 완료")

# 🔹 품질 점수용 리소스 캐싱
print("⏳ quality_preprocess 데이터 로드 시작")
quality_df, quality_x_ref, quality_x_tol, quality_input_cols = load_and_preprocess_data()
print("✅ quality_preprocess 데이터 로드 완료")


@app.route('/')
def home():
    return "🚀 생산품질 + 스팀 예측 통합 Flask API 서버 정상 작동 중!"


@app.route('/quality_score', methods=['POST'])
def quality_score():
    """
    품질 점수 API
    (캐싱된 quality_df, x_ref, x_tol, input_cols 사용)
    """
    data = request.get_json()
    lot_id, minutes = data.get("lot"), int(data.get("minutes", 24))
    if not lot_id:
        return jsonify({"error": "lot 값을 입력해주세요."}), 400

    try:
        score = calculate_current_lot_score_api(
            quality_df, lot_id, quality_input_cols, quality_x_ref, quality_x_tol, cutoff_min=minutes
        )
        return jsonify({"품질 점수": float(round(score, 2))})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/predict_steam', methods=['POST'])
def predict():
    """
    스팀 예측 API
    (캐싱된 resources 사용)
    """
    data = request.get_json()
    lot_id, minutes = data.get('lot'), int(data.get('minutes', 24))
    if lot_id is None:
        return jsonify({"error": "lot_id를 입력해야 합니다."}), 400

    try:
        pred, over_flag = predict_steam(resources, lot_id, minutes)
        return jsonify({
            "lot": lot_id,
            "예측 스팀량": float(round(pred, 2)),
            "권장범위 초과여부": bool(over_flag)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/quality_and_steam', methods=['POST'])
def quality_and_steam():
    """
    통합 API: 품질 점수 + 스팀 예측
    """
    data = request.get_json()
    lot_id, minutes = data.get("lot"), int(data.get("minutes", 24))
    if not lot_id:
        return jsonify({"error": "lot 값을 입력해주세요."}), 400

    try:
        quality_score = calculate_current_lot_score_api(
            quality_df, lot_id, quality_input_cols, quality_x_ref, quality_x_tol, cutoff_min=minutes
        )
        pred, over_flag = predict_steam(resources, lot_id, minutes)

        return jsonify({
            "lot": lot_id,
            "minutes": minutes,
            "품질 점수": float(round(quality_score, 2)),
            "예측 스팀량": float(round(pred, 2)),
            "권장범위 초과여부": bool(over_flag)
        })
    except Exception as e:
        return jsonify({"error": str(e)}), 500


if __name__ == '__main__':
    app.run(debug=True, port=5000)