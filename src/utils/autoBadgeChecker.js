/**
 * 자동 배지 수여 조건 체크 유틸리티
 */

import { CONDITION_TYPES } from '../constants/badgeConditions';

/**
 * 선수 통계 객체를 기반으로 배지 조건을 만족하는지 확인
 * @param {Object} playerStats - 선수 통계 객체
 * @param {string} conditionType - 조건 타입
 * @param {Object} conditionData - 조건 데이터
 * @returns {boolean} 조건 만족 여부
 */
export function checkBadgeCondition(playerStats, conditionType, conditionData) {
  if (!playerStats || !conditionType || !conditionData) {
    return false;
  }

  switch (conditionType) {
    case CONDITION_TYPES.MANUAL:
      return false; // 수동 배지는 자동 수여 안 함

    case CONDITION_TYPES.AUTO_APPEARANCES: {
      const appearances = playerStats.gamesPlayed || 0;
      const minAppearances = conditionData.minAppearances || 0;
      return appearances >= minAppearances;
    }

    case CONDITION_TYPES.AUTO_BATTING_AVG: {
      const battingAvg = playerStats.battingAvg || 0;
      const minBattingAvg = parseFloat(conditionData.minBattingAvg) || 0;
      return battingAvg >= minBattingAvg;
    }

    case CONDITION_TYPES.AUTO_HOME_RUNS: {
      const homeRuns = playerStats.homeRuns || 0;
      const minHomeRuns = conditionData.minHomeRuns || 0;
      return homeRuns >= minHomeRuns;
    }

    case CONDITION_TYPES.AUTO_STOLEN_BASES: {
      const stolenBases = playerStats.stolenBases || 0;
      const minStolenBases = conditionData.minStolenBases || 0;
      return stolenBases >= minStolenBases;
    }

    case CONDITION_TYPES.AUTO_RUNS: {
      const runs = playerStats.runs || 0;
      const minRuns = conditionData.minRuns || 0;
      return runs >= minRuns;
    }

    case CONDITION_TYPES.AUTO_RBIS: {
      const rbis = playerStats.rbis || 0;
      const minRbis = conditionData.minRbis || 0;
      return rbis >= minRbis;
    }

    case CONDITION_TYPES.AUTO_HITS: {
      const hits = playerStats.hits || 0;
      const minHits = conditionData.minHits || 0;
      return hits >= minHits;
    }

    default:
      console.warn(`알 수 없는 조건 타입: ${conditionType}`);
      return false;
  }
}

/**
 * 선수의 현재 통계를 기반으로 자동 수여 가능한 배지 목록 찾기
 * @param {Object} playerStats - 선수 통계 객체
 * @param {Array} customBadges - 커스텀 배지 목록
 * @param {Array} ownedBadges - 이미 보유한 배지 ID 목록
 * @returns {Array} 수여 가능한 배지 ID 목록
 */
export function findEligibleBadges(playerStats, customBadges = [], ownedBadges = []) {
  const eligibleBadges = [];

  // 자동 수여 조건이 있는 커스텀 배지만 필터링
  const autoBadges = customBadges.filter(
    badge => badge.conditionType !== CONDITION_TYPES.MANUAL && badge.conditionData
  );

  for (const badge of autoBadges) {
    // 이미 보유한 배지는 스킵
    if (ownedBadges.includes(badge.id)) {
      continue;
    }

    // 조건 체크
    const isEligible = checkBadgeCondition(
      playerStats,
      badge.conditionType,
      badge.conditionData
    );

    if (isEligible) {
      eligibleBadges.push(badge.id);
    }
  }

  return eligibleBadges;
}

/**
 * 여러 선수의 통계를 받아서 각 선수별 자동 수여 가능한 배지 맵 생성
 * @param {Array} players - 선수 목록 (id, stats 포함)
 * @param {Array} customBadges - 커스텀 배지 목록
 * @param {Object} playerBadgesMap - 선수 ID를 키로 하는 보유 배지 맵
 * @returns {Object} { playerId: [badgeId, ...], ... }
 */
export function checkAllPlayersForBadges(players, customBadges, playerBadgesMap = {}) {
  const result = {};

  for (const player of players) {
    const playerStats = player.stats || {};
    const ownedBadges = playerBadgesMap[player.id] || [];
    const eligibleBadges = findEligibleBadges(playerStats, customBadges, ownedBadges);

    if (eligibleBadges.length > 0) {
      result[player.id] = eligibleBadges;
    }
  }

  return result;
}
