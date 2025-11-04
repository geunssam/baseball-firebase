# ⚙️ Phase 2: 기본 배지 전체 수정 시스템 구현 가이드

## 🎯 목표
기본 배지의 자동 수여 조건, 이모지, 이름, 설명을 모두 교사가 커스텀할 수 있는 시스템 구현

---

## 📋 구현 체크리스트

### 1단계: BadgeSettingsModal 컴포넌트 생성
- [ ] `BadgeSettingsModal.jsx` 파일 생성
- [ ] 3개 탭 UI 구현 (기본 정보, 자동 조건, 진행도 설정)
- [ ] 조건 편집 폼 구현

### 2단계: BadgeCollection.jsx 수정
- [ ] 각 배지 카드에 ⚙️ 버튼 추가
- [ ] 버튼 클릭 시 모달 오픈
- [ ] 선택된 배지 정보 전달

### 3단계: badgeSystem.js 수정
- [ ] `calculateBadges()` 함수 수정
- [ ] 오버라이드 조건 우선 처리 로직 추가
- [ ] 커스텀 조건 평가 함수 추가

### 4단계: 테스트
- [ ] 기본 배지 설정 수정 테스트
- [ ] 자동 조건 변경 테스트
- [ ] 복합 조건 테스트
- [ ] 진행도 설정 테스트

---

## 📂 1. 새로 생성할 파일

### 1-1. BadgeSettingsModal.jsx

**파일 위치**: `src/components/BadgeSettingsModal.jsx`

**기능**:
- 배지 기본 정보 수정 (이모지, 이름, 설명, 등급)
- 자동 수여 조건 수정 (스탯 종류, 목표 수치, 복합 조건)
- 진행도 설정 (활성화 여부, 구간 설정)

