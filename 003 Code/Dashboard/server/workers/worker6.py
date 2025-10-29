from common import get_st, get_aj, get_wi, get_y
import pandas as pd
import numpy as np


class Worker6:

    INPUT_COLS = ['x5', 'x1', 'x3', 'x2', 'x4']

    VARIABLE_NAMES = {
        'x5': '지료 유량',
        'x1': '평량',
        'x3': '수분',
        'x2': '속도',
        'x4': '건조기 압력',
    }

    def __init__(self, data_processor):
        self.dp = data_processor
        self.cache = {
            'sensitivity_data': {},
            'time_labels': {},
            'base_times': {},
        }

    def calculate_sensitivity(self, current_lot, up_to_minute=None):
        cal_df = self.dp.cal_df
        lot_df_full = cal_df[cal_df['lot'] == current_lot].sort_values('date').copy()
        if lot_df_full.empty:
            return {'status': 'error', 'message': f'No data for lot {current_lot}'}

        base_t0 = lot_df_full['date'].min()
        max_minutes = int((lot_df_full['date'].max() - base_t0).total_seconds() / 60)

        self.cache['sensitivity_data'][current_lot] = {}
        self.cache['base_times'][current_lot] = base_t0

        time_labels = [
            (base_t0 + pd.to_timedelta(i, unit='min')).strftime('%H:%M') 
            for i in range(max_minutes + 1)
        ]
        self.cache['time_labels'][current_lot] = time_labels

        print(f"[Worker6] Lot {current_lot} initialized: {max_minutes} minutes available")
        return {'status': 'ok', 'max_minutes': max_minutes, 'base_time': base_t0.strftime('%Y-%m-%d %H:%M')}

    # 민감도 계산

    def _calculate_sensitivity_for_cutoff(self, current_lot, cutoff_min):
        cal_df = self.dp.cal_df
        lot_df_full = cal_df[cal_df['lot'] == current_lot].sort_values('date').copy()
        if lot_df_full.empty:
            return None

        base_t0 = lot_df_full['date'].min()
        cutoff_time = base_t0 + pd.to_timedelta(cutoff_min, unit='m')
        lot_df_partial = lot_df_full[lot_df_full['date'] <= cutoff_time].copy()
        
        if lot_df_partial.empty:
            return None

        paper = lot_df_full['paper'].iloc[0]
        bw = lot_df_full['bw'].iloc[0]
        gkey = (paper, bw)
        
        x_ref = self.dp.ref_dict.get(gkey, {})
        x_tol = self.dp.tol_dict.get(gkey, {})

        try:
            w_vec, _ = get_wi(cal_df, self.INPUT_COLS, 'cal_production')
        except Exception as e:
            print(f"get_wi failed: {e}")
            return None

        try:
            score_mat = get_st(lot_df_partial, self.INPUT_COLS, x_ref, x_tol)
            a_ij = get_aj(lot_df_partial, self.INPUT_COLS, ratios=[0.2, 0.6, 0.2])
            base_score = float(get_y(score_mat, a_ij, w_vec))
        except Exception as e:
            print(f"Base score calculation failed: {e}")
            return None

        step_frac = 0.10
        sensitivity_data = []
        
        for var in self.INPUT_COLS:
            tol = float(x_tol.get(var, np.nan))
            if not np.isfinite(tol) or tol == 0:
                continue
            
            delta = tol * step_frac

            plus = lot_df_partial.copy()
            plus[var] = plus[var] + delta
            minus = lot_df_partial.copy()
            minus[var] = minus[var] - delta

            try:
                score_mat_plus = get_st(plus, self.INPUT_COLS, x_ref, x_tol)
                a_ij_plus = get_aj(plus, self.INPUT_COLS, ratios=[0.2, 0.6, 0.2])
                y_plus = float(get_y(score_mat_plus, a_ij_plus, w_vec))
                
                score_mat_minus = get_st(minus, self.INPUT_COLS, x_ref, x_tol)
                a_ij_minus = get_aj(minus, self.INPUT_COLS, ratios=[0.2, 0.6, 0.2])
                y_minus = float(get_y(score_mat_minus, a_ij_minus, w_vec))
                
                dy_dx = (y_plus - y_minus) / (2.0 * delta)
                dy_per_tol = dy_dx * tol
                
                sensitivity_data.append({
                    'name': self.VARIABLE_NAMES[var], 
                    'value': round(dy_per_tol, 3)
                })
            except Exception as e:
                print(f"Sensitivity calculation failed for {var}: {e}")
                continue

        return sensitivity_data

    # 스트리밍 응답

    def get_chart_data(self, current_lot, current_minute, info_box_timestamp=None):
        
        if current_lot not in self.cache['sensitivity_data']:
            return {'status': 'error', 'message': f'No sensitivity data for lot {current_lot}'}

        base_t0 = self.cache['base_times'].get(current_lot)
        if not base_t0:
            return {'status': 'error', 'message': 'No base time for this lot'}

        cm = int(current_minute) if current_minute is not None else 0
        if info_box_timestamp:
            try:
                info_time = pd.to_datetime(info_box_timestamp)
                diff_sec = (info_time - base_t0).total_seconds()
                cm = int(diff_sec // 60)
                cm = max(0, cm)
                print(f"[Worker6] get_chart_data: info_box_timestamp={info_box_timestamp}, calculated cm={cm}")
            except Exception:
                cm = int(current_minute) if current_minute is not None else 0
                print(f"[Worker6] get_chart_data: timestamp parse error, using current_minute={cm}")
        else:
            print(f"[Worker6] get_chart_data: no timestamp, current_minute={cm}")

        result = self._calculate_sensitivity_for_cutoff(current_lot, cm)
        if not result:
            return {'status': 'error', 'message': f'Failed to calculate sensitivity for minute {cm}'}

        time_labels = self.cache['time_labels'].get(current_lot, [])

        timestamp = info_box_timestamp if info_box_timestamp else base_t0.strftime('%Y-%m-%d %H:%M')
        
        return {
            'status': 'ok',
            'sensitivity_data': result,
            'time_labels': time_labels,
            'current_minute': cm,
            'base_time': base_t0.strftime('%Y-%m-%d %H:%M'),
            'timestamp': timestamp,
        }

