// 배지 시스템 - 선수들의 성취를 추적하고 보상

// 배지 등급
export const BADGE_TIERS = {
  BEGINNER: 1,    // 입문
  SKILLED: 2,     // 숙련
  MASTER: 3,      // 마스터
  LEGEND: 4,      // 레전드
  SPECIAL: 5      // 특별
};

// 배지 정의
export const BADGES = {
  // ===== 입문 배지 (1단계) =====
  FIRST_GAME: {
    id: 'first_game',
    name: '첫 출전',
    icon: '🎽',
    tier: BADGE_TIERS.BEGINNER,
    description: '첫 경기 참여를 축하합니다!',
    condition: (stats) => stats.gamesPlayed >= 1
  },
  FIRST_HIT: {
    id: 'first_hit',
    name: '첫 안타',
    icon: '🎯',
    tier: BADGE_TIERS.BEGINNER,
    description: '첫 안타를 기록했습니다!',
    condition: (stats) => stats.totalHits >= 1
  },
  FIRST_RUN: {
    id: 'first_run',
    name: '첫 득점',
    icon: '🏃',
    tier: BADGE_TIERS.BEGINNER,
    description: '첫 득점에 성공했습니다!',
    condition: (stats) => stats.totalRuns >= 1
  },
  FIRST_DEFENSE: {
    id: 'first_defense',
    name: '첫 수비',
    icon: '🛡️',
    tier: BADGE_TIERS.BEGINNER,
    description: '첫 수비에 성공했습니다!',
    condition: (stats) => stats.totalGoodDefense >= 1
  },
  FIRST_COOKIE: {
    id: 'first_cookie',
    name: '첫 쿠키',
    icon: '🍪',
    tier: BADGE_TIERS.BEGINNER,
    description: '첫 보너스 쿠키를 받았습니다!',
    condition: (stats) => stats.totalBonusCookie >= 1
  },

  // ===== 숙련 배지 (2단계) =====
  STEADY: {
    id: 'steady',
    name: '꾸준함',
    icon: '💪',
    tier: BADGE_TIERS.SKILLED,
    description: '5경기 출전!',
    condition: (stats) => stats.gamesPlayed >= 5,
    progress: (stats) => Math.min(100, (stats.gamesPlayed / 5) * 100)
  },
  HIT_MAKER: {
    id: 'hit_maker',
    name: '안타 메이커',
    icon: '⚡',
    tier: BADGE_TIERS.SKILLED,
    description: '안타 10개 달성!',
    condition: (stats) => stats.totalHits >= 10,
    progress: (stats) => Math.min(100, (stats.totalHits / 10) * 100)
  },
  RUNNING_MACHINE: {
    id: 'running_machine',
    name: '러닝머신',
    icon: '🏃‍♂️',
    tier: BADGE_TIERS.SKILLED,
    description: '득점 10점 달성!',
    condition: (stats) => stats.totalRuns >= 10,
    progress: (stats) => Math.min(100, (stats.totalRuns / 10) * 100)
  },
  DEFENSE_MASTER: {
    id: 'defense_master',
    name: '수비의 달인',
    icon: '⭐🛡️',
    tier: BADGE_TIERS.SKILLED,
    description: '수비 10회 성공!',
    condition: (stats) => stats.totalGoodDefense >= 10,
    progress: (stats) => Math.min(100, (stats.totalGoodDefense / 10) * 100)
  },
  COOKIE_COLLECTOR: {
    id: 'cookie_collector',
    name: '쿠키 수집가',
    icon: '💰🍪',
    tier: BADGE_TIERS.SKILLED,
    description: '쿠키 10개 수집!',
    condition: (stats) => stats.totalBonusCookie >= 10,
    progress: (stats) => Math.min(100, (stats.totalBonusCookie / 10) * 100)
  },

  // ===== 마스터 배지 (3단계) =====
  IRON_MAN: {
    id: 'iron_man',
    name: '철인',
    icon: '🦾',
    tier: BADGE_TIERS.MASTER,
    description: '10경기 출전!',
    condition: (stats) => stats.gamesPlayed >= 10,
    progress: (stats) => Math.min(100, (stats.gamesPlayed / 10) * 100)
  },
  HIT_KING: {
    id: 'hit_king',
    name: '안타왕',
    icon: '👑⚡',
    tier: BADGE_TIERS.MASTER,
    description: '안타 30개 달성!',
    condition: (stats) => stats.totalHits >= 30,
    progress: (stats) => Math.min(100, (stats.totalHits / 30) * 100)
  },
  RUN_KING: {
    id: 'run_king',
    name: '득점왕',
    icon: '👑🏃',
    tier: BADGE_TIERS.MASTER,
    description: '득점 30점 달성!',
    condition: (stats) => stats.totalRuns >= 30,
    progress: (stats) => Math.min(100, (stats.totalRuns / 30) * 100)
  },
  DEFENSE_KING: {
    id: 'defense_king',
    name: '철벽수비',
    icon: '👑🛡️',
    tier: BADGE_TIERS.MASTER,
    description: '수비 30회 성공!',
    condition: (stats) => stats.totalGoodDefense >= 30,
    progress: (stats) => Math.min(100, (stats.totalGoodDefense / 30) * 100)
  },
  COOKIE_RICH: {
    id: 'cookie_rich',
    name: '쿠키 부자',
    icon: '👑🍪',
    tier: BADGE_TIERS.MASTER,
    description: '쿠키 30개 수집!',
    condition: (stats) => stats.totalBonusCookie >= 30,
    progress: (stats) => Math.min(100, (stats.totalBonusCookie / 30) * 100)
  },

  // ===== 특별 배지 (5단계 - 성취) =====
  MVP_DEBUT: {
    id: 'mvp_debut',
    name: 'MVP 데뷔',
    icon: '🌟',
    tier: BADGE_TIERS.SPECIAL,
    description: '첫 MVP 달성!',
    condition: (stats) => stats.mvpCount >= 1
  },
  MVP_HAT_TRICK: {
    id: 'mvp_hat_trick',
    name: 'MVP 부자',
    icon: '🏆',
    tier: BADGE_TIERS.SPECIAL,
    description: 'MVP 3회 달성!',
    condition: (stats) => stats.mvpCount >= 3,
    progress: (stats) => Math.min(100, (stats.mvpCount / 3) * 100)
  },
  MVP_KING: {
    id: 'mvp_king',
    name: 'MVP 킹',
    icon: '👑🏆',
    tier: BADGE_TIERS.SPECIAL,
    description: 'MVP 5회 달성!',
    condition: (stats) => stats.mvpCount >= 5,
    progress: (stats) => Math.min(100, (stats.mvpCount / 5) * 100)
  },
  SUPERSTAR: {
    id: 'superstar',
    name: '슈퍼스타',
    icon: '🌟✨',
    tier: BADGE_TIERS.SPECIAL,
    description: 'MVP 10회 달성!',
    condition: (stats) => stats.mvpCount >= 10,
    progress: (stats) => Math.min(100, (stats.mvpCount / 10) * 100)
  },
  PERFECT_GAME: {
    id: 'perfect_game',
    name: '완벽한 경기',
    icon: '⚡💯',
    tier: BADGE_TIERS.SPECIAL,
    description: '한 경기에서 안타, 득점, 수비 모두 기록!',
    condition: (stats) => stats.hasPerfectGame === true
  },
  ALL_ROUNDER: {
    id: 'all_rounder',
    name: '올라운더',
    icon: '🌈',
    tier: BADGE_TIERS.SPECIAL,
    description: '모든 기록 5 이상!',
    condition: (stats) =>
      stats.totalHits >= 5 &&
      stats.totalRuns >= 5 &&
      stats.totalGoodDefense >= 5 &&
      stats.totalBonusCookie >= 5
  },
  SUPER_ROUNDER: {
    id: 'super_rounder',
    name: '슈퍼 올라운더',
    icon: '⭐🌈',
    tier: BADGE_TIERS.SPECIAL,
    description: '모든 기록 10 이상!',
    condition: (stats) =>
      stats.totalHits >= 10 &&
      stats.totalRuns >= 10 &&
      stats.totalGoodDefense >= 10 &&
      stats.totalBonusCookie >= 10
  },
  ULTRA_ROUNDER: {
    id: 'ultra_rounder',
    name: '울트라 올라운더',
    icon: '💎🌈',
    tier: BADGE_TIERS.SPECIAL,
    description: '모든 기록 30 이상!',
    condition: (stats) =>
      stats.totalHits >= 30 &&
      stats.totalRuns >= 30 &&
      stats.totalGoodDefense >= 30 &&
      stats.totalBonusCookie >= 30
  },
  PERFECT: {
    id: 'perfect',
    name: '완전체',
    icon: '💎',
    tier: BADGE_TIERS.SPECIAL,
    description: '총합 100점 달성!',
    condition: (stats) => stats.totalPoints >= 100,
    progress: (stats) => Math.min(100, (stats.totalPoints / 100) * 100)
  },
  HALL_OF_FAME: {
    id: 'hall_of_fame',
    name: '명예의 전당',
    icon: '🏛️',
    tier: BADGE_TIERS.SPECIAL,
    description: '총합 200점 달성!',
    condition: (stats) => stats.totalPoints >= 200,
    progress: (stats) => Math.min(100, (stats.totalPoints / 200) * 100)
  },

  // ===== 레전드 배지 (4단계 - 최고 등급) =====
  IMMORTAL: {
    id: 'immortal',
    name: '불멸의 선수',
    icon: '💎',
    tier: BADGE_TIERS.LEGEND,
    description: '30경기 출전!',
    condition: (stats) => stats.gamesPlayed >= 30,
    progress: (stats) => Math.min(100, (stats.gamesPlayed / 30) * 100)
  },
  LEGEND_HITTER: {
    id: 'legend_hitter',
    name: '레전드 타자',
    icon: '🔥⚡',
    tier: BADGE_TIERS.LEGEND,
    description: '안타 50개 달성!',
    condition: (stats) => stats.totalHits >= 50,
    progress: (stats) => Math.min(100, (stats.totalHits / 50) * 100)
  },
  LEGEND_RUNNER: {
    id: 'legend_runner',
    name: '레전드 러너',
    icon: '🔥🏃‍♂️',
    tier: BADGE_TIERS.LEGEND,
    description: '득점 50점 달성!',
    condition: (stats) => stats.totalRuns >= 50,
    progress: (stats) => Math.min(100, (stats.totalRuns / 50) * 100)
  },
  LEGEND_DEFENDER: {
    id: 'legend_defender',
    name: '레전드 수비수',
    icon: '🔥🛡️',
    tier: BADGE_TIERS.LEGEND,
    description: '수비 50회 성공!',
    condition: (stats) => stats.totalGoodDefense >= 50,
    progress: (stats) => Math.min(100, (stats.totalGoodDefense / 50) * 100)
  },
  LEGEND_COOKIE: {
    id: 'legend_cookie',
    name: '레전드 쿠키',
    icon: '🔥🍪',
    tier: BADGE_TIERS.LEGEND,
    description: '쿠키 50개 수집!',
    condition: (stats) => stats.totalBonusCookie >= 50,
    progress: (stats) => Math.min(100, (stats.totalBonusCookie / 50) * 100)
  }
};

