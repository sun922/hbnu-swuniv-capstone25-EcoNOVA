# utils/preprocess.py
import os
import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler, StandardScaler
from sklearn.cluster import KMeans
from sklearn.model_selection import train_test_split
from keras.models import Sequential, load_model
from keras.layers import LSTM, Dropout, Dense
from datetime import timedelta
from influxdb_client import InfluxDBClient

# 🔹 InfluxDB 연결 정보
INFLUX_URL = "http://localhost:8086"
INFLUX_TOKEN = "eIZZV42-KIlXV6TiT-tDD92zhOQ32mSC7Tp1hZslOu9a9YPbON3e7VZL2KH3mhRsEsH99PEOyYQrQbDRfRpRNw=="  # 환경 변수에 토큰 저장
INFLUX_ORG = "my-org"
INFLUX_BUCKET = "test"


def load_from_influx():
    """InfluxDB에서 월 단위로 데이터 조회 후 합쳐서 DataFrame 변환"""
    ranges = [
        ("2022-01-01T00:00:00Z", "2022-02-01T00:00:00Z"),
        ("2022-02-01T00:00:00Z", "2022-03-01T00:00:00Z"),
        ("2022-03-01T00:00:00Z", "2022-04-01T00:00:00Z"),
        ("2022-04-01T00:00:00Z", "2022-05-01T00:00:00Z"),
        ("2022-05-01T00:00:00Z", "2022-06-01T00:00:00Z"),
        ("2022-06-01T00:00:00Z", "2022-07-01T00:00:00Z"),
        ("2022-07-01T00:00:00Z", "2022-08-01T00:00:00Z"),
        ("2022-08-01T00:00:00Z", "2022-09-01T00:00:00Z"),
        ("2022-09-01T00:00:00Z", "2022-10-01T00:00:00Z"),
        ("2022-10-01T00:00:00Z", "2022-11-01T00:00:00Z"),
        ("2022-11-01T00:00:00Z", "2022-12-01T00:00:00Z"),
        ("2022-12-01T00:00:00Z", "2023-01-01T00:00:00Z"),
    ]

    dfs = []
    with InfluxDBClient(
        url=INFLUX_URL,
        token=INFLUX_TOKEN,
        org=INFLUX_ORG,
        timeout=300000
    ) as client:
        for start, stop in ranges:
            query = f'''
            from(bucket: "{INFLUX_BUCKET}")
              |> range(start: {start}, stop: {stop})
              |> filter(fn: (r) => r._measurement == "paper_data")
              |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
            '''
            result = client.query_api().query_data_frame(query)

            # ⚡ 리스트로 반환될 경우 DataFrame으로 합치기
            if isinstance(result, list):
                if len(result) > 0:
                    chunk_df = pd.concat(result, ignore_index=True)
                else:
                    continue
            else:
                chunk_df = result

            if not chunk_df.empty:
                chunk_df = chunk_df.rename(columns={"_time": "date"})
                chunk_df["date"] = pd.to_datetime(chunk_df["date"])
                dfs.append(chunk_df)

    if not dfs:
        raise ValueError("⚠️ InfluxDB에서 데이터를 불러오지 못했습니다.")

    return pd.concat(dfs, ignore_index=True)

def preprocess(df, pulp_cols):
    df = df.copy()
    df = df.dropna(subset=pulp_cols + ['pressure_hpa'])
    for col in pulp_cols:
        df[col + '_rat'] = df[col] / df[pulp_cols].sum(axis=1)
    return df.fillna(0)


def calculate_steam(df):
    df['계산_스팀량(kg/min)'] = (
        0.6 * df['x16'] - 1.6 * df['x17']
        - 67 * df['x18'] + 58 * df['x5'] + 580
    )
    return df


def cluster_top_lots(df, pulp_rat_cols, n_clusters=2):
    grouped = df.groupby('lot')
    features = []
    for lot, group in grouped:
        row = {'lot': lot, 'season': group['season'].iloc[0]}
        for col in pulp_rat_cols:
            row[col + '_mean'] = group[col].mean()
            row[col + '_std'] = group[col].std()
        features.append(row)
    stat_df = pd.DataFrame(features).dropna()

    X = stat_df.drop(columns=['lot', 'season'])
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = KMeans(n_clusters=n_clusters, random_state=42, n_init=10)
    labels = model.fit_predict(X_scaled)
    stat_df['cluster'] = labels

    cluster_df = df[df['lot'].isin(stat_df[stat_df['cluster'] == 0]['lot'])].copy()
    return cluster_df


