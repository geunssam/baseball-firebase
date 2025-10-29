/**
 * 게임 유틸리티 함수
 */

/**
 * 디버그 로그 함수
 * 개발 환경에서만 로그 출력
 *
 * @param {string} category - 로그 카테고리
 * @param {string} message - 로그 메시지
 * @param {any} data - 추가 데이터
 */
export function debugLog(category, message, data = null) {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toLocaleTimeString('ko-KR');
    console.log(`[${timestamp}] [${category}] ${message}`, data || '');
  }
}

// 개발 환경에서 테스트용으로 window에 노출
if (process.env.NODE_ENV === 'development') {
  window.debugLog = debugLog;
  console.log('🔧 debugLog utility loaded. Access via window.debugLog()');
}
