/**
 * 학생 코드 생성 유틸리티 (Firebase 버전)
 *
 * 형식: {teacherId}-{studentId}
 * 예시: abc123xyz-player-2510111159001
 *
 * 특징:
 * - teacherId 포함으로 선생님별로 학생 코드 격리
 * - 기존 player ID 시스템 활용
 * - 간단하면서도 충돌 방지
 */

/**
 * 학생 코드 생성
 * @param {string} teacherId - 선생님 Firebase UID
 * @param {string} playerId - 학생의 고유 player ID
 * @returns {string} 학생 코드 (예: "abc123-player-001")
 */
export const generateStudentCode = (teacherId, playerId) => {
  // teacherId의 앞 6자리만 사용 (간결화)
  const shortTeacherId = teacherId.substring(0, 6);
  // playerId에서 "player-" 제거하고 뒤 6자리만 사용
  const shortPlayerId = playerId.replace('player-', '').slice(-6);

  return `${shortTeacherId}-${shortPlayerId}`;
};

/**
 * 학생 코드에서 teacherId 추출
 * @param {string} studentCode - 학생 코드
 * @returns {string} teacherId 앞 6자리
 */
export const extractTeacherIdFromCode = (studentCode) => {
  const parts = studentCode.split('-');
  return parts[0]; // 앞부분이 teacherId
};

/**
 * 학생 코드 검증
 * @param {string} studentCode - 검증할 학생 코드
 * @returns {boolean} 유효성 여부
 */
export const isValidStudentCode = (studentCode) => {
  if (!studentCode || typeof studentCode !== 'string') return false;

  // 형식: {6자리}-{6자리}
  const pattern = /^[a-zA-Z0-9]{6}-[0-9]{6}$/;
  return pattern.test(studentCode);
};
