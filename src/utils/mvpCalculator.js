/**
 * MVP Calculator
 *
 * 선수들의 스탯을 기반으로 MVP 점수를 계산하고,
 * 최고 점수를 가진 선수를 MVP로 선정하는 유틸리티
 */

/**
 * MVP 점수 계산 가중치
 * - 1루타: 1점
 * - 2루타: 2점
 * - 3루타: 3점
 * - 홈런: 5점
 * - 득점: 2점
 * - 수비: 1점
 */
const MVP_WEIGHTS = {
  single: 1,
  double: 2,
  triple: 3,
  homerun: 5,
  runs: 2,
  goodDefense: 1
};

/**
 * 선수의 스탯을 기반으로 MVP 점수 계산
 * @param {Object} stats - 선수 스탯 객체
 * @param {number} stats.single - 1루타 수
 * @param {number} stats.double - 2루타 수
 * @param {number} stats.triple - 3루타 수
 * @param {number} stats.homerun - 홈런 수
 * @param {number} stats.runs - 득점 수
 * @param {number} stats.goodDefense - 수비 수
 * @returns {number} MVP 점수
 */
export function calculateMVPScore(stats) {
  if (!stats) return 0;

  return (
    (stats.single || 0) * MVP_WEIGHTS.single +
    (stats.double || 0) * MVP_WEIGHTS.double +
    (stats.triple || 0) * MVP_WEIGHTS.triple +
    (stats.homerun || 0) * MVP_WEIGHTS.homerun +
    (stats.runs || 0) * MVP_WEIGHTS.runs +
    (stats.goodDefense || 0) * MVP_WEIGHTS.goodDefense
  );
}

/**
 * 여러 선수들 중에서 MVP 선정
 * @param {Array} players - 선수 배열 (각 선수는 { playerId, playerName, stats, ... } 형태)
 * @returns {Object} MVP 선수 정보 { playerId, playerName, score, stats }
 */
export function findMVP(players) {
  if (!players || players.length === 0) {
    return null;
  }

  let mvp = null;
  let maxScore = -1;

  players.forEach(player => {
    const score = calculateMVPScore(player.stats);

    if (score > maxScore) {
      maxScore = score;
      mvp = {
        playerId: player.playerId,
        playerName: player.playerName,
        score: score,
        stats: player.stats
      };
    }
  });

  return mvp;
}

/**
 * MVP 점수를 기준으로 선수들을 정렬
 * @param {Array} players - 선수 배열
 * @param {boolean} descending - true면 내림차순(기본), false면 오름차순
 * @returns {Array} MVP 점수로 정렬된 선수 배열
 */
export function sortPlayersByMVPScore(players, descending = true) {
  if (!players || players.length === 0) {
    return [];
  }

  return [...players].sort((a, b) => {
    const scoreA = calculateMVPScore(a.stats);
    const scoreB = calculateMVPScore(b.stats);

    return descending ? scoreB - scoreA : scoreA - scoreB;
  });
}

/**
 * MVP 점수 범위에 따른 등급 계산
 * @param {number} score - MVP 점수
 * @returns {string} 등급 문자열
 */
export function getMVPGrade(score) {
  if (score >= 50) return 'S (레전드)';
  if (score >= 30) return 'A (우수)';
  if (score >= 15) return 'B (양호)';
  if (score >= 5) return 'C (보통)';
  return 'D (노력 필요)';
}

/**
 * MVP 점수를 사람이 읽기 쉬운 텍스트로 변환
 * @param {number} score - MVP 점수
 * @param {Object} stats - 선수 스탯
 * @returns {string} 점수 설명 텍스트
 */
export function getMVPScoreDescription(score, stats) {
  const contributions = [];

  if (stats.homerun > 0) {
    contributions.push(`홈런 ${stats.homerun}개`);
  }
  if (stats.triple > 0) {
    contributions.push(`3루타 ${stats.triple}개`);
  }
  if (stats.double > 0) {
    contributions.push(`2루타 ${stats.double}개`);
  }
  if (stats.single > 0) {
    contributions.push(`1루타 ${stats.single}개`);
  }
  if (stats.runs > 0) {
    contributions.push(`득점 ${stats.runs}점`);
  }
  if (stats.goodDefense > 0) {
    contributions.push(`수비 ${stats.goodDefense}회`);
  }

  return contributions.length > 0
    ? `${score}점 (${contributions.join(', ')})`
    : `${score}점`;
}
