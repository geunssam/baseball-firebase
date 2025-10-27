/**
 * 선수 ID 생성 유틸리티 (localStorage 기반 시퀀스 관리)
 *
 * 형식: player-{YYMMDDHHmm}{sequence}
 * 예시: player-2510111159001
 *
 * 특징:
 * - 전역 고유 ID (팀 정보 제거)
 * - localStorage에 시퀀스 저장 → 페이지 새로고침 시에도 중복 방지
 * - 분 단위로 시퀀스 리셋
 */

const STORAGE_KEY = 'playerIdSequence';

/**
 * localStorage에서 시퀀스 정보 가져오기
 */
const getSequenceData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : { timestamp: '', counter: 0 };
  } catch (error) {
    console.error('시퀀스 데이터 로드 실패:', error);
    return { timestamp: '', counter: 0 };
  }
};

/**
 * localStorage에 시퀀스 정보 저장
 */
const saveSequenceData = (timestamp, counter) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ timestamp, counter }));
  } catch (error) {
    console.error('시퀀스 데이터 저장 실패:', error);
  }
};

/**
 * 고유한 선수 ID 생성 (전역 고유)
 * @returns {string} 고유한 선수 ID
 */
export const generatePlayerId = () => {
  const now = new Date();

  // YYMMDDHHmm 형식으로 변환
  const year = String(now.getFullYear()).slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const minute = String(now.getMinutes()).padStart(2, '0');

  const currentTimestamp = `${year}${month}${day}${hour}${minute}`;

  // localStorage에서 시퀀스 데이터 가져오기
  const sequenceData = getSequenceData();

  let counter;
  if (currentTimestamp === sequenceData.timestamp) {
    // 같은 시간(분 단위)이면 시퀀스 증가
    counter = sequenceData.counter + 1;
  } else {
    // 다른 시간이면 시퀀스 리셋
    counter = 1;
  }

  // 새 시퀀스 저장
  saveSequenceData(currentTimestamp, counter);

  // 시퀀스를 3자리로 패딩 (001, 002, 003...)
  const sequence = String(counter).padStart(3, '0');

  return `player-${currentTimestamp}${sequence}`;
};

/**
 * 여러 선수 ID를 한 번에 생성
 * @param {number} count - 생성할 ID 개수
 * @returns {string[]} 선수 ID 배열
 */
export const generatePlayerIds = (count) => {
  const ids = [];
  for (let i = 0; i < count; i++) {
    ids.push(generatePlayerId());
  }
  return ids;
};
