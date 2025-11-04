# 📦 Phase 1: 커스텀 배지 생성 시스템 구현 가이드

## 🎯 목표
교사가 완전히 새로운 배지를 만들어 학생에게 부여할 수 있는 시스템 구현

---

## 📋 구현 체크리스트

### 1단계: 컴포넌트 파일 생성
- [ ] `BadgeCreator.jsx` 생성
- [ ] `BadgeManagementModal.jsx` 생성
- [ ] `ManualBadgeModal.jsx` 생성

### 2단계: MainApp.jsx 수정
- [ ] State 추가 (customBadges, showBadgeManagement 등)
- [ ] 헤더에 "배지 관리" 버튼 추가
- [ ] 배지 저장 핸들러 함수 추가
- [ ] 모달 컴포넌트 렌더링

### 3단계: Firebase 연동
- [ ] `firestoreService.js`에 배지 관련 함수 추가
- [ ] Firestore Rules 업데이트

### 4단계: 테스트
- [ ] 배지 생성 테스트
- [ ] 배지 수정 테스트
- [ ] 배지 삭제 테스트
- [ ] 수동 배지 부여 테스트

---

## 📂 1. 새로 생성할 파일

### 1-1. BadgeCreator.jsx

**파일 위치**: `src/components/BadgeCreator.jsx`

**기능**:
- 이모지 선택 (직접 입력 + 자주 사용 16개 + 카테고리별 324개)
- 배지 이름, 설명, 등급 입력
- 실시간 미리보기
- Standalone/Embedded 모드 지원

**UI 구조**:
```
┌────────────────────────────────────────┐
│ 📝 새 배지 만들기                       │
│                                        │
│ 이모지 선택:                            │
│ [직접 입력: _____] [🔍]                │
│                                        │
│ 자주 사용:                              │
│ [⚾][🏆][🎯][💪][🌟][🔥][⚡][🎉]      │
│ [👍][🏅][💯][🎊][🌈][✨][🎁][🏃]      │
│                                        │
│ 카테고리별: [스포츠 ▼]                  │
│ ⚾ 🏀 🏈 ⚽ 🎾 🏐 🏓 🏸               │
│                                        │
│ 배지 이름: [___________] (최대 20자)   │
│ 배지 등급: (○) 입문 (○) 숙련 (○) 마스터 │
│ 배지 설명: [___________]              │
│                                        │
│ 미리보기:                               │
│ ┌────────┐                            │
│ │   ⚾   │                            │
│ │ 팀워크  │                            │
│ └────────┘                            │
│                                        │
│ [배지 만들기]                           │
└────────────────────────────────────────┘
```

