# quality_preprocess.py
from influxdb_client import InfluxDBClient
import os
import pandas as pd
import numpy as np
from scipy.stats import iqr

INFLUX_URL = "http://localhost:8086"
INFLUX_TOKEN = "eIZZV42-KIlXV6TiT-tDD92zhOQ32mSC7Tp1hZslOu9a9YPbON3e7VZL2KH3mhRsEsH99PEOyYQrQbDRfRpRNw=="
INFLUX_ORG = "my-org"
INFLUX_BUCKET = "test"


def load_from_influx():
    """InfluxDB에서 월 단위로 데이터 조회 후 합쳐서 DataFrame 반환"""
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


# ---------------- 기존 점수 계산 함수들 ---------------- #
def drop_missing_cols(df, rat):
    df = df.copy()
    null_ratio = df.isnull().mean() * 100
    cols_to_drop = null_ratio[null_ratio > rat].index.tolist()
    df = df.drop(columns=cols_to_drop)
    return df, cols_to_drop


def interpolate(df, obj_cols):
    df = df.copy()
    cols = df.select_dtypes(include='number').columns.tolist()
    cols += [col for col in obj_cols if col in df.columns]
    for col in cols:
        df[col] = df[col].ffill().bfill()
    return df


def outliers(df, window=5, z_thresh=3):
    df = df.copy()
    num_cols = df.select_dtypes(include='number').columns
    for col in num_cols:
        rolling_mean = df[col].rolling(window, center=True, min_periods=1).mean()
        rolling_std = df[col].rolling(window, center=True, min_periods=1).std()
        z_scores = (df[col] - rolling_mean) / rolling_std
        outliers = z_scores.abs() > z_thresh
        df.loc[outliers, col] = np.nan
    return df


def prepro(df, rat=20, obj_cols=[]):
    df = df.copy()
    df, _ = drop_missing_cols(df, rat)
    df = outliers(df)
    df = interpolate(df, obj_cols)
    for col in obj_cols:
        if col in df.columns:
            dummies = pd.get_dummies(df[col], prefix=col)
            df = pd.concat([df, dummies], axis=1)
    return df


def calculated_col(df, width_col='width', x1_col='x1', x2_col='x2'):
    df = df.copy()
    df['width_m'] = df[width_col] / 1000
    df['cal_production'] = df['width_m'] * df[x1_col] * df[x2_col] / 1000
    return df


def get_ref_tol_dict(df, mean_std_vars, iqr_vars, std_multiplier=2.0, iqr_multiplier=1.5):
    ref_dict, tol_dict = {}, {}
    for col in mean_std_vars:
        s = df[col].dropna()
        ref_dict[col] = s.mean()
        tol_dict[col] = s.std() * std_multiplier
    for col in iqr_vars:
        s = df[col].dropna()
        q1, q3 = s.quantile([0.25, 0.75])
        ref_dict[col] = s.median()
        tol_dict[col] = (q3 - q1) * iqr_multiplier
    return ref_dict, tol_dict


def get_st(df, input_cols, x_ref, x_tol):
    score_mat = df[input_cols].copy().values
    for i, col in enumerate(input_cols):
        ref = x_ref[col]
        tol = x_tol[col]
        x = df[col].values
        score_mat[:, i] = np.exp(-((x - ref) / tol) ** 2)
    return score_mat


def get_wi(df, input_cols, target_col='cal_production'):
    valid_cols = [col for col in input_cols if col in df.columns and df[col].nunique() > 1]
    if not valid_cols:
        return {col: 1 / len(input_cols) for col in input_cols}, None
    w_corr = df[valid_cols + [target_col]].corr()[target_col][valid_cols].abs()
    w_vec = (w_corr / w_corr.sum()).to_dict()
    for col in input_cols:
        w_vec.setdefault(col, 0.0)
    return w_vec, w_corr


def get_aj(df, input_cols, ratios):
    T = len(df)
    num_vars = len(input_cols)
    num_slices = len(ratios)
    cut_points = [0] + [int(sum(ratios[:i+1]) * T) for i in range(num_slices)]
    a_ij = np.zeros((num_vars, num_slices))
    eps = 1e-6
    for i, col in enumerate(input_cols):
        x = df[col].dropna().values
        vars = [np.var(x[cut_points[j]:cut_points[j+1]]) if len(x[cut_points[j]:cut_points[j+1]]) > 1 else 0 for j in range(num_slices)]
        inv_vars = np.array([1 / (v + eps) for v in vars])
        a_ij[i] = inv_vars / inv_vars.sum()
    return a_ij


def get_y(score_mat, a_ij, w_vec):
    T, num_vars = score_mat.shape
    num_slices = a_ij.shape[1]
    slice_len = T // num_slices
    if isinstance(w_vec, dict):
        w_vec = np.array(list(w_vec.values()))
    y = 0.0
    for i in range(num_vars):
        for j in range(num_slices):
            start, end = j * slice_len, (j + 1) * slice_len if j < num_slices - 1 else T
            segment_mean = score_mat[start:end, i].mean() if end > start else 0
            y += w_vec[i] * a_ij[i, j] * segment_mean
    return y * 100


def calculate_current_lot_score(df, lot_id, input_cols, x_ref, x_tol,
                                lot_col='lot', time_col='date',
                                target_col='cal_production',
                                cutoff_min=24, ratios=[0.2, 0.6, 0.2]):
    lot_df = df[df[lot_col] == lot_id].sort_values(time_col).copy()
    cutoff_time = lot_df[time_col].min() + pd.to_timedelta(cutoff_min, unit='m')
    lot_df = lot_df[lot_df[time_col] <= cutoff_time]
    w_vec, _ = get_wi(df, input_cols, target_col)
    score_mat = get_st(lot_df, input_cols, x_ref, x_tol)
    a_ij = get_aj(lot_df, input_cols, ratios)
    y = get_y(score_mat, a_ij, w_vec)
    return y


def load_and_preprocess_data():
    df = load_from_influx()
    pre_df = prepro(df, rat=25, obj_cols=[])
    cal_df = calculated_col(pre_df)

    mean_std_vars, iqr_vars = ['x1', 'x3', 'x4'], ['x12', 'x5']
    x_ref, x_tol = get_ref_tol_dict(cal_df, mean_std_vars, iqr_vars)
    input_cols = ['x5', 'x1', 'x3', 'x12', 'x4']
    return cal_df, x_ref, x_tol, input_cols


def calculate_current_lot_score_api(df, lot_id, input_cols, x_ref, x_tol, cutoff_min=24):
    return calculate_current_lot_score(
        df=df, lot_id=lot_id, input_cols=input_cols,
        x_ref=x_ref, x_tol=x_tol,
        lot_col='lot', time_col='date',
        target_col='cal_production',
        cutoff_min=cutoff_min, ratios=[0.2, 0.6, 0.2]
    )
