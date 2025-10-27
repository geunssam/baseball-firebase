import { BADGES } from './badgeSystem';

/**
 * localStorage에서 커스텀 배지 불러오기
 */
export const loadCustomBadges = () => {
  try {
    const saved = localStorage.getItem('customBadges');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Failed to load custom badges:', error);
    return [];
  }
};

/**
 * localStorage에서 숨긴 배지 불러오기
 */
export const loadHiddenBadges = () => {
  try {
    const saved = localStorage.getItem('hiddenBadges');
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    console.error('Failed to load hidden badges:', error);
    return [];
  }
};

/**
 * 커스텀 배지를 localStorage에 저장
 */
export const saveCustomBadges = (badges) => {
  try {
    localStorage.setItem('customBadges', JSON.stringify(badges));
  } catch (error) {
    console.error('Failed to save custom badges:', error);
  }
};

/**
 * 숨긴 배지를 localStorage에 저장
 */
export const saveHiddenBadges = (badges) => {
  try {
    localStorage.setItem('hiddenBadges', JSON.stringify(badges));
  } catch (error) {
    console.error('Failed to save hidden badges:', error);
  }
};

/**
 * localStorage에서 기본 배지 오버라이드 불러오기
 */
export const loadBadgeOverrides = () => {
  try {
    const saved = localStorage.getItem('badgeOverrides');
    return saved ? JSON.parse(saved) : {};
  } catch (error) {
    console.error('Failed to load badge overrides:', error);
    return {};
  }
};

/**
 * 기본 배지 오버라이드를 localStorage에 저장
 */
export const saveBadgeOverrides = (overrides) => {
  try {
    localStorage.setItem('badgeOverrides', JSON.stringify(overrides));
  } catch (error) {
    console.error('Failed to save badge overrides:', error);
  }
};

/**
 * 모든 배지 가져오기 (기본 + 커스텀 - 숨김)
 * @param {Array} customBadges - 커스텀 배지 배열
 * @param {Array} hiddenBadges - 숨긴 배지 ID 배열
 * @param {Object} badgeOverrides - 기본 배지 오버라이드 { badgeId: { icon, name }, ... }
 * @returns {Object} 배지 객체 { badgeId: badge, ... }
 */
export const getAllBadges = (customBadges = [], hiddenBadges = [], badgeOverrides = {}) => {
  const allBadges = {};

  // 기본 배지 중 숨기지 않은 것만 추가 (오버라이드 적용)
  Object.entries(BADGES).forEach(([key, badge]) => {
    if (!hiddenBadges.includes(key) && !hiddenBadges.includes(badge.id)) {
      // 오버라이드가 있으면 아이콘과 이름을 덮어씀
      const override = badgeOverrides[badge.id];
      allBadges[badge.id] = override
        ? { ...badge, icon: override.icon, name: override.name }
        : badge;
    }
  });

  // 커스텀 배지 추가
  customBadges.forEach(badge => {
    allBadges[badge.id] = badge;
  });

  return allBadges;
};

/**
 * localStorage에서 모든 배지 데이터 로드
 * @returns {Object} { customBadges, hiddenBadges, badgeOverrides, allBadges }
 */
export const loadAllBadgeData = () => {
  const customBadges = loadCustomBadges();
  const hiddenBadges = loadHiddenBadges();
  const badgeOverrides = loadBadgeOverrides();
  const allBadges = getAllBadges(customBadges, hiddenBadges, badgeOverrides);

  return {
    customBadges,
    hiddenBadges,
    badgeOverrides,
    allBadges
  };
};