def generate_recommend_range(cluster_df, control_cols):
    rows = []
    for season in cluster_df['season'].unique():
        for col in control_cols:
            vals = cluster_df[cluster_df['season'] == season][col]
            mean, std = vals.mean(), vals.std()
            rows.append({
                '변수': col,
                '계절': season,
                '권장 최소': mean - 1.5 * std,
                '권장 최대': mean + 1.5 * std
            })
    return pd.DataFrame(rows)


def train_lstm(df, x_cols, y_col):
    scaler_X, scaler_y = MinMaxScaler(), MinMaxScaler()
    X = scaler_X.fit_transform(df[x_cols])
    y = scaler_y.fit_transform(df[[y_col]])
    X_3d = X.reshape((X.shape[0], 1, X.shape[1]))

    X_train, X_test, y_train, y_test = train_test_split(
        X_3d, y, test_size=0.2, random_state=42
    )

    model = Sequential([
        LSTM(64, input_shape=(1, X.shape[1]), return_sequences=False),
        Dropout(0.2),
        Dense(1)
    ])
    model.compile(optimizer='adam', loss='mse')
    model.fit(X_train, y_train, epochs=30, batch_size=32,
              validation_data=(X_test, y_test), verbose=0)
    model.save('models/lstm_model.h5')
    return model, scaler_X, scaler_y


def load_resources():
    print("⏳ InfluxDB에서 데이터 로드 시작...")
    df = load_from_influx()
    print(f"✅ 데이터 로드 완료: {len(df)} rows")

    pulp_cols = ['x11', 'x12', 'x13', 'x14', 'x15']
    x_cols = ['x5', 'x4', 'x8', 'x2', 'pressure_hpa']
    y_col = '계산_스팀량(kg/min)'

    df = preprocess(df, pulp_cols)
    df = calculate_steam(df)
    cluster_df = cluster_top_lots(df, [col + '_rat' for col in pulp_cols])
    recommend_df = generate_recommend_range(cluster_df, x_cols)

    if not os.path.exists('models/lstm_model.h5'):
        model, scaler_X, scaler_y = None, None, None
    else:
        model = load_model('models/lstm_model.h5', compile=False)
        scaler_X, scaler_y = MinMaxScaler(), MinMaxScaler()
        scaler_X.fit(cluster_df[x_cols])
        scaler_y.fit(cluster_df[[y_col]])

    return {
        'model': model,
        'scaler_X': scaler_X,
        'scaler_y': scaler_y,
        'cluster_df': cluster_df,
        'full_df': df,
        'recommend_df': recommend_df,
        'x_cols': x_cols
    }


def predict_steam(resources, lot_id, minutes):
    df = resources['full_df']
    model, scaler_X, scaler_y = resources['model'], resources['scaler_X'], resources['scaler_y']
    recommend_df, x_cols = resources['recommend_df'], resources['x_cols']

    lot_df = df[df['lot'] == lot_id].copy()
    if lot_df.empty:
        raise ValueError(f"LOT {lot_id} 데이터가 존재하지 않습니다.")
    lot_df = lot_df.sort_values('date')
    end = lot_df['date'].min() + timedelta(minutes=minutes)
    lot_df = lot_df[lot_df['date'] <= end]

    X = scaler_X.transform(lot_df[x_cols])
    X_reshaped = X.reshape((X.shape[0], 1, X.shape[1]))
    y_pred_inv = scaler_y.inverse_transform(model.predict(X_reshaped)).flatten()
    final_pred = y_pred_inv[-1]

    season = lot_df['season'].iloc[0]
    over_flag = any(
        not (r['권장 최소'] <= lot_df[col].iloc[-1] <= r['권장 최대'])
        for col in x_cols
        for _, r in recommend_df[(recommend_df['변수'] == col) & (recommend_df['계절'] == season)].iterrows()
    )

    return float(final_pred), bool(over_flag)
