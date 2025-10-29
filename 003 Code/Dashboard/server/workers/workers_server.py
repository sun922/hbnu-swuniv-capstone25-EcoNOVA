#!/usr/bin/env python3

from __future__ import annotations

from flask import Flask, jsonify, request
from flask_cors import CORS
import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from common import DataProcessor 
from worker1 import Worker1      
from worker2 import Worker2     
from worker5 import Worker5       
from worker6 import Worker6      

app = Flask(__name__)
CORS(app)

data_processor: DataProcessor | None = None
worker1: Worker1 | None = None
worker2: Worker2 | None = None
worker5: Worker5 | None = None
worker6: Worker6 | None = None

worker1_current_lot: str | None = None
worker1_current_minute: int = 0

worker2_current_lot: str | None = None
worker2_current_minute: int = 0

worker5_current_lot: str | None = None
worker5_current_minute: int = 0

worker6_current_lot: str | None = None
worker6_current_minute: int = 0

# 공통 초기화

@app.route('/init', methods=['GET'])
def initialize_all():
    global data_processor, worker1, worker2, worker5, worker6
    try:
        if data_processor is None:
            csv_path = os.path.join(
                os.path.dirname(__file__),
                '..', '..', 'public', 'worker_dashboard', 'simulate_paper_data.csv'
            )
            data_processor = DataProcessor(csv_path)
            data_processor.initialize()

        if worker1 is None:
            worker1 = Worker1(data_processor)

        if worker2 is None:
            worker2 = Worker2(data_processor)

        if worker5 is None:
            worker5 = Worker5(data_processor)

        if worker6 is None:
            worker6 = Worker6(data_processor)

        return jsonify({
            'status': 'ok', 
            'message': 'All workers initialized successfully',
            'worker1_initialized': worker1 is not None,
            'worker2_initialized': worker2 is not None,
            'worker5_initialized': worker5 is not None,
            'worker6_initialized': worker6 is not None
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Worker1 엔드포인트

@app.route('/worker1/init', methods=['GET'])
def worker1_init():
    return initialize_all()

@app.route('/worker1/set-lot', methods=['POST'])
def worker1_set_lot():
    global worker1_current_lot, worker1_current_minute
    try:
        if worker1 is None:
            return jsonify({'status': 'error', 'message': 'Worker1 not initialized'}), 400

        body = request.get_json(silent=True) or {}
        lot = body.get('lot')
        if not lot:
            return jsonify({'status': 'error', 'message': 'Lot is required'}), 400

        result = worker1.calculate_similar_lots(lot, up_to_minute=0)
        worker1_current_lot = lot
        worker1_current_minute = 0

        cal_df = worker1.dp.cal_df
        lot_df = cal_df[cal_df['lot'] == lot].sort_values('date')
        base_time = lot_df['date'].min().strftime('%Y-%m-%d %H:%M') if not lot_df.empty else None

        return jsonify({
            'status': 'ok',
            'lot': lot,
            'similar_lots': result.get('similar_lots', []),
            'y_current': result.get('y_current', 0),
            'base_time': base_time
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/worker1/data', methods=['GET'])
def worker1_get_data():
    global worker1_current_minute
    try:
        if worker1 is None or worker1_current_lot is None:
            return jsonify({'status': 'error', 'message': 'Worker1 not initialized or no lot set'}), 400

        minute_arg = request.args.get('minute', type=int)
        if minute_arg is not None:
            worker1_current_minute = minute_arg

        info_box_timestamp = request.args.get('timestamp', None)

        data = worker1.get_chart_data(
            current_lot=worker1_current_lot,
            current_minute=worker1_current_minute,
            info_box_timestamp=info_box_timestamp
        )

        responded_minute = worker1_current_minute
        worker1_current_minute += 1

        return jsonify({
            'status': 'ok',
            'data': data,
            'minute': responded_minute,
            'current_minute': worker1_current_minute
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/worker1/health', methods=['GET'])
def worker1_health():
    return jsonify({
        'status': 'ok',
        'initialized': (data_processor is not None and worker1 is not None),
        'current_lot': worker1_current_lot,
        'current_minute': worker1_current_minute
    })

# Worker2 엔드포인트

@app.route('/worker2/init', methods=['GET'])
def worker2_init():
    return initialize_all()

@app.route('/worker2/set-lot', methods=['POST'])
def worker2_set_lot():
    global worker2_current_lot, worker2_current_minute
    try:
        if worker2 is None:
            return jsonify({'status': 'error', 'message': 'Worker2 not initialized'}), 400

        body = request.get_json(silent=True) or {}
        lot = body.get('lot')
        if not lot:
            return jsonify({'status': 'error', 'message': 'Lot is required'}), 400

        result = worker2.calculate_strategy(lot)

        if result['status'] == 'ok':
            worker2_current_lot = lot
            worker2_current_minute = 0
            return jsonify({
                'status': 'ok',
                'lot': lot,
                'max_minutes': result['max_minutes'],
                'base_time': result['base_time'],
                'timestamp': result['base_time']
            })
        else:
            return jsonify(result), 400

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/worker2/data', methods=['GET'])
def worker2_get_data():
    global worker2_current_minute
    try:
        if worker2 is None or worker2_current_lot is None:
            return jsonify({'status': 'error', 'message': 'Worker2 not initialized or no lot set'}), 400

        minute_arg = request.args.get('minute', type=int)
        if minute_arg is not None:
            worker2_current_minute = minute_arg

        info_box_timestamp = request.args.get('timestamp', None)

        data = worker2.get_chart_data(
            current_lot=worker2_current_lot,
            current_minute=worker2_current_minute,
            info_box_timestamp=info_box_timestamp
        )

        responded_minute = worker2_current_minute
        worker2_current_minute += 1

        return jsonify({
            'status': 'ok',
            'data': data,
            'minute': responded_minute,
            'current_minute': worker2_current_minute
        })

    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/worker2/health', methods=['GET'])
def worker2_health():
    return jsonify({
        'status': 'ok',
        'initialized': (data_processor is not None and worker2 is not None),
        'current_lot': worker2_current_lot,
        'current_minute': worker2_current_minute
    })

# Worker5 엔드포인트

@app.route('/worker5/init', methods=['GET'])
def worker5_init():
    return initialize_all()

@app.route('/worker5/set-lot', methods=['POST'])
def worker5_set_lot():
    global worker5_current_lot, worker5_current_minute, worker5
    try:
        data = request.get_json()
        lot = data.get('lot')
        if not lot:
            return jsonify({'status': 'error', 'message': 'Lot required'}), 400
        
        worker5_current_lot = lot
        worker5_current_minute = 0

        result = worker5.calculate_importance(lot)
        worker5_current_minute = 0
        
        cal_df = worker5.dp.cal_df
        lot_df = cal_df[cal_df['lot'] == lot].sort_values('date')
        base_time = lot_df['date'].min().strftime('%Y-%m-%d %H:%M') if not lot_df.empty else None
        
        return jsonify({
            'status': 'ok',
            'message': 'Worker5 lot set',
            'result': result,
            'base_time': base_time
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/worker5/data', methods=['GET'])
def worker5_get_data():
    global worker5_current_minute
    try:
        if worker5 is None or worker5_current_lot is None:
            return jsonify({'status': 'error', 'message': 'Worker5 not initialized or no lot set'}), 400

        minute_arg = request.args.get('minute', type=int)
        if minute_arg is not None:
            worker5_current_minute = minute_arg

        info_box_timestamp = request.args.get('timestamp', None)

        data = worker5.get_chart_data(
            current_lot=worker5_current_lot,
            current_minute=worker5_current_minute,
            info_box_timestamp=info_box_timestamp
        )

        responded_minute = worker5_current_minute
        worker5_current_minute += 1

        return jsonify({
            'status': 'ok',
            'data': data,
            'minute': responded_minute,
            'current_minute': worker5_current_minute
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/worker5/health', methods=['GET'])
def worker5_health():
    return jsonify({
        'status': 'ok',
        'initialized': (data_processor is not None and worker5 is not None),
        'current_lot': worker5_current_lot,
        'current_minute': worker5_current_minute
    })

# Worker6 엔드포인트

@app.route('/worker6/init', methods=['GET'])
def worker6_init():
    return initialize_all()

@app.route('/worker6/set-lot', methods=['POST'])
def worker6_set_lot():
    global worker6_current_lot, worker6_current_minute, worker6
    try:
        data = request.get_json()
        lot = data.get('lot')
        if not lot:
            return jsonify({'status': 'error', 'message': 'Lot required'}), 400
        
        worker6_current_lot = lot
        worker6_current_minute = 0

        result = worker6.calculate_sensitivity(lot)
        worker6_current_minute = 0
        
        cal_df = worker6.dp.cal_df
        lot_df = cal_df[cal_df['lot'] == lot].sort_values('date')
        base_time = lot_df['date'].min().strftime('%Y-%m-%d %H:%M') if not lot_df.empty else None
        
        return jsonify({
            'status': 'ok',
            'message': 'Worker6 lot set',
            'result': result,
            'base_time': base_time
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/worker6/data', methods=['GET'])
def worker6_get_data():
    global worker6_current_minute
    try:
        if worker6 is None or worker6_current_lot is None:
            return jsonify({'status': 'error', 'message': 'Worker6 not initialized or no lot set'}), 400

        minute_arg = request.args.get('minute', type=int)
        if minute_arg is not None:
            worker6_current_minute = minute_arg

        info_box_timestamp = request.args.get('timestamp', None)

        data = worker6.get_chart_data(
            current_lot=worker6_current_lot,
            current_minute=worker6_current_minute,
            info_box_timestamp=info_box_timestamp
        )

        responded_minute = worker6_current_minute
        worker6_current_minute += 1

        return jsonify({
            'status': 'ok',
            'data': data,
            'minute': responded_minute,
            'current_minute': worker6_current_minute
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@app.route('/worker6/health', methods=['GET'])
def worker6_health():
    return jsonify({
        'status': 'ok',
        'initialized': (data_processor is not None and worker6 is not None),
        'current_lot': worker6_current_lot,
        'current_minute': worker6_current_minute
    })

# 공통 엔드포인트

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'data_processor_initialized': data_processor is not None,
        'worker1_initialized': worker1 is not None,
        'worker2_initialized': worker2 is not None,
        'worker5_initialized': worker5 is not None,
        'worker6_initialized': worker6 is not None,
        'worker1_current_lot': worker1_current_lot,
        'worker2_current_lot': worker2_current_lot,
        'worker5_current_lot': worker5_current_lot,
        'worker6_current_lot': worker6_current_lot,
        'data_rows': len(data_processor.cal_df) if data_processor is not None else 0
    })

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5002, debug=False, use_reloader=False)
