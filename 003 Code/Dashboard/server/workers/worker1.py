from common import get_st, get_aj, get_wi, get_y
import pandas as pd
import numpy as np


class Worker1:

    INPUT_COLS = ['x5', 'x1', 'x3', 'x2', 'x4']

    VARIABLE_NAMES = {
        'x5': '지료 유량',
        'x1': '평량',
        'x3': '수분',
        'x2': '속도',
        'x4': '건조기 압력',
    }

    PADDING_MODE = "hold"

    def __init__(self, data_processor):
        self.dp = data_processor
        self.cache = {
            'similar_lots': {},
            'similar_lots_data': {},
            'bands': {},
            'time_labels': {},
        }

    # 유틸 메서드

    def _build_bands(self, x_ref: dict, x_tol: dict):
        out = {}
        for var in self.INPUT_COLS:
            ref = x_ref.get(var, None)
            tol = x_tol.get(var, None)
            if ref is not None and pd.notna(ref):
                ref_v = round(float(ref), 2)
                if tol is not None and pd.notna(tol):
                    tol_v = float(tol)
                    out[var] = {
                        'ref': ref_v,
                        'lower': round(ref_v - tol_v, 2),
                        'upper': round(ref_v + tol_v, 2),
                    }
                else:
                    out[var] = {'ref': ref_v, 'lower': None, 'upper': None}
            else:
                out[var] = {'ref': None, 'lower': None, 'upper': None}
        return out

    def _pad_series(self, series_list, max_len):
        out = list(series_list)
        if len(out) >= max_len:
            return out[:max_len]
        pad_len = max_len - len(out)
        if self.PADDING_MODE == "hold":
            last = out[-1] if out else None
            out.extend([last] * pad_len)
        else:  # "none"
            out.extend([None] * pad_len)
        return out

    # 유사 lot 계산

    def calculate_similar_lots(self, current_lot, up_to_minute=None):
        cal_df = self.dp.cal_df
        lot_df_full = cal_df[cal_df['lot'] == current_lot].sort_values('date').copy()
        if lot_df_full.empty:
            return {'status': 'error', 'message': f'No data for lot {current_lot}'}

        base_t0 = lot_df_full['date'].min()

        if up_to_minute is not None:
            cutoff_time = base_t0 + pd.to_timedelta(up_to_minute, unit='m')
            lot_df_partial = lot_df_full[lot_df_full['date'] <= cutoff_time].copy()
        else:
            lot_df_partial = lot_df_full.copy()

        paper = lot_df_full['paper'].iloc[0]
        bw = lot_df_full['bw'].iloc[0]
        gkey = (paper, bw)
        df_same_set = cal_df[(cal_df['paper'] == paper) & (cal_df['bw'] == bw)].copy()

        x_ref = self.dp.ref_dict.get(gkey, {})
        x_tol = self.dp.tol_dict.get(gkey, {})

        try:
            w_vec, _ = get_wi(df_same_set, self.INPUT_COLS, 'cal_production')
        except Exception as e:
            return {'status': 'error', 'message': f'get_wi failed: {e}'}

        results = []
        for lot, df_lot in df_same_set.groupby('lot'):
            df_lot_sorted = df_lot.sort_values('date')
            
            if up_to_minute is not None:
                lot_t0 = df_lot_sorted['date'].min()
                cutoff_time = lot_t0 + pd.to_timedelta(up_to_minute, unit='m')
                df_used = df_lot_sorted[df_lot_sorted['date'] <= cutoff_time].copy()
            else:
                df_used = df_lot_sorted
            
            if df_used.empty:
                continue
                
            try:
                score_mat = get_st(df_used, self.INPUT_COLS, x_ref, x_tol)
                a_ij = get_aj(df_used, self.INPUT_COLS, ratios=[0.2, 0.6, 0.2])
                y = get_y(score_mat, a_ij, w_vec)
            except Exception:
                continue
            results.append({'lot': lot, 'y': y})

        if not results:
            return {'status': 'error', 'message': 'No comparable lots'}

        score_df = pd.DataFrame(results)
        if current_lot not in score_df['lot'].values:
            return {'status': 'error', 'message': f'Current lot {current_lot} not in score set'}

        y_current = float(score_df.loc[score_df['lot'] == current_lot, 'y'].values[0])
        score_df['distance'] = (score_df['y'] - y_current).abs()
        similar_lots = score_df[score_df['lot'] != current_lot].nsmallest(3, 'distance')['lot'].tolist()

        prev_similar = self.cache.get('similar_lots', {}).get(current_lot, [])
        
        self.cache['similar_lots'][current_lot] = similar_lots
        
        if prev_similar != similar_lots:
            self._cache_similar_lots_data(current_lot, similar_lots)
            self._cache_time_labels(current_lot, similar_lots, base_t0)
            print(f"[Worker1] Similar lots changed for {current_lot}: {prev_similar} -> {similar_lots}")
        
        self.cache['bands'][current_lot] = self._build_bands(x_ref, x_tol)

        similar_scores = [score_df.loc[score_df['lot']==lot, 'y'].values[0] for lot in similar_lots]
        print(f"[Worker1] Lot {current_lot} at minute {up_to_minute}: Similar lots = {similar_lots}")
        print(f"[Worker1] Y-scores: Current={y_current:.2f}, Similar={similar_scores}")

        return {'status': 'ok', 'similar_lots': similar_lots, 'y_current': y_current}

    def _cache_similar_lots_data(self, current_lot, similar_lots):
        cal_df = self.dp.cal_df
        data_by_var = {}

        for var in self.INPUT_COLS:
            var_dict = {}
            for lot in similar_lots:
                lot_data = cal_df[cal_df['lot'] == lot].sort_values('date').copy()
                if lot_data.empty:
                    continue

                lot_t0 = lot_data['date'].min()
                lot_data['time_min'] = ((lot_data['date'] - lot_t0).dt.total_seconds() / 60).astype(int)
                ser = lot_data.set_index('time_min')[var].sort_index()
                if ser.empty:
                    continue

                lot_max_min = int(ser.index.max())
                idx = pd.RangeIndex(0, lot_max_min + 1, 1)
                ser = ser.reindex(idx).ffill().bfill()
                var_dict[lot] = [round(float(x), 3) if pd.notna(x) else None for x in ser.tolist()]

            data_by_var[var] = var_dict

        self.cache['similar_lots_data'][current_lot] = data_by_var

    def _cache_time_labels(self, current_lot, similar_lots, base_t0):
        cal_df = self.dp.cal_df
        cl = cal_df[cal_df['lot'] == current_lot].sort_values('date').copy()
        if cl.empty:
            self.cache['time_labels'][current_lot] = []
            return

        current_max_min = int((cl['date'].max() - base_t0).total_seconds() / 60)
        max_length = current_max_min + 1

        for lot in similar_lots:
            lot_df = cal_df[cal_df['lot'] == lot].sort_values('date').copy()
            if lot_df.empty:
                continue
            lot_t0 = lot_df['date'].min()
            lot_max_min = int((lot_df['date'].max() - lot_t0).total_seconds() / 60)
            if lot_max_min + 1 > max_length:
                max_length = lot_max_min + 1

        idx = pd.RangeIndex(0, max_length, 1)
        self.cache['time_labels'][current_lot] = [
            (base_t0 + pd.to_timedelta(i, unit='min')).strftime('%H:%M') for i in idx
        ]

    # 스트리밍 응답

    def get_chart_data(self, current_lot, current_minute, info_box_timestamp=None):
        
        if current_minute is not None and current_minute > 0:
            should_recalculate = (
                current_minute <= 15 and current_minute % 5 == 0 or
                current_minute > 15 and current_minute % 10 == 0
            )
            
            if should_recalculate:
                recalc_result = self.calculate_similar_lots(current_lot, up_to_minute=current_minute)
                if recalc_result.get('status') == 'ok':
                    print(f"[Worker1] Recalculated similar lots for {current_lot} at minute {current_minute}")
        
        similar_lots = self.cache['similar_lots'].get(current_lot, [])
        similar_data = self.cache['similar_lots_data'].get(current_lot, {})
        bands = self.cache['bands'].get(current_lot, {})
        time_labels = self.cache.get('time_labels', {}).get(current_lot, [])
        if not time_labels:
            return {'status': 'error', 'message': 'No time_labels cached for this lot'}

        max_length = len(time_labels)

        cal_df = self.dp.cal_df
        lot_df = cal_df[cal_df['lot'] == current_lot].sort_values('date').copy()
        if lot_df.empty:
            return {'status': 'error', 'message': 'No data for current lot'}

        base_t0 = lot_df['date'].min()
        lot_df['time_min'] = ((lot_df['date'] - base_t0).dt.total_seconds() / 60).astype(int)
        current_max_min = int(lot_df['time_min'].max())

        current_lot_data = {}
        for var in self.INPUT_COLS:
            ser = lot_df.set_index('time_min')[var].sort_index()
            idx = pd.RangeIndex(0, current_max_min + 1, 1)
            ser = ser.reindex(idx).ffill().bfill()
            arr = [round(float(x), 3) if pd.notna(x) else None for x in ser.tolist()]
            padded = self._pad_series(arr, max_length)
            current_lot_data[var] = padded

        similar_data_out = {var: {} for var in self.INPUT_COLS}
        for var in self.INPUT_COLS:
            var_dict = similar_data.get(var, {})
            for lot in similar_lots:
                series = var_dict.get(lot, [])
                series = [round(float(x), 3) if (x is not None and pd.notna(x)) else None for x in series]
                padded = self._pad_series(series, max_length)
                similar_data_out[var][lot] = padded

        timestamp = base_t0.strftime('%Y-%m-%d %H:%M')
        cm = int(current_minute) if current_minute is not None else 0
        if info_box_timestamp:
            try:
                info_time = pd.to_datetime(info_box_timestamp)
                diff_sec = (info_time - base_t0).total_seconds()
                cm = int(diff_sec // 60)
                cm = max(0, cm)
                timestamp = info_box_timestamp
            except Exception:
                cm = 0
                timestamp = base_t0.strftime('%Y-%m-%d %H:%M')

        if max_length > 0 and cm >= max_length:
            cm = cm % max_length
        elif max_length == 0:
            cm = 0

        current_row = lot_df[lot_df['time_min'] == cm]
        current_point = {}
        if not current_row.empty:
            for var in self.INPUT_COLS:
                try:
                    value = current_row[var].iloc[0]
                    current_point[var] = round(float(value), 3) if pd.notna(value) else None
                except Exception:
                    current_point[var] = None

        return {
            'status': 'ok',
            'similar_lots': similar_lots,
            'similar_lots_data': similar_data_out,
            'current_lot_data': current_lot_data,
            'current_data': current_point,
            'bands': bands,
            'variable_names': self.VARIABLE_NAMES,
            'current_minute': cm,
            'time_labels': time_labels,
            'base_time': base_t0.strftime('%Y-%m-%d %H:%M'),
            'timestamp': timestamp,
        }
