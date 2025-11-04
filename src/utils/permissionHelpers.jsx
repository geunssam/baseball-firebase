import { auth } from '../config/firebase';

/**
 * permissionHelpers.js
 *
 * 공유된 학급/팀에 대한 권한 검사 및 UI 표시 관련 유틸리티 함수
 */

/**
 * 권한 레벨 상수
 */
export const PERMISSION_LEVELS = {
  OWNER: 'owner',
  EDITOR: 'editor',
  VIEWER: 'viewer'
};

/**
 * 권한 레벨 순위 (높은 숫자 = 더 많은 권한)
 */
const PERMISSION_RANK = {
  [PERMISSION_LEVELS.OWNER]: 3,
  [PERMISSION_LEVELS.EDITOR]: 2,
  [PERMISSION_LEVELS.VIEWER]: 1
};

/**
 * 항목이 현재 사용자의 소유인지 확인
 * @param {string} ownerId - 항목의 소유자 ID
 * @returns {boolean}
 */
export function isOwnedByCurrentUser(ownerId) {
  return auth.currentUser?.uid === ownerId;
}

/**
 * 항목이 공유된 것인지 확인 (sharedWithMe에서 온 것인지)
 * @param {Object} item - 학급 또는 팀 객체
 * @returns {boolean}
 */
export function isSharedItem(item) {
  return item?.isShared === true || item?.shareId != null;
}

/**
 * 사용자가 특정 항목에 대해 필요한 권한을 가지고 있는지 확인
 * @param {Object} item - 학급 또는 팀 객체
 * @param {string} requiredPermission - 필요한 권한 레벨 ('viewer', 'editor', 'owner')
 * @returns {boolean}
 */
export function hasPermission(item, requiredPermission) {
  // 소유자는 모든 권한 보유
  if (isOwnedByCurrentUser(item.ownerId || item.createdBy)) {
    return true;
  }

  // 공유된 항목이 아니면 권한 없음
  if (!isSharedItem(item)) {
    return false;
  }

  // 권한 비교
  const userPermission = item.permission || PERMISSION_LEVELS.VIEWER;
  const userRank = PERMISSION_RANK[userPermission] || 0;
  const requiredRank = PERMISSION_RANK[requiredPermission] || 0;

  return userRank >= requiredRank;
}

/**
 * 조회 권한 확인
 * @param {Object} item
 * @returns {boolean}
 */
export function canView(item) {
  return hasPermission(item, PERMISSION_LEVELS.VIEWER);
}

/**
 * 경기 진행 권한 확인
 * @param {Object} item
 * @returns {boolean}
 */
export function canEdit(item) {
  return hasPermission(item, PERMISSION_LEVELS.EDITOR);
}

/**
 * 전체 관리 권한 확인 (학급/팀 구성 변경)
 * @param {Object} item
 * @returns {boolean}
 */
export function canManage(item) {
  return hasPermission(item, PERMISSION_LEVELS.OWNER);
}

/**
 * 권한 레벨에 대한 UI 표시 정보 반환
 * @param {string} permission - 권한 레벨
 * @returns {Object} { label, color, icon }
 */
export function getPermissionBadgeInfo(permission) {
  const badges = {
    [PERMISSION_LEVELS.VIEWER]: {
      label: '조회 전용',
      color: 'bg-gray-100 text-gray-700 border-gray-300',
      icon: '👁️'
    },
    [PERMISSION_LEVELS.EDITOR]: {
      label: '경기 진행',
      color: 'bg-blue-100 text-blue-700 border-blue-300',
      icon: '✏️'
    },
    [PERMISSION_LEVELS.OWNER]: {
      label: '전체 관리',
      color: 'bg-purple-100 text-purple-700 border-purple-300',
      icon: '👑'
    }
  };

  return badges[permission] || badges[PERMISSION_LEVELS.VIEWER];
}

/**
 * 권한 레벨 배지 컴포넌트 생성 (JSX 반환)
 * @param {string} permission - 권한 레벨
 * @param {string} className - 추가 CSS 클래스
 * @returns {JSX.Element}
 */
export function PermissionBadge({ permission, className = '' }) {
  const badge = getPermissionBadgeInfo(permission);

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badge.color} ${className}`}>
      {badge.icon} {badge.label}
    </span>
  );
}

/**
 * 항목의 소유자 정보 표시 문자열 생성
 * @param {Object} item - 학급 또는 팀 객체
 * @returns {string}
 */
export function getOwnerDisplayText(item) {
  if (isOwnedByCurrentUser(item.ownerId || item.createdBy)) {
    return '내 학급/팀';
  }

  if (isSharedItem(item)) {
    return `${item.ownerName || '다른 교사'}의 학급/팀`;
  }

  return '알 수 없음';
}

/**
 * 권한에 따른 작업 가능 여부 메시지 생성
 * @param {Object} item
 * @param {string} action - 'view', 'edit', 'manage'
 * @returns {Object} { allowed: boolean, message: string }
 */
export function checkActionPermission(item, action) {
  const actionChecks = {
    view: { check: canView, message: '조회 권한이 없습니다.' },
    edit: { check: canEdit, message: '경기 진행 권한이 없습니다.' },
    manage: { check: canManage, message: '관리 권한이 없습니다.' }
  };

  const actionCheck = actionChecks[action];
  if (!actionCheck) {
    return { allowed: false, message: '알 수 없는 작업입니다.' };
  }

  const allowed = actionCheck.check(item);
  return {
    allowed,
    message: allowed ? '' : actionCheck.message
  };
}

/**
 * 공유된 항목들을 소유자별로 그룹화
 * @param {Array} items - 학급/팀 배열
 * @returns {Object} { owned: Array, shared: Object<ownerId, Array> }
 */
export function groupItemsByOwner(items) {
  const result = {
    owned: [],
    shared: {}
  };

  items.forEach(item => {
    if (isOwnedByCurrentUser(item.ownerId || item.createdBy)) {
      result.owned.push(item);
    } else if (isSharedItem(item)) {
      const ownerId = item.ownerId;
      if (!result.shared[ownerId]) {
        result.shared[ownerId] = [];
      }
      result.shared[ownerId].push(item);
    }
  });

  return result;
}

/**
 * 항목이 읽기 전용인지 확인 (viewer 권한 또는 공유된 항목)
 * @param {Object} item
 * @returns {boolean}
 */
export function isReadOnly(item) {
  if (isOwnedByCurrentUser(item.ownerId || item.createdBy)) {
    return false;
  }

  return !canEdit(item);
}

/**
 * 권한 제한 메시지를 가진 경고 객체 생성
 * @param {string} action - 수행하려는 작업
 * @returns {Object}
 */
export function createPermissionAlert(action = '이 작업') {
  return {
    title: '권한 없음',
    message: `${action}을 수행할 권한이 없습니다. 소유자에게 권한 요청이 필요합니다.`
  };
}
