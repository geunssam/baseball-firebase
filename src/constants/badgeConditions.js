/**
 * 배지 자동 수여 조건 타입 정의
 */

export const CONDITION_TYPES = {
  MANUAL: 'manual',           // 수동 부여
  AUTO_APPEARANCES: 'auto_appearances',    // 출전 횟수
  AUTO_BATTING_AVG: 'auto_batting_avg',   // 타율
  AUTO_HOME_RUNS: 'auto_home_runs',       // 홈런
  AUTO_STOLEN_BASES: 'auto_stolen_bases',  // 도루
  AUTO_RUNS: 'auto_runs',                 // 득점
  AUTO_RBIS: 'auto_rbis',                 // 타점
  AUTO_HITS: 'auto_hits',                 // 안타
};

export const CONDITION_LABELS = {
  [CONDITION_TYPES.MANUAL]: '수동 부여',
  [CONDITION_TYPES.AUTO_APPEARANCES]: '출전 횟수',
  [CONDITION_TYPES.AUTO_BATTING_AVG]: '타율',
  [CONDITION_TYPES.AUTO_HOME_RUNS]: '홈런',
  [CONDITION_TYPES.AUTO_STOLEN_BASES]: '도루',
  [CONDITION_TYPES.AUTO_RUNS]: '득점',
  [CONDITION_TYPES.AUTO_RBIS]: '타점',
  [CONDITION_TYPES.AUTO_HITS]: '안타',
};

export const CONDITION_DESCRIPTIONS = {
  [CONDITION_TYPES.MANUAL]: '교사가 직접 배지를 부여합니다',
  [CONDITION_TYPES.AUTO_APPEARANCES]: '특정 횟수 이상 경기에 출전한 학생에게 자동으로 배지를 부여합니다',
  [CONDITION_TYPES.AUTO_BATTING_AVG]: '특정 타율 이상을 기록한 학생에게 자동으로 배지를 부여합니다',
  [CONDITION_TYPES.AUTO_HOME_RUNS]: '특정 개수 이상의 홈런을 친 학생에게 자동으로 배지를 부여합니다',
  [CONDITION_TYPES.AUTO_STOLEN_BASES]: '특정 개수 이상의 도루를 성공한 학생에게 자동으로 배지를 부여합니다',
  [CONDITION_TYPES.AUTO_RUNS]: '특정 개수 이상의 득점을 기록한 학생에게 자동으로 배지를 부여합니다',
  [CONDITION_TYPES.AUTO_RBIS]: '특정 개수 이상의 타점을 기록한 학생에게 자동으로 배지를 부여합니다',
  [CONDITION_TYPES.AUTO_HITS]: '특정 개수 이상의 안타를 친 학생에게 자동으로 배지를 부여합니다',
};

// 조건 타입별 입력 필드 정의
export const CONDITION_INPUT_CONFIG = {
  [CONDITION_TYPES.MANUAL]: null, // 수동은 입력 필드 없음

  [CONDITION_TYPES.AUTO_APPEARANCES]: {
    field: 'minAppearances',
    label: '최소 출전 횟수',
    type: 'number',
    min: 1,
    max: 100,
    placeholder: '예: 10',
    suffix: '경기',
  },

  [CONDITION_TYPES.AUTO_BATTING_AVG]: {
    field: 'minBattingAvg',
    label: '최소 타율',
    type: 'number',
    min: 0,
    max: 1,
    step: 0.001,
    placeholder: '예: 0.300',
    suffix: '',
  },

  [CONDITION_TYPES.AUTO_HOME_RUNS]: {
    field: 'minHomeRuns',
    label: '최소 홈런 개수',
    type: 'number',
    min: 1,
    max: 100,
    placeholder: '예: 5',
    suffix: '개',
  },

  [CONDITION_TYPES.AUTO_STOLEN_BASES]: {
    field: 'minStolenBases',
    label: '최소 도루 개수',
    type: 'number',
    min: 1,
    max: 100,
    placeholder: '예: 10',
    suffix: '개',
  },

  [CONDITION_TYPES.AUTO_RUNS]: {
    field: 'minRuns',
    label: '최소 득점',
    type: 'number',
    min: 1,
    max: 100,
    placeholder: '예: 15',
    suffix: '점',
  },

  [CONDITION_TYPES.AUTO_RBIS]: {
    field: 'minRbis',
    label: '최소 타점',
    type: 'number',
    min: 1,
    max: 100,
    placeholder: '예: 10',
    suffix: '점',
  },

  [CONDITION_TYPES.AUTO_HITS]: {
    field: 'minHits',
    label: '최소 안타 개수',
    type: 'number',
    min: 1,
    max: 100,
    placeholder: '예: 20',
    suffix: '개',
  },
};

/**
 * 조건 데이터 검증 함수
 */
export function validateConditionData(conditionType, conditionData) {
  if (conditionType === CONDITION_TYPES.MANUAL) {
    return { valid: true };
  }

  const config = CONDITION_INPUT_CONFIG[conditionType];
  if (!config) {
    return { valid: false, error: '알 수 없는 조건 타입입니다.' };
  }

  const value = conditionData[config.field];

  if (value === undefined || value === null || value === '') {
    return { valid: false, error: `${config.label}을(를) 입력하세요.` };
  }

  const numValue = Number(value);

  if (isNaN(numValue)) {
    return { valid: false, error: '숫자를 입력하세요.' };
  }

  if (config.min !== undefined && numValue < config.min) {
    return { valid: false, error: `최소값은 ${config.min}입니다.` };
  }

  if (config.max !== undefined && numValue > config.max) {
    return { valid: false, error: `최대값은 ${config.max}입니다.` };
  }

  return { valid: true };
}

/**
 * 기본 조건 데이터 생성
 */
export function getDefaultConditionData(conditionType) {
  if (conditionType === CONDITION_TYPES.MANUAL) {
    return null;
  }

  const config = CONDITION_INPUT_CONFIG[conditionType];
  if (!config) return null;

  return {
    [config.field]: config.min || 0
  };
}