/**
 * 새로 획득한 배지 체크
 * @param {Object} playerStats - 선수의 누적 통계
 * @param {Array} currentBadges - 현재 보유한 배지 ID 배열
 * @returns {Array} 새로 획득한 배지 배열
 */
export function checkNewBadges(playerStats, currentBadges = []) {
  const newBadges = [];

  Object.values(BADGES).forEach(badge => {
    // 이미 가지고 있지 않고, 조건을 만족하는 배지
    if (!currentBadges.includes(badge.id) && badge.condition(playerStats)) {
      newBadges.push(badge);
    }
  });

  return newBadges;
}

/**
 * 배지 진행도 계산
 * @param {Object} playerStats - 선수의 누적 통계
 * @param {string} badgeId - 배지 ID
 * @returns {number} 진행도 (0-100)
 */
export function getBadgeProgress(playerStats, badgeId) {
  const badge = Object.values(BADGES).find(b => b.id === badgeId);
  if (!badge || !badge.progress) return 0;

  return badge.progress(playerStats);
}

/**
 * 획득 가능한 다음 배지 추천 (진행도 높은 순)
 * @param {Object} playerStats - 선수의 누적 통계
 * @param {Array} currentBadges - 현재 보유한 배지 ID 배열
 * @returns {Array} 추천 배지 배열 (최대 3개)
 */