**주요 코드**:
```jsx
import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card } from './ui/card';

const FREQUENT_EMOJIS = [
  '⚾', '🏆', '🎯', '💪', '🌟', '🔥', '⚡', '🎉',
  '👍', '🏅', '💯', '🎊', '🌈', '✨', '🎁', '🏃'
];

const EMOJI_CATEGORIES = {
  '스포츠 & 게임': ['⚾', '🏀', '🏈', '⚽', '🎾', '🏐', '🏓', '🏸', '🥊', '🥋', '⛳', '🏹'],
  '감정 & 표정': ['😊', '🎉', '💪', '👍', '🙌', '👏', '🤗', '😎', '🤩', '🥳', '😇', '🌟'],
  '하트 & 사랑': ['❤️', '💙', '💚', '💛', '🧡', '💜', '🤎', '🖤', '🤍', '💖', '💗', '💓'],
  // ... 더 많은 카테고리
};

const TIER_OPTIONS = [
  { value: 1, label: '입문', color: 'bg-gray-100' },
  { value: 2, label: '숙련', color: 'bg-blue-100' },
  { value: 3, label: '마스터', color: 'bg-purple-100' },
  { value: 4, label: '레전드', color: 'bg-yellow-100' },
  { value: 5, label: '특별', color: 'bg-red-100' }
];

export default function BadgeCreator({ onSave, onCancel, initialBadge = null, standalone = true }) {
  const [icon, setIcon] = useState(initialBadge?.icon || '⚾');
  const [name, setName] = useState(initialBadge?.name || '');
  const [description, setDescription] = useState(initialBadge?.description || '');
  const [tier, setTier] = useState(initialBadge?.tier || 1);
  const [selectedCategory, setSelectedCategory] = useState('스포츠 & 게임');

  const handleSave = () => {
    if (!name.trim()) {
      alert('배지 이름을 입력하세요.');
      return;
    }

    const badge = {
      id: initialBadge?.id || `custom-${Date.now()}`,
      icon,
      name: name.trim(),
      description: description.trim(),
      tier,
      badgeType: 'custom',
      conditionType: 'manual',
      isCustom: true,
      createdAt: new Date().toISOString()
    };

    onSave(badge);
  };

  return (
    <div className="space-y-6">
      {/* 이모지 선택 */}
      <div>
        <Label>이모지 선택</Label>
        <div className="flex gap-2 mb-4">
          <Input
            value={icon}
            onChange={(e) => setIcon(e.target.value)}
            placeholder="이모지 입력"
            maxLength={2}
            className="w-24 text-2xl text-center"
          />
        </div>

        {/* 자주 사용 */}
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">자주 사용:</p>
          <div className="grid grid-cols-8 gap-2">
            {FREQUENT_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => setIcon(emoji)}
                className={`text-3xl p-2 rounded hover:bg-accent ${
                  icon === emoji ? 'ring-2 ring-primary' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>

        {/* 카테고리별 */}
        <div>
          <p className="text-sm text-muted-foreground mb-2">카테고리별:</p>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full p-2 border rounded mb-2"
          >
            {Object.keys(EMOJI_CATEGORIES).map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto">
            {EMOJI_CATEGORIES[selectedCategory].map(emoji => (
              <button
                key={emoji}
                onClick={() => setIcon(emoji)}
                className={`text-3xl p-2 rounded hover:bg-accent ${
                  icon === emoji ? 'ring-2 ring-primary' : ''
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 배지 정보 */}
      <div>
        <Label htmlFor="badge-name">배지 이름</Label>
        <Input
          id="badge-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="예: 팀워크의 달인"
          maxLength={20}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {name.length}/20자
        </p>
      </div>

      <div>
        <Label>배지 등급</Label>
        <div className="grid grid-cols-5 gap-2 mt-2">
          {TIER_OPTIONS.map(option => (
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

      <div>
        <Label htmlFor="badge-desc">배지 설명</Label>
        <Textarea
          id="badge-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="예: 팀원들과 협력을 잘했어요"
          maxLength={100}
          rows={3}
        />
        <p className="text-xs text-muted-foreground mt-1">
          {description.length}/100자
        </p>
      </div>

      {/* 미리보기 */}
      <div>
        <Label>미리보기</Label>
        <Card className="p-4 w-32 mx-auto">
          <div className="text-4xl text-center mb-2">{icon}</div>
          <h3 className="text-sm font-semibold text-center">{name || '배지 이름'}</h3>
          <p className="text-xs text-muted-foreground text-center mt-1">
            {description || '배지 설명'}
          </p>
        </Card>
      </div>

      {/* 버튼 */}
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="outline" onClick={onCancel}>
            취소
          </Button>
        )}
        <Button onClick={handleSave}>
          {initialBadge ? '수정 완료' : '배지 만들기'}
        </Button>
      </div>
    </div>
  );
}
```

---

### 1-2. BadgeManagementModal.jsx

**파일 위치**: `src/components/BadgeManagementModal.jsx`

**기능**:
- 새 배지 만들기 탭
- 기존 배지 수정하기 탭 (기본 배지 / 커스텀 배지 구분)
- BadgeCreator 컴포넌트 통합

**주요 코드**:
```jsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import BadgeCreator from './BadgeCreator';
import { Card } from './ui/card';
import { Button } from './ui/button';

export default function BadgeManagementModal({
  open,
  onOpenChange,
  customBadges = [],
  systemBadges = [],
  onSaveBadge,
  onDeleteBadge,
  onHideBadge
}) {
  const [activeTab, setActiveTab] = useState('create');
  const [editMode, setEditMode] = useState(null); // 'system' | 'custom' | null
  const [editingBadge, setEditingBadge] = useState(null);

  const handleSaveBadge = (badge) => {
    onSaveBadge(badge);
    setEditingBadge(null);
    setActiveTab('edit');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>⚙️ 배지 편집</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">➕ 새로 만들기</TabsTrigger>
            <TabsTrigger value="edit">✏️ 수정하기</TabsTrigger>
          </TabsList>

          {/* 새로 만들기 탭 */}
          <TabsContent value="create">
            <BadgeCreator
              onSave={handleSaveBadge}
              standalone={false}
            />
          </TabsContent>

          {/* 수정하기 탭 */}
          <TabsContent value="edit">
            {editingBadge ? (
              <BadgeCreator
                initialBadge={editingBadge}
                onSave={handleSaveBadge}
                onCancel={() => setEditingBadge(null)}
                standalone={false}
              />
            ) : (
              <div className="space-y-6">
                {/* 서브탭 */}
                <Tabs value={editMode || 'custom'} onValueChange={setEditMode}>
                  <TabsList>
                    <TabsTrigger value="system">🎯 기본 배지</TabsTrigger>
                    <TabsTrigger value="custom">✨ 커스텀 배지</TabsTrigger>
                  </TabsList>

                  {/* 기본 배지 */}
                  <TabsContent value="system">
                    <p className="text-sm text-muted-foreground mb-4">
                      ⚠️ 기본 배지는 아이콘과 이름만 수정할 수 있습니다.
                    </p>
                    <div className="grid grid-cols-4 gap-4">
                      {systemBadges.map(badge => (
                        <Card
                          key={badge.id}
                          className="p-4 cursor-pointer hover:shadow-lg"
                          onClick={() => setEditingBadge(badge)}
                        >
                          <div className="text-4xl text-center mb-2">{badge.icon}</div>
                          <h3 className="text-sm font-semibold text-center">{badge.name}</h3>
                          <div className="mt-2 text-center">
                            <Button size="sm" variant="outline">✏️ 수정</Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>

                  {/* 커스텀 배지 */}
                  <TabsContent value="custom">
                    {customBadges.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p className="text-4xl mb-4">📦</p>
                        <p>아직 만든 배지가 없습니다.</p>
                        <p className="text-sm">새로 만들기 탭에서 배지를 만들어보세요!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-4 gap-4">
                        {customBadges.map(badge => (
                          <Card
                            key={badge.id}
                            className="p-4 relative hover:shadow-lg"
                          >
                            <div className="text-4xl text-center mb-2">{badge.icon}</div>
                            <h3 className="text-sm font-semibold text-center">{badge.name}</h3>
                            <div className="mt-2 flex gap-1 justify-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingBadge(badge)}
                              >
                                ✏️
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => {
                                  if (confirm(`"${badge.name}" 배지를 삭제하시겠습니까?`)) {
                                    onDeleteBadge(badge.id);
                                  }
                                }}
                              >
                                🗑️
                              </Button>
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
```

---

### 1-3. ManualBadgeModal.jsx

**파일 위치**: `src/components/ManualBadgeModal.jsx`

**기능**:
- 특정 학생에게 배지 수동 부여
- 시스템 배지 + 커스텀 배지 모두 표시
- 이미 보유한 배지는 회색 처리

**주요 코드**:
```jsx
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card } from './ui/card';

export default function ManualBadgeModal({
  open,
  onOpenChange,
  student,
  allBadges = [],
  ownedBadges = [],
  onAwardBadge
}) {
  const [selectedBadgeId, setSelectedBadgeId] = useState(null);
  const [note, setNote] = useState('');

  const handleAward = async () => {
    if (!selectedBadgeId) {
      alert('배지를 선택하세요.');
      return;
    }

    await onAwardBadge(student.playerId, selectedBadgeId, note);
    setSelectedBadgeId(null);
    setNote('');
    onOpenChange(false);
  };

  const systemBadges = allBadges.filter(b => b.badgeType === 'system');
  const customBadges = allBadges.filter(b => b.badgeType === 'custom');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            🏅 배지 부여: {student?.name} ({student?.className})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 시스템 배지 */}
          <div>
            <h3 className="font-semibold mb-3">⚾ 시스템 배지</h3>
            <div className="grid grid-cols-5 gap-3">
              {systemBadges.map(badge => {
                const isOwned = ownedBadges.includes(badge.id);
                return (
                  <Card
                    key={badge.id}
                    className={`p-3 cursor-pointer ${
                      isOwned
                        ? 'opacity-50 cursor-not-allowed bg-gray-100'
                        : selectedBadgeId === badge.id
                        ? 'ring-2 ring-primary'
                        : 'hover:shadow-lg'
                    }`}
                    onClick={() => !isOwned && setSelectedBadgeId(badge.id)}
                  >
                    <div className="text-3xl text-center mb-1">{badge.icon}</div>
                    <p className="text-xs text-center font-semibold">{badge.name}</p>
                    {isOwned && (
                      <p className="text-xs text-center text-muted-foreground mt-1">
                        보유 중
                      </p>
                    )}
                  </Card>
                );
              })}
            </div>
          </div>

          {/* 커스텀 배지 */}
          {customBadges.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">✨ 커스텀 배지</h3>
              <div className="grid grid-cols-5 gap-3">
                {customBadges.map(badge => {
                  const isOwned = ownedBadges.includes(badge.id);
                  return (
                    <Card
                      key={badge.id}
                      className={`p-3 cursor-pointer ${
                        isOwned
                          ? 'opacity-50 cursor-not-allowed bg-gray-100'
                          : selectedBadgeId === badge.id
                          ? 'ring-2 ring-primary'
                          : 'hover:shadow-lg'
                      }`}
                      onClick={() => !isOwned && setSelectedBadgeId(badge.id)}
                    >
                      <div className="text-3xl text-center mb-1">{badge.icon}</div>
                      <p className="text-xs text-center font-semibold">{badge.name}</p>
                      {isOwned && (
                        <p className="text-xs text-center text-muted-foreground mt-1">
                          보유 중
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* 수여 사유 */}
          <div>
            <Label htmlFor="award-note">수여 사유 (선택)</Label>
            <Textarea
              id="award-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="예: 오늘 수업에서 팀워크를 발휘했습니다."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleAward} disabled={!selectedBadgeId}>
            부여하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 🔧 2. MainApp.jsx 수정

**파일 위치**: `src/components/MainApp.jsx`

### 2-1. State 추가 (Line 20-50 근처)

```jsx
// 기존 State들...
const [dashboardView, setDashboardView] = useState('dashboard');

// ⭐ 추가할 State
const [customBadges, setCustomBadges] = useState([]);
const [badgeOverrides, setBadgeOverrides] = useState({});
const [hiddenBadges, setHiddenBadges] = useState([]);
const [showBadgeManagement, setShowBadgeManagement] = useState(false);
const [showManualBadgeModal, setShowManualBadgeModal] = useState(false);
const [selectedStudentForBadge, setSelectedStudentForBadge] = useState(null);
```

### 2-2. 초기 로드 useEffect 추가

```jsx
// 커스텀 배지 로드
useEffect(() => {
  if (user) {
    // 로컬스토리지에서 로드
    const savedBadges = localStorage.getItem('customBadges');
    if (savedBadges) {
      setCustomBadges(JSON.parse(savedBadges));
    }

    const savedOverrides = localStorage.getItem('badgeOverrides');
    if (savedOverrides) {
      setBadgeOverrides(JSON.parse(savedOverrides));
    }

    const savedHidden = localStorage.getItem('hiddenBadges');
    if (savedHidden) {
      setHiddenBadges(JSON.parse(savedHidden));
    }

    // Firebase에서 동기화 (선택)
    syncCustomBadgesFromFirebase(user.uid);
  }
}, [user]);
```

### 2-3. 배지 저장 핸들러 추가

```jsx
const handleSaveBadge = async (badge) => {
  const isBasicBadge = badge.id && !badge.isCustom;

  if (isBasicBadge) {
    // 기본 배지 오버라이드 (아이콘/이름만)
    const newOverrides = {
      ...badgeOverrides,
      [badge.id]: { icon: badge.icon, name: badge.name }
    };
    setBadgeOverrides(newOverrides);
    localStorage.setItem('badgeOverrides', JSON.stringify(newOverrides));
    alert('✅ 배지가 수정되었습니다!');
  } else {
    // 커스텀 배지 저장
    const existingIndex = customBadges.findIndex(b => b.id === badge.id);
    let newBadges;

    if (existingIndex !== -1) {
      // 수정
      newBadges = customBadges.map(b => b.id === badge.id ? badge : b);
    } else {
      // 새로 추가
      newBadges = [...customBadges, badge];
    }

    setCustomBadges(newBadges);
    localStorage.setItem('customBadges', JSON.stringify(newBadges));

    // Firebase 저장 (선택)
    try {
      await saveCustomBadge(user.uid, badge);
      alert('✅ 커스텀 배지가 저장되었습니다!');
    } catch (error) {
      console.error('Firebase 저장 실패:', error);
      alert('⚠️ 배지 저장 중 오류가 발생했습니다.');
    }
  }
};

const handleDeleteBadge = async (badgeId) => {
  const newBadges = customBadges.filter(b => b.id !== badgeId);
  setCustomBadges(newBadges);
  localStorage.setItem('customBadges', JSON.stringify(newBadges));

  // Firebase 삭제 (선택)
  try {
    await deleteCustomBadge(user.uid, badgeId);
    alert('✅ 배지가 삭제되었습니다.');
  } catch (error) {
    console.error('Firebase 삭제 실패:', error);
  }
};

const handleAwardBadge = async (playerId, badgeId, note) => {
  try {
    await awardManualBadge(user.uid, playerId, badgeId, note);
    alert('✅ 배지를 부여했습니다!');
  } catch (error) {
    console.error('배지 부여 실패:', error);
    alert('❌ 배지 부여에 실패했습니다: ' + error.message);
  }
};
```

### 2-4. 헤더에 버튼 추가 (Line 340-365)

```jsx
{/* 우측: 프로필 */}
<div className="flex items-center gap-2 tablet:gap-4">
  <Avatar>...</Avatar>

  <Button onClick={() => setShowStudentCodeModal(true)}>
    📋 학생코드
  </Button>

  {/* ⭐ 여기에 추가 */}
  <Button
    onClick={() => setShowBadgeManagement(true)}
    size="sm"
    className="bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-200"
  >
    ⚙️ 배지 관리
  </Button>

  <Button onClick={signOut}>로그아웃</Button>
</div>
```

### 2-5. 모달 컴포넌트 렌더링 (파일 끝부분)

```jsx
{/* 배지 관리 모달 */}
<BadgeManagementModal
  open={showBadgeManagement}
  onOpenChange={setShowBadgeManagement}
  customBadges={customBadges}
  systemBadges={Object.values(BADGES)} // badgeSystem.js에서 import
  onSaveBadge={handleSaveBadge}
  onDeleteBadge={handleDeleteBadge}
/>

{/* 수동 배지 부여 모달 */}
<ManualBadgeModal
  open={showManualBadgeModal}
  onOpenChange={setShowManualBadgeModal}
  student={selectedStudentForBadge}
  allBadges={[...Object.values(BADGES), ...customBadges]}
  ownedBadges={playerBadges[selectedStudentForBadge?.playerId] || []}
  onAwardBadge={handleAwardBadge}
/>
```

---

## 🔥 3. Firebase 연동

### 3-1. firestoreService.js에 함수 추가

**파일 위치**: `src/services/firestoreService.js`

```javascript
import { doc, setDoc, getDoc, getDocs, collection, query, where, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

/**
 * 커스텀 배지 저장
 */
export async function saveCustomBadge(teacherId, badge) {
  try {
    const badgeRef = doc(db, 'users', teacherId, 'customBadges', badge.id);

    const badgeData = {
      id: badge.id,
      name: badge.name,
      icon: badge.icon,
      tier: badge.tier || 1,
      badgeType: 'custom',
      conditionType: badge.conditionType || 'manual',
      conditionData: badge.conditionData || null,
      description: badge.description || '',
      isActive: true,
      displayOrder: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(badgeRef, badgeData, { merge: true });
    return { success: true, data: badgeData };
  } catch (error) {
    console.error('커스텀 배지 저장 실패:', error);
    return { success: false, error };
  }
}

/**
 * 커스텀 배지 목록 불러오기
 */
export async function loadCustomBadges(teacherId) {
  try {
    const badgesRef = collection(db, 'users', teacherId, 'customBadges');
    const q = query(badgesRef, where('isActive', '==', true));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('커스텀 배지 불러오기 실패:', error);
    return [];
  }
}

/**
 * 커스텀 배지 삭제
 */
export async function deleteCustomBadge(teacherId, badgeId) {
  try {
    const badgeRef = doc(db, 'users', teacherId, 'customBadges', badgeId);
    await deleteDoc(badgeRef);
    return { success: true };
  } catch (error) {
    console.error('커스텀 배지 삭제 실패:', error);
    return { success: false, error };
  }
}

/**
 * 수동 배지 부여
 */
export async function awardManualBadge(teacherId, playerId, badgeId, note = '') {
  try {
    const badgeRef = doc(db, 'users', teacherId, 'playerBadges', playerId);

    // 기존 배지 목록 가져오기
    const badgeDoc = await getDoc(badgeRef);
    const currentBadges = badgeDoc.exists() ? badgeDoc.data().badges || [] : [];

    // 중복 체크
    if (currentBadges.includes(badgeId)) {
      return { success: false, error: '이미 보유한 배지입니다' };
    }

    // 배지 추가
    await setDoc(badgeRef, {
      badges: [...currentBadges, badgeId],
      lastAwarded: {
        badgeId,
        awardedAt: serverTimestamp(),
        awardedBy: teacherId,
        awardType: 'manual',
        note
      }
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('수동 배지 부여 실패:', error);
    return { success: false, error };
  }
}
```

### 3-2. Firestore Rules 추가

**파일 위치**: `firestore.rules`

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ... 기존 rules

    // 커스텀 배지
    match /users/{userId}/customBadges/{badgeId} {
      allow read: if request.auth != null;  // 모든 로그인 유저가 볼 수 있음
      allow write: if request.auth != null && request.auth.uid == userId;  // 본인만 수정
    }
  }
}
```

---

## ✅ 4. 테스트 체크리스트

### 배지 생성 테스트
- [ ] 이모지 선택 (직접 입력, 자주 사용, 카테고리별)
- [ ] 배지 이름 입력 (최대 20자)
- [ ] 배지 등급 선택 (1-5)
- [ ] 배지 설명 입력 (최대 100자)
- [ ] 미리보기 확인
- [ ] "배지 만들기" 클릭 시 저장

### 배지 수정 테스트
- [ ] 커스텀 배지 선택 후 수정
- [ ] 모든 필드 수정 가능한지 확인
- [ ] 수정 완료 후 반영 확인

### 배지 삭제 테스트
- [ ] 커스텀 배지 삭제
- [ ] 삭제 확인 다이얼로그 표시
- [ ] 삭제 후 목록에서 제거 확인

### 수동 배지 부여 테스트
- [ ] 학생 선택
- [ ] 배지 선택 (시스템 + 커스텀)
- [ ] 이미 보유한 배지 회색 처리 확인
- [ ] 수여 사유 입력
- [ ] 부여 완료 확인

### Firebase 동기화 테스트
- [ ] 배지 생성 시 Firestore 저장 확인
- [ ] 새로고침 후에도 배지 유지 확인
- [ ] 로컬스토리지 백업 확인

---

## 🎉 완료 후 확인사항

1. ✅ "배지 관리" 버튼 클릭 시 모달 오픈
2. ✅ 새 배지 만들기 → 저장 → 수정하기 탭에서 확인
3. ✅ 커스텀 배지 수정/삭제 정상 작동
4. ✅ 학생에게 배지 수동 부여 가능
5. ✅ Firebase에 데이터 저장 확인
6. ✅ 새로고침 후에도 데이터 유지

---

**예상 소요 시간**: 4-6시간

**다음 단계**: Phase 2 - 기본 배지 전체 수정
