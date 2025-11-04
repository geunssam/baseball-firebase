/**
 * 게임 데이터 타입 및 정규화 함수
 *
 * 목적:
 * - 데이터 구조 불일치 문제 해결
 * - player.id vs player.playerId vs player.studentId 통일
 * - stats.hits vs stats.totalHits 등 필드명 통일
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

/**
 * 선수 통계 스키마
 */
export const PlayerStatsSchema = {
  // 경기별 기록
  hits: 0,           // 안타
  runs: 0,           // 득점
  goodDefense: 0,    // 수비
  bonusCookie: 0,    // 쿠키

  // 누적 통계
  totalHits: 0,
  totalRuns: 0,
  totalGoodDefense: 0,
  totalBonusCookie: 0,
  totalPoints: 0,    // 총점
  gamesPlayed: 0,    // 출전 경기 수
  mvpCount: 0,       // MVP 횟수

  // 고급 통계
  battingAvg: 0,     // 타율
  homeRuns: 0,       // 홈런
  stolenBases: 0,    // 도루
  rbis: 0,           // 타점
};

/**
 * 선수 ID 추출 (여러 필드명 대응)
 * @param {Object} player - 선수 객체
 * @returns {string|null} 선수 ID
 */
export function getPlayerId(player) {
  if (!player) {
    console.warn('[getPlayerId] player가 null/undefined입니다.');
    return null;
  }

  // 우선순위: playerId > id > studentId
  const id = player.playerId || player.id || player.studentId;

  if (!id) {
    console.warn('[getPlayerId] 선수 ID를 찾을 수 없습니다:', player);
    return null;
  }

  return id;
}

/**
 * 선수 통계 정규화 (필드명 통일)
 * @param {Object} stats - 원본 통계 객체
 * @returns {Object} 정규화된 통계 객체
 */
export function normalizePlayerStats(stats) {
  if (!stats || typeof stats !== 'object') {
    debugLog('gameTypes', '[normalizePlayerStats] stats가 유효하지 않습니다:', stats);
    return { ...PlayerStatsSchema };
  }

  // 경기별 기록 (우선순위: 명시적 필드 > 계산)
  const hits = stats.hits ?? stats.totalHits ?? 0;
  const runs = stats.runs ?? stats.totalRuns ?? 0;
  const goodDefense = stats.goodDefense ?? stats.totalGoodDefense ?? 0;
  const bonusCookie = stats.bonusCookie ?? stats.totalBonusCookie ?? 0;

  // 누적 통계
  const totalHits = stats.totalHits ?? stats.hits ?? 0;
  const totalRuns = stats.totalRuns ?? stats.runs ?? 0;
  const totalGoodDefense = stats.totalGoodDefense ?? stats.goodDefense ?? 0;
  const totalBonusCookie = stats.totalBonusCookie ?? stats.bonusCookie ?? 0;
  const gamesPlayed = stats.gamesPlayed ?? 0;
  const mvpCount = stats.mvpCount ?? 0;

  // 고급 통계
  const battingAvg = stats.battingAvg ?? 0;
  const homeRuns = stats.homeRuns ?? 0;
  const stolenBases = stats.stolenBases ?? 0;
  const rbis = stats.rbis ?? 0;

  // 총점 계산
  const totalPoints = totalHits + totalRuns + totalGoodDefense + totalBonusCookie;

  return {
    // 경기별 기록
    hits,
    runs,
    goodDefense,
    bonusCookie,

    // 누적 통계
    totalHits,
    totalRuns,
    totalGoodDefense,
    totalBonusCookie,
    totalPoints,
    gamesPlayed,
    mvpCount,

    // 고급 통계
    battingAvg,
    homeRuns,
    stolenBases,
    rbis,
  };
}

/**
 * 선수 객체 정규화 (ID + 통계)
 * @param {Object} player - 원본 선수 객체
 * @returns {Object} 정규화된 선수 객체
 */
export function normalizePlayer(player) {
  if (!player) {
    console.warn('[normalizePlayer] player가 null/undefined입니다.');
    return null;
  }

  const playerId = getPlayerId(player);
  const stats = normalizePlayerStats(player.stats || {});

  return {
    ...player,
    id: playerId,           // 통일된 ID 필드
    playerId: playerId,     // 호환성 유지
    stats: stats,           // 정규화된 통계
  };
}

/**
 * 출전 배지 정의
 */
export const APPEARANCE_BADGES = {
  FIRST_GAME: {
    id: 'first-game',
    games: 1,
    name: '첫 출전',
    icon: '🎽',
    description: '첫 경기에 출전했어요',
  },
  STEADY_5: {
    id: 'steady-5',
    games: 5,
    name: '꾸준함',
    icon: '🏃',
    description: '5경기에 출전했어요',
  },
  STEADY_10: {
    id: 'steady-10',
    games: 10,
    name: '열정',
    icon: '🔥',
    description: '10경기에 출전했어요',
  },
  VETERAN_30: {
    id: 'veteran-30',
    games: 30,
    name: '베테랑',
    icon: '⭐',
    description: '30경기에 출전했어요',
  },
  LEGEND_50: {
    id: 'legend-50',
    games: 50,
    name: '레전드',
    icon: '👑',
    description: '50경기에 출전했어요',
  },
  IMMORTAL_100: {
    id: 'immortal-100',
    games: 100,
    name: '불멸',
    icon: '💎',
    description: '100경기에 출전했어요',
  },
};

/**
 * 출전 횟수로 획득 가능한 배지 찾기
 * @param {number} gamesPlayed - 출전 경기 수
 * @param {Array} ownedBadgeIds - 이미 보유한 배지 ID 목록
 * @returns {Object|null} 획득 가능한 배지 또는 null
 */
export function findEligibleAppearanceBadge(gamesPlayed, ownedBadgeIds = []) {
  // 출전 배지를 경기 수 오름차순으로 정렬
  const sortedBadges = Object.values(APPEARANCE_BADGES).sort((a, b) => a.games - b.games);

  for (const badge of sortedBadges) {
    // 이미 보유한 배지는 스킵
    if (ownedBadgeIds.includes(badge.id)) {
      continue;
    }

    // 조건 충족 시 배지 반환
    if (gamesPlayed >= badge.games) {
      return badge;
    }
  }

  return null;
}

/**
 * 여러 선수의 출전 배지 체크
 * @param {Array} players - 선수 목록
 * @param {Object} playerBadgesMap - { playerId: [badgeId, ...] } 형태의 배지 맵
 * @returns {Array} [{ player, badge }, ...] 형태의 배열
 */
export function checkAllPlayersForAppearanceBadges(players, playerBadgesMap = {}) {
  const results = [];

  for (const player of players) {
    const playerId = getPlayerId(player);
    if (!playerId) continue;

    const stats = normalizePlayerStats(player.stats || {});
    const ownedBadgeIds = playerBadgesMap[playerId] || [];

    const badge = findEligibleAppearanceBadge(stats.gamesPlayed, ownedBadgeIds);

    if (badge) {
      results.push({
        player: normalizePlayer(player),
        badge: badge,
      });
    }
  }

  return results;
}
