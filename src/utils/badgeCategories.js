/**
 * 배지를 카테고리별로 그룹화하는 유틸리티
 */

// 배지 카테고리 정의
export const BADGE_CATEGORIES = {
  GAMES: {
    id: 'games',
    name: '경기 참여',
    icon: '📊',
    description: '경기 출전 관련 배지',
    badgeIds: ['first_game', 'steady', 'iron_man', 'immortal']
  },
  HITS: {
    id: 'hits',
    name: '안타',
    icon: '⚾',
    description: '안타 관련 배지',
    badgeIds: ['first_hit', 'hit_maker', 'hit_king', 'legend_hitter']
  },
  RUNS: {
    id: 'runs',
    name: '득점',
    icon: '🏃',
    description: '득점 관련 배지',
    badgeIds: ['first_run', 'running_machine', 'run_king', 'legend_runner']
  },
  DEFENSE: {
    id: 'defense',
    name: '수비',
    icon: '🛡️',
    description: '수비 관련 배지',
    badgeIds: ['first_defense', 'defense_master', 'defense_king', 'legend_defender']
  },
  COOKIES: {
    id: 'cookies',
    name: '쿠키',
    icon: '🍪',
    description: '보너스 쿠키 관련 배지',
    badgeIds: ['first_cookie', 'cookie_collector', 'cookie_rich', 'legend_cookie']
  },
  SPECIAL: {
    id: 'special',
    name: '특별',
    icon: '🏆',
    description: '특별한 업적 배지',
    badgeIds: ['mvp_debut', 'mvp_hat_trick', 'mvp_king', 'superstar', 'perfect_game', 'all_rounder', 'super_rounder', 'ultra_rounder', 'perfect', 'hall_of_fame']
  }
};

/**
 * 배지를 카테고리별로 그룹화
 * @param {Array} badgeIds - 배지 ID 배열
 * @param {Object} allBadges - 모든 배지 객체
 * @returns {Object} 카테고리별로 그룹화된 배지
 */
export const groupBadgesByCategory = (badgeIds, allBadges) => {
  const grouped = {};

  Object.values(BADGE_CATEGORIES).forEach(category => {
    grouped[category.id] = {
      ...category,
      badges: []
    };
  });

  badgeIds.forEach(badgeId => {
    const badge = allBadges[badgeId];
    if (!badge) return;

    // 배지가 속한 카테고리 찾기
    let foundCategory = null;
    for (const category of Object.values(BADGE_CATEGORIES)) {
      if (category.badgeIds.includes(badgeId)) {
        foundCategory = category.id;
        break;
      }
    }

    // 카테고리에 배지 추가
    if (foundCategory && grouped[foundCategory]) {
      grouped[foundCategory].badges.push(badge);
    } else {
      // 카테고리를 찾지 못한 경우 special에 추가
      if (!grouped.special) {
        grouped.special = {
          ...BADGE_CATEGORIES.SPECIAL,
          badges: []
        };
      }
      grouped.special.badges.push(badge);
    }
  });

  // 빈 카테고리 제거
  Object.keys(grouped).forEach(key => {
    if (grouped[key].badges.length === 0) {
      delete grouped[key];
    }
  });

  return grouped;
};

/**
 * 배지의 다음 단계 배지 찾기
 * @param {Object} badge - 현재 배지
 * @param {Object} allBadges - 모든 배지 객체
 * @param {Array} ownedBadgeIds - 보유한 배지 ID 배열
 * @returns {Object|null} 다음 단계 배지 또는 null
 */
export const getNextBadgeInCategory = (badge, allBadges, ownedBadgeIds = []) => {
  // 현재 배지가 속한 카테고리 찾기
  let category = null;
  for (const cat of Object.values(BADGE_CATEGORIES)) {
    if (cat.badgeIds.includes(badge.id)) {
      category = cat;
      break;
    }
  }

  if (!category) return null;

  // 현재 배지의 인덱스 찾기
  const currentIndex = category.badgeIds.indexOf(badge.id);
  if (currentIndex === -1 || currentIndex === category.badgeIds.length - 1) {
    return null; // 마지막 배지거나 찾을 수 없음
  }

  // 다음 배지들 중 아직 획득하지 않은 첫 번째 배지 찾기
  for (let i = currentIndex + 1; i < category.badgeIds.length; i++) {
    const nextBadgeId = category.badgeIds[i];
    if (!ownedBadgeIds.includes(nextBadgeId)) {
      return allBadges[nextBadgeId] || null;
    }
  }

  return null;
};

/**
 * 배지 ID의 카테고리를 찾기
 * @param {string} badgeId - 배지 ID
 * @returns {string|null} 카테고리 ID ('hits', 'runs', 'defense', 'cookies', 'games', 'special')
 */
export const getBadgeCategory = (badgeId) => {
  for (const category of Object.values(BADGE_CATEGORIES)) {
    if (category.badgeIds.includes(badgeId)) {
      return category.id;
    }
  }
  return 'special'; // 기본값은 특별
};
