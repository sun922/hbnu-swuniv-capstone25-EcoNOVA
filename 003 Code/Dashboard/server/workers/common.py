import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns

def drop_missing_cols(df, rat):
    """결측치 많은 컬럼 제거"""
    df = df.copy()
    total_cols = len(df.columns)
    null_ratio = df.isnull().mean() * 100
    cols_to_drop = null_ratio[null_ratio > rat].index.tolist()
    df = df.drop(columns=cols_to_drop)
    print(f"전체 변수: {total_cols}개 | {rat}% 초과 결측 변수: {len(cols_to_drop)}개 | 남은 변수: {len(df.columns)}개")
    remaining_null_ratio = df.isnull().mean() * 100
    remaining_null_ratio = remaining_null_ratio[remaining_null_ratio > 0]

    if not remaining_null_ratio.empty:
        # 5% 단위 구간 생성
        bins = np.arange(0, rat + 5, 5)  # 0, 5, ..., rat
        labels = [f"{i}~{i+5}%" for i in bins[:-1]]
        labels[0] = "0%"  # 첫 구간은 0%
        bin_indices = pd.cut(remaining_null_ratio, bins=bins, right=False, labels=labels)
        grouped = bin_indices.value_counts().sort_index()

    return df, cols_to_drop

def interpolate(df, obj_cols):
    """결측치 보간"""
    df = df.copy()
    filled_mask = df.isnull()

    # 문자열 보간 전 숫자형/선택된 문자형만
    cols = df.select_dtypes(include='number').columns.tolist()
    cols += [col for col in obj_cols if col in df.columns]

    for col in cols:
        df[col] = df[col].ffill().bfill()

    filled_mask = filled_mask & df.notnull()  # 결측 → 채워진 위치만 True
    return df, filled_mask

def outliers(df, window=5, z_thresh=3):
    """이상치 제거"""
    df = df.copy()
    outlier_mask = pd.DataFrame(False, index=df.index, columns=df.columns)
    num_cols = df.select_dtypes(include='number').columns

    for col in num_cols:
        rolling_mean = df[col].rolling(window, center=True, min_periods=1).mean()
        rolling_std = df[col].rolling(window, center=True, min_periods=1).std()
        z_scores = (df[col] - rolling_mean) / rolling_std
        outliers = z_scores.abs() > z_thresh
        outlier_mask[col] = outliers
        df.loc[outliers, col] = np.nan  # 이상치는 NaN 처리

    return df, outlier_mask

def prepro(df, rat=20, obj_cols=['paper']):
    """전처리 통합"""
    df = df.copy()
    original_df = df.copy()

    # 결측치 많은 컬럼 제거
    df, dropped_cols = drop_missing_cols(df, rat)

    # 이상치 제거
    df, outlier_mask = outliers(df)
    print("이상치 제거 완료 (Rolling Z-score 기반)")

    # 결측치 보간
    df, filled_mask = interpolate(df, obj_cols)
    print("시간 기반 보간 완료 (ffill → bfill)")

    # 문자열 변수들 중 obj_cols 에 포함된 경우 → 원핫 인코딩
    for col in obj_cols:
        if col in df.columns:
            dummies = pd.get_dummies(df[col], prefix=col)
            df = pd.concat([df, dummies], axis=1)
            print(f"{col} one hot encoding 완료")

    # 결측치 남은 컬럼 확인
    remaining_nulls = df.isnull().sum()
    still_missing = remaining_nulls[remaining_nulls > 0].index.tolist()
    if still_missing:
        print("결측치가 여전히 남은 변수:", still_missing)
    else:
        print("결측치는 모두 처리되었습니다.")

    return df

def calculated_col(df, width_col='width', weight_col='x1', speed_col='x2'):
    """계산 생산량 추가"""
    df = df.copy()
    df['width_m'] = df[width_col] / 1000  # mm → m
    df['cal_production'] = df['width_m'] * df[weight_col] * df[speed_col] / 1000  # g → kg
    return df

def get_st(df, input_cols, x_ref, x_tol):
    """변수별 이상값 기준 점수 행렬 score_mat 계산"""
    valid_cols = [col for col in input_cols if col in df.columns]
    score_mat = df[valid_cols].to_numpy()

    for i, col in enumerate(valid_cols):
        x = df[col].values
        ref = x_ref[col]
        tol = x_tol[col]
        score_mat[:, i] = np.exp(-((x - ref) / tol) ** 2)

    return score_mat

def get_wi(df, input_cols, target_col='cal_production'):
    """변수별 상관계수를 기반으로 정규화된 중요도 가중치 계산"""
    valid_cols = [col for col in input_cols if col in df.columns and df[col].nunique() > 1]

    if not valid_cols:
        return {col: 1 / len(input_cols) for col in input_cols}, None

    w_corr = df[valid_cols + [target_col]].corr()[target_col][valid_cols].abs()
    w_vec = (w_corr / w_corr.sum()).to_dict()

    for col in input_cols:
        w_vec.setdefault(col, 0.0)

    return w_vec, w_corr

