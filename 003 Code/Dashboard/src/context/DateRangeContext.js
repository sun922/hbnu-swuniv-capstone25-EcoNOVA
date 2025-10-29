import { createContext, useContext, useState } from 'react';

const DateRangeContext = createContext();

export const useDateRange = () => {
  const context = useContext(DateRangeContext);
  if (!context) {
    throw new Error('useDateRange must be used within a DateRangeProvider');
  }
  return context;
};

export const DateRangeProvider = ({ children }) => {
  // 실제 데이터가 있는 날짜로 기본값 설정 (2025-09-10)
  const [startDateTime, setStartDateTime] = useState('2025-09-10T00:00');
  const [endDateTime, setEndDateTime] = useState('2025-09-10T23:59');

  const value = {
    startDateTime,
    setStartDateTime,
    endDateTime,
    setEndDateTime
  };

  return (
    <DateRangeContext.Provider value={value}>
      {children}
    </DateRangeContext.Provider>
  );
};
