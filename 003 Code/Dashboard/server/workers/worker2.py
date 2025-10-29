from common import get_st, get_aj, get_wi, get_y
import pandas as pd
import numpy as np


class Worker2:

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
            'strategy_data': {},
            'quality_scores': {},
            'sensitivity_data': {},
            'time_labels': {},
            'base_times': {},
        }

    # 전략 계산

    def _calculate_strategy_for_cutoff(self, current_lot, cutoff_min):
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
            y_now = float(get_y(score_mat, a_ij, w_vec))
        except Exception as e:
            print(f"Current score calculation failed: {e}")
            return None

        strategy_data = []
        max_y = y_now
        best_deltas = {}

        for var in self.INPUT_COLS:
            original_mean = float(lot_df_partial[var].mean())
            current_value = round(float(lot_df_partial[var].iloc[-1]), 3) if len(lot_df_partial) > 0 else 0.0
            
            if var not in x_tol or pd.isna(x_tol[var]):
                strategy_data.append({
                    '센서': self.VARIABLE_NAMES[var],
                    '현재 시점값': current_value,
                    '평균': round(original_mean, 3),
                    '권장 조정': 0.0,
                    '품질 향상': 0.0
                })
                continue

            best_norm_d = 0.0
            best_y = y_now
            tol = float(x_tol[var])

            for norm_d in np.linspace(-1, 1, 21):
                if norm_d == 0:
                    continue
                delta = norm_d * tol

                temp_df = lot_df_partial.copy()
                temp_df[var] = temp_df[var] + delta

                try:
                    score_mat_sim = get_st(temp_df, self.INPUT_COLS, x_ref, x_tol)
                    a_ij_sim = get_aj(temp_df, self.INPUT_COLS, ratios=[0.2, 0.6, 0.2])
                    y_sim = float(get_y(score_mat_sim, a_ij_sim, w_vec))

                    if y_sim > best_y:
                        best_y = y_sim
                        best_norm_d = float(norm_d)
                except Exception:
                    continue

            best_deltas[var] = best_norm_d * tol
            if best_y > max_y:
                max_y = best_y

            strategy_data.append({
                '센서': self.VARIABLE_NAMES[var],
                '현재 시점값': current_value,
                '평균': round(original_mean, 3),
                '권장 조정': round(best_norm_d * tol, 3),
                '품질 향상': round(best_y - y_now, 2)
            })

        strategy_data_sorted = sorted(strategy_data, key=lambda x: x['품질 향상'], reverse=True)
        
        return {
            'strategy_data': strategy_data_sorted,
            'quality_score': {
                'y_now': round(y_now, 3),
                'y_best': round(max_y, 3),
                'y_gain': round(max_y - y_now, 3)
            },
            'sensitivity_data': [
                {'name': self.VARIABLE_NAMES[var], 'value': round(float(w_vec[var]), 2)}
                for var in self.INPUT_COLS
            ]
        }

    def calculate_strategy(self, current_lot, up_to_minute=None):
        cal_df = self.dp.cal_df
        lot_df_full = cal_df[cal_df['lot'] == current_lot].sort_values('date').copy()
        if lot_df_full.empty:
            return {'status': 'error', 'message': f'No data for lot {current_lot}'}

        base_t0 = lot_df_full['date'].min()
        max_minutes = int((lot_df_full['date'].max() - base_t0).total_seconds() / 60)

        self.cache['strategy_data'][current_lot] = {}
        self.cache['quality_scores'][current_lot] = {}
        self.cache['sensitivity_data'][current_lot] = {}
        self.cache['base_times'][current_lot] = base_t0

        time_labels = [
            (base_t0 + pd.to_timedelta(i, unit='min')).strftime('%H:%M') 
            for i in range(max_minutes + 1)
        ]
        self.cache['time_labels'][current_lot] = time_labels

        print(f"[Worker2] Lot {current_lot} initialized: {max_minutes} minutes available")
        return {'status': 'ok', 'max_minutes': max_minutes, 'base_time': base_t0.strftime('%Y-%m-%d %H:%M')}

    # 스트리밍 응답

    def get_chart_data(self, current_lot, current_minute, info_box_timestamp=None):
        
        if current_lot not in self.cache['strategy_data']:
            return {'status': 'error', 'message': f'No strategy data for lot {current_lot}'}

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
                print(f"[Worker2] get_chart_data: info_box_timestamp={info_box_timestamp}, calculated cm={cm}")
            except Exception:
                cm = int(current_minute) if current_minute is not None else 0
                print(f"[Worker2] get_chart_data: timestamp parse error, using current_minute={cm}")
        else:
            print(f"[Worker2] get_chart_data: no timestamp, current_minute={cm}")

        result = self._calculate_strategy_for_cutoff(current_lot, cm)
        if not result:
            return {'status': 'error', 'message': f'Failed to calculate strategy for minute {cm}'}

        strategy_data = result['strategy_data']
        quality_score = result['quality_score']
        sensitivity_data = result['sensitivity_data']
        time_labels = self.cache['time_labels'].get(current_lot, [])

        quality_timeline = []
        for minute in range(0, cm + 1, 1):
            timeline_result = self._calculate_strategy_for_cutoff(current_lot, minute)
            if timeline_result:
                quality_timeline.append({
                    'time': time_labels[minute] if minute < len(time_labels) else f"{minute}min",
                    'y_now': timeline_result['quality_score'].get('y_now', 0),
                    'y_best': timeline_result['quality_score'].get('y_best', 0),
                    'y_gain': timeline_result['quality_score'].get('y_gain', 0)
                })

        timestamp = info_box_timestamp if info_box_timestamp else base_t0.strftime('%Y-%m-%d %H:%M')
        
        return {
            'status': 'ok',
            'strategy_data': strategy_data,
            'quality_score': quality_score,
            'sensitivity_data': sensitivity_data,
            'quality_timeline': quality_timeline,
            'time_labels': time_labels,
            'current_minute': cm,
            'base_time': base_t0.strftime('%Y-%m-%d %H:%M'),
            'timestamp': timestamp,
        }