**주요 코드**:
```jsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';

// 스탯 종류 옵션
const STAT_TYPE_OPTIONS = [
  { value: 'hits', label: '안타' },
  { value: 'single', label: '1루타' },
  { value: 'double', label: '2루타' },
  { value: 'triple', label: '3루타' },
  { value: 'homerun', label: '홈런' },
  { value: 'runs', label: '득점' },
  { value: 'goodDefense', label: '수비' },
  { value: 'bonusCookie', label: '보너스 쿠키' },
  { value: 'gameCount', label: '경기 수' }
];

// 비교 연산자
const OPERATOR_OPTIONS = [
  { value: '>=', label: '≥ (이상)' },
  { value: '>', label: '> (초과)' },
  { value: '==', label: '= (같음)' },
  { value: '<=', label: '≤ (이하)' },
  { value: '<', label: '< (미만)' }
];

export default function BadgeSettingsModal({
  open,
  onOpenChange,
  badge,
  override = {},
  onSave
}) {
  const [icon, setIcon] = useState(override.icon || badge.icon);
  const [name, setName] = useState(override.name || badge.name);
  const [description, setDescription] = useState(override.description || badge.description);
  const [tier, setTier] = useState(override.tier || badge.tier || 1);

  // 자동 조건 State
  const [conditionEnabled, setConditionEnabled] = useState(
    override.condition?.enabled !== false
  );
  const [conditionType, setConditionType] = useState(
    override.condition?.type || 'hits'
  );
  const [threshold, setThreshold] = useState(
    override.condition?.threshold || 1
  );
  const [operator, setOperator] = useState(
    override.condition?.operator || '>='
  );
  const [compositeConditions, setCompositeConditions] = useState(
    override.condition?.composite?.conditions || []
  );
  const [compositeLogic, setCompositeLogic] = useState(
    override.condition?.composite?.logic || 'AND'
  );

  // 진행도 State
  const [progressEnabled, setProgressEnabled] = useState(
    override.progress?.enabled !== false
  );

  const handleSave = () => {
    const updatedOverride = {
      icon,
      name,
      description,
      tier,
      condition: {
        enabled: conditionEnabled,
        type: conditionType,
        threshold: parseInt(threshold),
        operator,
        composite: compositeConditions.length > 0 ? {
          logic: compositeLogic,
          conditions: compositeConditions
        } : null
      },
      progress: {
        enabled: progressEnabled,
        steps: [threshold]
      }
    };

    onSave(badge.id, updatedOverride);
    onOpenChange(false);
  };

  const handleReset = () => {
    if (confirm('초기 설정으로 되돌리시겠습니까?')) {
      setIcon(badge.icon);
      setName(badge.name);
      setDescription(badge.description);
      setTier(badge.tier || 1);
      setConditionEnabled(true);
      // ... 나머지 초기화
    }
  };

  const addCompositeCondition = () => {
    setCompositeConditions([
      ...compositeConditions,
      {
        type: 'hits',
        threshold: 1,
        operator: '>='
      }
    ]);
  };

  const removeCompositeCondition = (index) => {
    setCompositeConditions(compositeConditions.filter((_, i) => i !== index));
  };

  const updateCompositeCondition = (index, field, value) => {
    setCompositeConditions(
      compositeConditions.map((cond, i) =>
        i === index ? { ...cond, [field]: value } : cond
      )
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>⚙️ 배지 설정: {badge.name}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="basic">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">기본 정보</TabsTrigger>
            <TabsTrigger value="condition">자동 조건</TabsTrigger>
            <TabsTrigger value="progress">진행도 설정</TabsTrigger>
          </TabsList>

          {/* ═══════════ 탭 1: 기본 정보 ═══════════ */}
          <TabsContent value="basic" className="space-y-4">
            {/* 이모지 */}
            <div>
              <Label htmlFor="badge-icon">이모지</Label>
              <div className="flex gap-2 items-center">
                <Input
                  id="badge-icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  maxLength={2}
                  className="w-24 text-2xl text-center"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    // 이모지 선택 모달 열기 (Phase 1의 BadgeCreator 재사용 가능)
                  }}
                >
                  변경
                </Button>
              </div>
            </div>

            {/* 배지 이름 */}
            <div>
              <Label htmlFor="badge-name">배지 이름</Label>
              <Input
                id="badge-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {name.length}/20자
              </p>
            </div>

            {/* 배지 설명 */}
            <div>
              <Label htmlFor="badge-desc">배지 설명</Label>
              <Textarea
                id="badge-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={100}
                rows={3}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {description.length}/100자
              </p>
            </div>

            {/* 배지 등급 */}
            <div>
              <Label>배지 등급</Label>
              <div className="grid grid-cols-5 gap-2 mt-2">
                {[
                  { value: 1, label: '입문', color: 'bg-gray-100' },
                  { value: 2, label: '숙련', color: 'bg-blue-100' },
                  { value: 3, label: '마스터', color: 'bg-purple-100' },
                  { value: 4, label: '레전드', color: 'bg-yellow-100' },
                  { value: 5, label: '특별', color: 'bg-red-100' }
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setTier(option.value)}
                    className={`p-3 rounded-lg font-semibold ${option.color} ${
                      tier === option.value ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 미리보기 */}
            <div>
              <Label>미리보기</Label>
              <Card className="p-4 w-32 mx-auto">
                <div className="text-4xl text-center mb-2">{icon}</div>
                <h3 className="text-sm font-semibold text-center">{name}</h3>
                <p className="text-xs text-muted-foreground text-center mt-1">
                  {description}
                </p>
              </Card>
            </div>
          </TabsContent>

          {/* ═══════════ 탭 2: 자동 조건 ═══════════ */}
          <TabsContent value="condition" className="space-y-4">
            {/* 자동 수여 활성화 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="condition-enabled"
                checked={conditionEnabled}
                onChange={(e) => setConditionEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="condition-enabled" className="cursor-pointer">
                자동 수여 활성화
              </Label>
            </div>

            {conditionEnabled && (
              <>
                {/* 단일 조건 */}
                <div className="p-4 border rounded-lg space-y-3">
                  <h3 className="font-semibold">기본 조건</h3>

                  <div className="grid grid-cols-3 gap-3">
                    {/* 스탯 종류 */}
                    <div>
                      <Label>스탯 종류</Label>
                      <select
                        value={conditionType}
                        onChange={(e) => setConditionType(e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        {STAT_TYPE_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 비교 연산자 */}
                    <div>
                      <Label>비교</Label>
                      <select
                        value={operator}
                        onChange={(e) => setOperator(e.target.value)}
                        className="w-full p-2 border rounded"
                      >
                        {OPERATOR_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* 목표 수치 */}
                    <div>
                      <Label>목표</Label>
                      <Input
                        type="number"
                        min="0"
                        value={threshold}
                        onChange={(e) => setThreshold(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {/* 복합 조건 */}
                <div className="p-4 border rounded-lg space-y-3">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">복합 조건 (선택)</h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={addCompositeCondition}
                    >
                      + 조건 추가
                    </Button>
                  </div>

                  {compositeConditions.length > 0 && (
                    <>
                      {/* 논리 연산자 */}
                      <div>
                        <Label>논리 연산자</Label>
                        <select
                          value={compositeLogic}
                          onChange={(e) => setCompositeLogic(e.target.value)}
                          className="w-full p-2 border rounded"
                        >
                          <option value="AND">AND (모두 만족)</option>
                          <option value="OR">OR (하나라도 만족)</option>
                        </select>
                      </div>

                      {/* 조건 목록 */}
                      {compositeConditions.map((cond, index) => (
                        <div key={index} className="p-3 bg-muted rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold">조건 {index + 1}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => removeCompositeCondition(index)}
                            >
                              🗑️
                            </Button>
                          </div>

                          <div className="grid grid-cols-3 gap-2">
                            <select
                              value={cond.type}
                              onChange={(e) => updateCompositeCondition(index, 'type', e.target.value)}
                              className="p-2 border rounded text-sm"
                            >
                              {STAT_TYPE_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>

                            <select
                              value={cond.operator}
                              onChange={(e) => updateCompositeCondition(index, 'operator', e.target.value)}
                              className="p-2 border rounded text-sm"
                            >
                              {OPERATOR_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>

                            <Input
                              type="number"
                              min="0"
                              value={cond.threshold}
                              onChange={(e) => updateCompositeCondition(index, 'threshold', e.target.value)}
                              className="text-sm"
                            />
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>

                {/* 조건 요약 */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold mb-2">📋 현재 조건 요약</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      ✅ {STAT_TYPE_OPTIONS.find(o => o.value === conditionType)?.label}{' '}
                      {OPERATOR_OPTIONS.find(o => o.value === operator)?.label}{' '}
                      {threshold}개
                    </p>

                    {compositeConditions.length > 0 && (
                      <>
                        <p className="font-semibold mt-2">{compositeLogic}</p>
                        {compositeConditions.map((cond, i) => (
                          <p key={i}>
                            ✅ {STAT_TYPE_OPTIONS.find(o => o.value === cond.type)?.label}{' '}
                            {OPERATOR_OPTIONS.find(o => o.value === cond.operator)?.label}{' '}
                            {cond.threshold}개
                          </p>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}

            {!conditionEnabled && (
              <div className="text-center py-8 text-muted-foreground">
                <p>자동 수여가 비활성화되었습니다.</p>
                <p className="text-sm">교사가 직접 부여해야 합니다.</p>
              </div>
            )}
          </TabsContent>

          {/* ═══════════ 탭 3: 진행도 설정 ═══════════ */}
          <TabsContent value="progress" className="space-y-4">
            {/* 진행도 표시 활성화 */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="progress-enabled"
                checked={progressEnabled}
                onChange={(e) => setProgressEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <Label htmlFor="progress-enabled" className="cursor-pointer">
                진행도 표시 활성화
              </Label>
            </div>

            {progressEnabled && (
              <>
                <div className="p-4 border rounded-lg space-y-3">
                  <div>
                    <Label>시작값</Label>
                    <Input type="number" value={0} disabled />
                  </div>

                  <div>
                    <Label>목표값</Label>
                    <Input
                      type="number"
                      value={threshold}
                      disabled
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      자동 조건의 목표값과 동일합니다.
                    </p>
                  </div>
                </div>

                {/* 미리보기 */}
                <div className="p-4 bg-muted rounded-lg">
                  <Label className="mb-2 block">미리보기</Label>
                  <Card className="p-4 w-32 mx-auto">
                    <div className="text-4xl text-center mb-2">{icon}</div>
                    <h3 className="text-sm font-semibold text-center">{name}</h3>
                    <div className="mt-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-primary h-2 rounded-full" style={{ width: '0%' }}></div>
                      </div>
                      <p className="text-xs text-center mt-1">0/{threshold}</p>
                    </div>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={handleReset}>
            초기화
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔧 2. BadgeCollection.jsx 수정

**파일 위치**: `src/components/BadgeCollection.jsx`

### 2-1. State 추가

```jsx
const [showBadgeSettings, setShowBadgeSettings] = useState(false);
const [editingBadge, setEditingBadge] = useState(null);
```

### 2-2. BadgeCard 수정 (Line 180-200)

```jsx
// 기존
<Card className="p-3 bg-card">
  <div className="text-4xl text-center mb-2">{badge.icon}</div>
  <h3 className="text-sm font-semibold text-center">{badge.name}</h3>
  <p className="text-xs text-muted-foreground text-center">
    {badge.description}
  </p>
</Card>

// ⭐ 수정 후
<Card className="p-3 bg-card relative group">
  {/* 톱니바퀴 버튼 */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      setEditingBadge(badge);
      setShowBadgeSettings(true);
    }}
    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600
               opacity-0 group-hover:opacity-100 transition-opacity"
  >
    ⚙️
  </button>

  <div className="text-4xl text-center mb-2">{badge.icon}</div>
  <h3 className="text-sm font-semibold text-center">{badge.name}</h3>
  <p className="text-xs text-muted-foreground text-center">
    {badge.description}
  </p>
</Card>
```

### 2-3. 모달 렌더링 추가 (파일 끝)

```jsx
{/* 배지 설정 모달 */}
<BadgeSettingsModal
  open={showBadgeSettings}
  onOpenChange={setShowBadgeSettings}
  badge={editingBadge}
  override={badgeOverrides[editingBadge?.id] || {}}
  onSave={handleSaveBadgeSettings}
/>
```

### 2-4. 저장 핸들러 추가

```jsx
const handleSaveBadgeSettings = (badgeId, override) => {
  const newOverrides = {
    ...badgeOverrides,
    [badgeId]: override
  };

  setBadgeOverrides(newOverrides);
  localStorage.setItem('badgeOverrides', JSON.stringify(newOverrides));

  alert('✅ 배지 설정이 저장되었습니다!');
};
```

---

## 🔥 3. badgeSystem.js 수정

**파일 위치**: `src/utils/badgeSystem.js`

### 3-1. calculateBadges() 함수 수정

```javascript
// 기존
export function calculateBadges(playerStats, currentBadges = []) {
  const newBadges = [];

  Object.values(BADGES).forEach(badge => {
    if (currentBadges.includes(badge.id)) return;

    // 하드코딩된 조건 체크
    if (badge.id === 'first_game' && playerStats.gameCount >= 1) {
      newBadges.push(badge.id);
    }
    // ... 더 많은 하드코딩
  });

  return newBadges;
}

// ⭐ 수정 후
export function calculateBadges(playerStats, currentBadges = [], badgeOverrides = {}) {
  const newBadges = [];

  Object.values(BADGES).forEach(badge => {
    if (currentBadges.includes(badge.id)) return;

    // 오버라이드된 조건 확인
    const override = badgeOverrides[badge.id];

    // 1. 자동 수여가 비활성화되었으면 스킵
    if (override?.condition?.enabled === false) {
      return;
    }

    // 2. 커스텀 조건이 있으면 우선 사용
    if (override?.condition) {
      if (evaluateCustomCondition(override.condition, playerStats)) {
        newBadges.push(badge.id);
      }
      return;
    }

    // 3. 기본 조건 사용
    if (evaluateDefaultCondition(badge, playerStats)) {
      newBadges.push(badge.id);
    }
  });

  return newBadges;
}
```

### 3-2. 커스텀 조건 평가 함수 추가

```javascript
/**
 * 커스텀 조건 평가
 */
function evaluateCustomCondition(condition, playerStats) {
  const { type, threshold, operator, composite } = condition;

  // 단일 조건
  if (!composite) {
    const value = playerStats[type] || 0;
    return compareValues(value, threshold, operator);
  }

  // 복합 조건
  const baseResult = compareValues(playerStats[type] || 0, threshold, operator);
  const compositeResults = composite.conditions.map(cond =>
    compareValues(playerStats[cond.type] || 0, cond.threshold, cond.operator)
  );

  if (composite.logic === 'AND') {
    return baseResult && compositeResults.every(r => r);
  } else {
    return baseResult || compositeResults.some(r => r);
  }
}

/**
 * 값 비교
 */
function compareValues(value, threshold, operator) {
  switch (operator) {
    case '>=': return value >= threshold;
    case '>': return value > threshold;
    case '==': return value === threshold;
    case '<=': return value <= threshold;
    case '<': return value < threshold;
    default: return false;
  }
}

/**
 * 기본 조건 평가
 */
function evaluateDefaultCondition(badge, playerStats) {
  // 기존 하드코딩된 조건들
  switch (badge.id) {
    case 'first_game':
      return playerStats.gameCount >= 1;
    case 'first_hit':
      return playerStats.hits >= 1;
    case 'three_hits':
      return playerStats.hits >= 3;
    case 'five_hits':
      return playerStats.hits >= 5;
    // ... 더 많은 조건
    default:
      return false;
  }
}
```

---

## 🔧 4. MainApp.jsx에서 오버라이드 전달

### 4-1. GameContext 수정 (선택)

**파일 위치**: `src/contexts/GameContext.jsx`

```jsx
// badgeOverrides를 calculateBadges에 전달
const updatedBadges = calculateBadges(
  cumulativeStats,
  playerBadges[playerId] || [],
  badgeOverrides  // ⭐ 추가
);
```

### 4-2. MainApp.jsx에서 Context에 전달

```jsx
<GameContext.Provider value={{
  // ... 기존 값들
  badgeOverrides  // ⭐ 추가
}}>
  {children}
</GameContext.Provider>
```

---

## ✅ 5. 테스트 체크리스트

### 기본 정보 수정 테스트
- [ ] 배지 카드 hover 시 ⚙️ 버튼 표시
- [ ] ⚙️ 버튼 클릭 시 모달 오픈
- [ ] 이모지 변경
- [ ] 이름 변경 (최대 20자)
- [ ] 설명 변경 (최대 100자)
- [ ] 등급 변경
- [ ] 미리보기 실시간 업데이트
- [ ] 저장 후 BadgeCollection에 반영 확인

### 자동 조건 수정 테스트
- [ ] 자동 수여 활성화/비활성화
- [ ] 스탯 종류 변경 (안타 → 득점 등)
- [ ] 비교 연산자 변경 (≥ → > 등)
- [ ] 목표 수치 변경
- [ ] 조건 요약 정확히 표시
- [ ] 저장 후 실제 조건 적용 확인

### 복합 조건 테스트
- [ ] 조건 추가 버튼
- [ ] 논리 연산자 선택 (AND/OR)
- [ ] 조건별 설정 (스탯, 연산자, 수치)
- [ ] 조건 삭제
- [ ] 복합 조건 요약 정확히 표시
- [ ] 저장 후 복합 조건 적용 확인

### 진행도 설정 테스트
- [ ] 진행도 표시 활성화/비활성화
- [ ] 목표값이 자동 조건과 동기화
- [ ] 미리보기 프로그레스바 표시
- [ ] 저장 후 BadgeProgressIndicator에 반영

### 통합 테스트
- [ ] 여러 배지 설정 수정
- [ ] 새로고침 후에도 설정 유지
- [ ] 실제 경기에서 커스텀 조건으로 배지 수여
- [ ] 초기화 버튼으로 기본값 복원

---

## 🎉 완료 후 확인사항

1. ✅ 모든 배지 카드에 ⚙️ 버튼 표시
2. ✅ 배지 설정 모달 3개 탭 정상 작동
3. ✅ 기본 정보 수정 반영
4. ✅ 자동 조건 수정 및 적용
5. ✅ 복합 조건 (AND/OR) 정상 작동
6. ✅ 진행도 설정 반영
7. ✅ badgeSystem.js의 calculateBadges에서 커스텀 조건 우선 처리
8. ✅ 로컬스토리지에 오버라이드 저장

---

**예상 소요 시간**: 5-7시간

**다음 단계**: Phase 3 - 학생 경기 기록 시스템
