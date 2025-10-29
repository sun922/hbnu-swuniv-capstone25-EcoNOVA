// 유틸리티 함수들

/**
 * 날짜 포맷팅
 * @param {Date|string} date - 포맷팅할 날짜
 * @param {string} format - 포맷 문자열
 * @returns {string} 포맷된 날짜 문자열
 */
export const formatDate = (date, format = 'YYYY-MM-DD HH:mm') => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  
  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hours)
    .replace('mm', minutes);
};

/**
 * 숫자 포맷팅 (천 단위 콤마)
 * @param {number} num - 포맷팅할 숫자
 * @returns {string} 포맷된 숫자 문자열
 */
export const formatNumber = (num) => {
  return new Intl.NumberFormat('ko-KR').format(num);
};

/**
 * 퍼센트 포맷팅
 * @param {number} value - 값
 * @param {number} total - 전체 값
 * @param {number} decimals - 소수점 자릿수
 * @returns {string} 퍼센트 문자열
 */
export const formatPercentage = (value, total, decimals = 1) => {
  if (total === 0) return '0%';
  return `${((value / total) * 100).toFixed(decimals)}%`;
};

/**
 * 색상 생성 (차트용)
 * @param {number} index - 인덱스
 * @param {number} total - 전체 개수
 * @returns {string} HSL 색상 문자열
 */
export const generateColor = (index, total) => {
  const hue = (index * 360) / total;
  return `hsl(${hue}, 70%, 50%)`;
};

/**
 * 디바운스 함수
 * @param {Function} func - 실행할 함수
 * @param {number} delay - 지연 시간 (ms)
 * @returns {Function} 디바운스된 함수
 */
export const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

/**
 * 로컬 스토리지 헬퍼
 */
export const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Storage set error:', error);
    }
  },
  
  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Storage remove error:', error);
    }
  }
};
