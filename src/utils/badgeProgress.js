import { BADGES } from './badgeSystem';
import { BADGE_CATEGORIES } from './badgeCategories';

/**
 * 배지의 카테고리 찾기
 */
const getBadgeCategory = (badgeId) => {
  for (const category of Object.values(BADGE_CATEGORIES)) {
    if (category.badgeIds.includes(badgeId)) {
      return category.id;
    }
  }
  return null;
};

/**
 * 선수의 다음 획득 가능한 배지들의 진행도를 계산
 * @param {Object} stats - 선수의 누적 통계
 * @param {Array} currentBadges - 현재 보유한 배지 ID 배열
 * @param {Object} allBadges - 모든 배지 객체 (기본 + 커스텀)
 * @param {Boolean} onlyNextInCategory - true면 각 카테고리별로 바로 다음 배지만 표시
 * @returns {Array} 진행 중인 배지 목록 [{badge, progress, current, target, category}]
 */
export const getNextBadgesProgress = (stats, currentBadges = [], allBadges = BADGES, onlyNextInCategory = false) => {
  const progressList = [];

  Object.values(allBadges).forEach(badge => {
    // 이미 획득한 배지는 제외
    if (currentBadges.includes(badge.id)) {
      return;
    }

    // 조건 함수가 없으면 제외
    if (typeof badge.condition !== 'function') {
      return;
    }

    // 이미 조건을 만족하면 제외 (곧 획득될 배지)
    if (badge.condition(stats)) {
      return;
    }

    const category = getBadgeCategory(badge.id);

    // progress 함수가 있는 배지만
    if (typeof badge.progress === 'function') {
      const progressPercent = badge.progress(stats);

      // 진행도가 0보다 크면 목록에 추가
      if (progressPercent > 0) {
        // 목표치 계산 (progress 함수에서 역산)
        const target = calculateTarget(badge, stats);
        const current = calculateCurrent(badge, stats);

        progressList.push({
          badge,
          progress: progressPercent,
          current,
          target,
          category
        });
      }
    } else {
      // ✨ progress 함수가 없는 입문 배지 - 진행도 0%로 표시
      const target = calculateTarget(badge, stats);
      const current = calculateCurrent(badge, stats);

      progressList.push({
        badge,
        progress: 0,
        current,
        target,
        category
      });
    }
  });

  // onlyNextInCategory가 true면 각 카테고리별로 가장 진행도가 높은 배지만 남김
  if (onlyNextInCategory) {
    const categoryMap = new Map();

    progressList.forEach(item => {
      if (!item.category) return; // 카테고리가 없는 배지는 제외

      const existing = categoryMap.get(item.category);
      if (!existing || item.progress > existing.progress) {
        categoryMap.set(item.category, item);
      }
    });

    return Array.from(categoryMap.values()).sort((a, b) => b.progress - a.progress);
  }

  // 진행도 높은 순으로 정렬
  return progressList.sort((a, b) => b.progress - a.progress);
};

/**
 * 배지의 목표치 계산
 */
const calculateTarget = (badge, stats) => {
  // 입문 배지 (first_로 시작)
  if (badge.id.startsWith('first_')) return 1;

  // 배지 ID로 목표치 추정
  if (badge.id === 'steady') return 5;
  if (badge.id === 'iron_man') return 10;
  if (badge.id === 'immortal') return 30;

  if (badge.id === 'hit_maker') return 10;
  if (badge.id === 'hit_king') return 30;
  if (badge.id === 'legend_hitter') return 50;

  if (badge.id === 'running_machine') return 10;
  if (badge.id === 'run_king') return 30;
  if (badge.id === 'legend_runner') return 50;

  if (badge.id === 'defense_master') return 10;
  if (badge.id === 'defense_king') return 30;
  if (badge.id === 'legend_defender') return 50;

  if (badge.id === 'cookie_collector') return 10;
  if (badge.id === 'cookie_rich') return 30;
  if (badge.id === 'legend_cookie') return 50;

  // MVP 배지
  if (badge.id === 'mvp_debut') return 1;
  if (badge.id === 'mvp_hat_trick') return 3;
  if (badge.id === 'mvp_king') return 5;
  if (badge.id === 'superstar') return 10;

  // 올라운더
  if (badge.id === 'all_rounder') return 5;
  if (badge.id === 'super_rounder') return 10;
  if (badge.id === 'ultra_rounder') return 30;

  // 완전체
  if (badge.id === 'perfect') return 100;
  if (badge.id === 'hall_of_fame') return 200;

  return 10; // 기본값
};

/**
 * 배지의 현재 진행 상황 계산
 */
const calculateCurrent = (badge, stats) => {
  if (badge.id.includes('hit')) return stats.totalHits || 0;
  if (badge.id.includes('run')) return stats.totalRuns || 0;
  if (badge.id.includes('defense')) return stats.totalGoodDefense || 0;
  if (badge.id.includes('cookie')) return stats.totalBonusCookie || 0;
  if (badge.id.includes('steady') || badge.id.includes('veteran') || badge.id.includes('iron') || badge.id.includes('immortal')) {
    return stats.gamesPlayed || 0;
  }
  if (badge.id.includes('mvp')) return stats.mvpCount || 0;
  if (badge.id.includes('all_rounder')) return stats.totalPoints || 0;
  
  return 0;
};

/**
 * 특정 배지의 진행도만 계산
 */
export const getBadgeProgress = (badge, stats) => {
  if (typeof badge.progress !== 'function') {
    return null;
  }

  const progressPercent = badge.progress(stats);
  const current = calculateCurrent(badge, stats);
  const target = calculateTarget(badge, stats);

  return {
    badge,
    progress: progressPercent,
    current,
    target
  };
};