export function getRecommendedBadges(playerStats, currentBadges = []) {
  const notOwnedBadges = Object.values(BADGES).filter(
    badge => !currentBadges.includes(badge.id) && badge.progress
  );

  return notOwnedBadges
    .map(badge => ({
      ...badge,
      progress: badge.progress(playerStats)
    }))
    .sort((a, b) => b.progress - a.progress)
    .slice(0, 3);
}

/**
 * 등급별 배지 개수 카운트
 * @param {Array} badges - 보유한 배지 ID 배열
 * @returns {Object} { beginner: 0, skilled: 0, master: 0, special: 0, legend: 0 }
 */
export function countBadgesByTier(badges = []) {
  const counts = {
    beginner: 0,
    skilled: 0,
    master: 0,
    special: 0,
    legend: 0
  };

  badges.forEach(badgeId => {
    const badge = Object.values(BADGES).find(b => b.id === badgeId);
    if (!badge) return;

    switch(badge.tier) {
      case BADGE_TIERS.BEGINNER:
        counts.beginner++;
        break;
      case BADGE_TIERS.SKILLED:
        counts.skilled++;
        break;
      case BADGE_TIERS.MASTER:
        counts.master++;
        break;
      case BADGE_TIERS.SPECIAL:
        counts.special++;
        break;
      case BADGE_TIERS.LEGEND:
        counts.legend++;
        break;
    }
  });

  return counts;
}

/**
 * 선수의 누적 통계 계산
 * @param {Array} playerHistory - 선수의 경기별 히스토리
 * @param {number} mvpCount - MVP 획득 횟수
 * @returns {Object} 누적 통계
 */
export function calculatePlayerTotalStats(playerHistory = [], mvpCount = 0) {
  const totals = {
    totalHits: 0,
    totalRuns: 0,
    totalGoodDefense: 0,
    totalBonusCookie: 0,
    totalPoints: 0,
    gamesPlayed: playerHistory.length,
    mvpCount: mvpCount,
    mvpStreak: 0 // TODO: MVP 연속 기록 계산 로직 필요
  };

  playerHistory.forEach(game => {
    // stats 객체가 있으면 그 안에서, 없으면 최상위에서 찾기
    const stats = game.stats || game;
    totals.totalHits += stats.hits || 0;
    totals.totalRuns += stats.runs || 0;
    totals.totalGoodDefense += stats.goodDefense || 0;
    totals.totalBonusCookie += stats.bonusCookie || 0;
    totals.totalPoints += stats.points || 0;
  });

  return totals;
}