def get_aj(df, input_cols, ratios=None):
    """변수별 구간 분할에 따른 분산 기반 가중치 행렬 a_ij 계산"""
    T = len(df)
    if ratios is None:
        ratios = [1.0]
    assert np.isclose(sum(ratios), 1.0), "ratios의 합은 1이어야 합니다."

    num_vars = len(input_cols)
    num_slices = len(ratios)
    a_ij = np.zeros((num_vars, num_slices))
    eps = 1e-6

    cut_points = [0] + [int(sum(ratios[:i+1]) * T) for i in range(num_slices)]

    for i, col in enumerate(input_cols):
        x = df[col].dropna().values
        slice_vars = []

        for j in range(num_slices):
            s = x[cut_points[j]:cut_points[j+1]]
            var = np.var(s) if len(s) > 1 else 0
            slice_vars.append(var)

        inv_vars = np.array([1 / (v + eps) for v in slice_vars])
        a_ij[i] = inv_vars / inv_vars.sum()

    return a_ij

def get_y(score_mat, a_ij, w_vec):
    """최종 품질 점수 y 계산 함수"""
    T, num_vars = score_mat.shape
    num_slices = a_ij.shape[1]
    slice_len = T // num_slices

    if isinstance(w_vec, dict):
        w_vec = np.array(list(w_vec.values()))

    y = 0.0
    for i in range(num_vars):
        for j in range(num_slices):
            start = j * slice_len
            end = (j + 1) * slice_len if j < num_slices - 1 else T
            segment_mean = score_mat[start:end, i].mean() if end > start else 0
            y += w_vec[i] * a_ij[i, j] * segment_mean

    return y*100

def get_ref_tol_dict_with_plot(df, mean_std_vars, iqr_vars,
                               std_multiplier=2.0, iqr_multiplier=1.5,
                               group_cols=None, plot=False, max_plots_per_group=12):
    """변수별 기준값(ref), 허용범위(tol) 계산"""
    # 그룹 없이: 기존 동작 유지
    if group_cols is None:
        ref_dict = {}
        tol_dict = {}

        for col in mean_std_vars:
            series = df[col].dropna()
            ref = series.mean()
            std = series.std(ddof=1)
            tol = std * std_multiplier

            ref_dict[col] = round(float(ref), 2) if np.isfinite(ref) else np.nan
            tol_dict[col] = round(float(tol), 2) if np.isfinite(tol) else np.nan

        for col in iqr_vars:
            series = df[col].dropna()
            q1 = series.quantile(0.25)
            q3 = series.quantile(0.75)
            iqr = q3 - q1
            ref = series.median()
            tol = iqr * iqr_multiplier

            ref_dict[col] = round(float(ref), 2) if np.isfinite(ref) else np.nan
            tol_dict[col] = round(float(tol), 2) if np.isfinite(tol) else np.nan

        return ref_dict, tol_dict

    # 그룹별 계산
    if isinstance(group_cols, str):
        group_cols = [group_cols]
    group_cols = list(group_cols)

    ref_dict = {}
    tol_dict = {}

    groups = df.groupby(group_cols, dropna=False)
    plotted = 0

    for gkey, gdf in groups:
        if not isinstance(gkey, tuple):
            gkey = (gkey,)
        ref_dict[gkey] = {}
        tol_dict[gkey] = {}

        # mean±std
        for col in mean_std_vars:
            series = gdf[col].dropna()
            if series.empty:
                ref, tol = np.nan, np.nan
            else:
                ref = round(float(series.mean()), 2)
                std = float(series.std(ddof=1))
                tol = round(float(std * std_multiplier if np.isfinite(std) else np.nan), 2)

            ref_dict[gkey][col] = ref
            tol_dict[gkey][col] = tol

        # median±IQR
        for col in iqr_vars:
            series = gdf[col].dropna()
            if series.empty:
                ref, tol = np.nan, np.nan
            else:
                q1 = series.quantile(0.25)
                q3 = series.quantile(0.75)
                iqr = float(q3 - q1)
                ref = round(float(series.median()), 2)
                tol = round(float(iqr * iqr_multiplier if np.isfinite(iqr) else np.nan), 2)

            ref_dict[gkey][col] = ref
            tol_dict[gkey][col] = tol

    return ref_dict, tol_dict

class DataProcessor:
    """전체 데이터 관리"""
    def __init__(self, csv_path):
        self.csv_path = csv_path
        self.org_df = None
        self.pre_df = None
        self.cal_df = None
        self.ref_dict = {}
        self.tol_dict = {}
        
    def initialize(self):
        """서버 시작 시 1회 실행"""
        print("Loading CSV...")
        self.org_df = pd.read_csv(self.csv_path)
        self.org_df.rename(columns={'timestamp': 'date'}, inplace=True)
        self.org_df['date'] = pd.to_datetime(self.org_df['date'])
        
        print("Preprocessing...")
        self.pre_df = prepro(self.org_df, rat=25, obj_cols=[])
        
        print("Calculating production...")
        self.cal_df = calculated_col(self.pre_df)
        
        print("Calculating ref/tol...")
        self.ref_dict, self.tol_dict = get_ref_tol_dict_with_plot(
            self.cal_df,
            mean_std_vars=['x1', 'x3', 'x2'],
            iqr_vars=['x5', 'x4'],
            group_cols=('paper', 'bw'),
            plot=False
        )
        
        print("Initialization complete!")
        return {'status': 'ok'}
