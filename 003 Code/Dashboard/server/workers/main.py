import sys
import json
from common import DataProcessor
from worker1 import Worker1

class WorkerOrchestrator:
    def __init__(self, csv_path):
        self.dp = DataProcessor(csv_path)
        self.worker1 = Worker1(self.dp)
        self.current_lot = None
        self.current_minute = 0
        
    def handle_command(self, cmd):
        action = cmd['action']
        
        if action == 'initialize':
            return self.dp.initialize()
            
        elif action == 'set_lot':
            self.current_lot = cmd['lot']
            self.current_minute = 0
            result = self.worker1.calculate_similar_lots(self.current_lot, up_to_minute=0)
            return result
            
        elif action == 'update_similar_lots':
            self.current_minute = cmd.get('minute', self.current_minute)
            result = self.worker1.calculate_similar_lots(self.current_lot, up_to_minute=self.current_minute)
            return result
            
        elif action == 'get_data':
            minute = cmd.get('minute', self.current_minute)
            return self.worker1.get_chart_data(self.current_lot, minute)
        
        return {'error': 'Unknown action'}
    
    def run(self):
        for line in sys.stdin:
            try:
                cmd = json.loads(line.strip())
                result = self.handle_command(cmd)
                print(json.dumps(result), flush=True)
            except Exception as e:
                import traceback
                print(json.dumps({'error': str(e), 'traceback': traceback.format_exc()}), flush=True)

if __name__ == '__main__':
    csv_path = sys.argv[1]
    orchestrator = WorkerOrchestrator(csv_path)
    orchestrator.run()
