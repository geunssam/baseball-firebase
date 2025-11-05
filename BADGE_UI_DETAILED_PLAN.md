# 배지 표시 UI 상세 구현 계획

## 📋 목차
1. [학급 관리 - 학생 카드 UI](#1-학급-관리---학생-카드-ui)
2. [학생 페이지 - 배지 순서 커스텀 버튼 UI](#2-학생-페이지---배지-순서-커스텀-버튼-ui)
3. [기타 컴포넌트 UI](#3-기타-컴포넌트-ui)

---

## 1. 학급 관리 - 학생 카드 UI

### 📍 파일 위치
`src/components/ClassTeamManagementView.jsx`

### 🔍 현재 코드 (line 27-163: SortablePlayerRow 컴포넌트)

**현재 Grid 레이아웃** (line 80):
```jsx
<div className="grid grid-cols-[auto_auto_1fr_120px_32px] gap-2 ...">
```

**현재 5개 컬럼 구조**:
```
┌────────┬────────┬──────────────────────┬────────────┬──────┐
│ 드래그 │  타순  │ 이름 + 반 + 번호    │  포지션    │ 삭제 │
│   ⠿   │  1번   │ 홍길동 (3-1) #1     │   포수     │  🗑  │
└────────┴────────┴──────────────────────┴────────────┴──────┘
  auto    auto          1fr              120px      32px
```

**현재 코드 상세**:
```jsx
{/* 드래그 핸들 - line 84-93 */}
<div className="flex items-center justify-center w-6">
  <span {...attributes} {...listeners} className="...">⠿</span>
</div>

{/* 타순 - line 95-100 */}
<div className="flex items-center justify-center">
  <div className="...">
    {player.battingOrder || index + 1}번
  </div>
</div>

{/* 이름 + 학년-반 배지 - line 102-111 */}
<div className="flex items-center gap-1.5">
  <span className="font-bold text-sm">{player.name}</span>
  {player.className && (
    <Badge variant="outline" className="text-[10px] bg-muted px-1 py-0">
      {player.className}
    </Badge>
  )}
  <span className="text-[10px] text-muted-foreground">
    #{player.number || index + 1}
  </span>
</div>

{/* 포지션 드롭박스 - line 113-147 */}
<div className="w-[120px]">
  <Select value={player.position || ''} onValueChange={handlePositionChange}>
    ...
  </Select>
</div>

{/* 삭제 버튼 - line 149-160 */}
<div className="flex justify-center w-8">
  {isTeamEditMode && (
    <button onClick={() => onRemove(index)}>
      <Trash2 className="w-3 h-3" />
    </button>
  )}
</div>
```

---

### ✨ 개선 후 UI

**새로운 Grid 레이아웃**:
```jsx
<div className="grid grid-cols-[auto_auto_auto_1fr_120px_32px] gap-2 ...">
```

**새로운 6개 컬럼 구조**:
```
┌────────┬────────┬──────────────┬────────────────────┬────────────┬──────┐
│ 드래그 │  타순  │    배지      │ 이름 + 반 + 번호  │  포지션    │ 삭제 │
│   ⠿   │  1번   │  🏆⚾🎯     │ 홍길동 (3-1) #1   │   포수     │  🗑  │
└────────┴────────┴──────────────┴────────────────────┴────────────┴──────┘
  auto    auto       auto              1fr            120px      32px
```

**추가할 코드** (line 102 이전에 삽입):
```jsx
{/* 배지 - 타순과 이름 사이에 추가 */}
<div className="flex items-center justify-start px-1">
  <PlayerBadgeDisplay
    player={player}
    maxBadges={3}
    size="sm"
    showEmpty={false}
    showOverflow={true}
  />
</div>
```

---

### 📊 변경 전후 비교

#### Before (현재):
```
⠿  1번  홍길동 (3-1) #1         포수  🗑
⠿  2번  김철수 (3-2) #2         1루수 🗑
⠿  3번  이영희 (3-1) #3         2루수 🗑
```

#### After (개선):
```
⠿  1번  🏆⚾🎯  홍길동 (3-1) #1  포수  🗑
⠿  2번  🥇⭐    김철수 (3-2) #2  1루수 🗑
⠿  3번  🥈      이영희 (3-1) #3  2루수 🗑
```

---

### 💻 구현 코드

**1. Import 추가** (파일 상단):
```jsx
import PlayerBadgeDisplay from './PlayerBadgeDisplay';
```

**2. Grid 레이아웃 변경** (line 80):
```jsx
// 변경 전
className="grid grid-cols-[auto_auto_1fr_120px_32px] gap-2 ..."

// 변경 후
className="grid grid-cols-[auto_auto_auto_1fr_120px_32px] gap-2 ..."
```

**3. 배지 컬럼 추가** (line 102 이전에 삽입):
```jsx
{/* 드래그 핸들 */}
<div className="flex items-center justify-center w-6">
  <span {...attributes} {...listeners} className="...">⠿</span>
</div>

{/* 타순 */}
<div className="flex items-center justify-center">
  <div className="...">
    {player.battingOrder || index + 1}번
  </div>
</div>

{/* ✅ 배지 컬럼 - 새로 추가 */}
<div className="flex items-center justify-start px-1">
  <PlayerBadgeDisplay
    player={player}
    maxBadges={3}
    size="sm"
    showEmpty={false}
    showOverflow={true}
  />
</div>

{/* 이름 + 학년-반 배지 (기존 코드 유지) */}
<div className="flex items-center gap-1.5">
  <span className="font-bold text-sm">{player.name}</span>
  ...
</div>
```

---

### 📝 주의사항

1. **SortablePlayerRowForNewTeam 컴포넌트도 동일하게 수정**
   - line 169부터 시작하는 컴포넌트
   - 새 팀 생성 시 사용되는 카드
   - 동일한 방식으로 배지 컬럼 추가

2. **배지가 없는 학생 처리**
   - `showEmpty={false}`: 배지가 없으면 빈 공간 표시하지 않음
   - UI가 자연스럽게 유지됨

3. **배지가 3개 초과인 경우**
   - `showOverflow={true}`: "+2" 같은 오버플로우 표시
   - 모든 배지를 확인하려면 학생 이름 클릭 (기존 기능)

---

## 2. 학생 페이지 - 배지 순서 커스텀 버튼 UI

### 📍 파일 위치
`src/components/StudentView.jsx`

### 🔍 현재 코드 (line 367-416: 배지 컬렉션 섹션)

**현재 배지 섹션 구조**:
```jsx
{/* 배지 컬렉션 - line 367 */}
<div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
  <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center gap-2">
    🏅 나의 배지
  </h2>

  {badges.length === 0 ? (
    <div className="text-center py-12 text-gray-500">
      {/* 배지 없을 때 메시지 */}
    </div>
  ) : (
    <div className="grid ...">
      {/* 배지 카드들 */}
    </div>
  )}
</div>
```

---

### ✨ 개선 후 UI

**새로운 배지 섹션 구조** (헤더에 버튼 추가):
```jsx
{/* 배지 컬렉션 */}
<div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
  {/* ✅ 헤더 영역 개선 */}
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
      🏅 나의 배지
    </h2>

    {/* ✅ 배지 순서 변경 버튼 (배지가 있을 때만 표시) */}
    {badges.length > 0 && (
      <button
        onClick={() => setIsBadgeOrderModalOpen(true)}
        className="text-sm bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition shadow-md hover:shadow-lg font-semibold flex items-center gap-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        배지 순서 변경
      </button>
    )}
  </div>

  {/* 배지 표시 영역 (기존 코드 유지) */}
  {badges.length === 0 ? (
    <div className="text-center py-12 text-gray-500">
      ...
    </div>
  ) : (
    <div className="grid ...">
      ...
    </div>
  )}
</div>
```

---

### 📊 시각화된 UI 레이아웃

#### Before (현재):
```
┌───────────────────────────────────────────────────────┐
│  🏅 나의 배지                                         │
│                                                       │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐            │
│  │  🏆     │  │  ⚾     │  │  🎯     │            │
│  │ 첫경기  │  │ 안타왕  │  │ 득점왕  │            │
│  │ (입문)  │  │ (숙련)  │  │ (마스터)│            │
│  │2024.03.15│  │2024.03.20│  │2024.03.25│            │
│  └─────────┘  └─────────┘  └─────────┘            │
└───────────────────────────────────────────────────────┘
```

#### After (개선):
```
┌───────────────────────────────────────────────────────────────┐
│  🏅 나의 배지              [≡ 배지 순서 변경] ← 새로 추가! │
│                                                               │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                    │
│  │  🏆     │  │  ⚾     │  │  🎯     │                    │
│  │ 첫경기  │  │ 안타왕  │  │ 득점왕  │                    │
│  │ (입문)  │  │ (숙련)  │  │ (마스터)│                    │
│  │2024.03.15│  │2024.03.20│  │2024.03.25│                    │
│  └─────────┘  └─────────┘  └─────────┘                    │
└───────────────────────────────────────────────────────────────┘
```

---

### 💻 구현 코드

**1. Import 추가** (파일 상단):
```jsx
import PlayerBadgeOrderModal from './PlayerBadgeOrderModal';
import firestoreService from '../services/firestoreService';
```

**2. State 추가** (line 24 근처, 다른 state들과 함께):
```jsx
const [isBadgeOrderModalOpen, setIsBadgeOrderModalOpen] = useState(false);
```

**3. 배지 섹션 헤더 수정** (line 367-371):
```jsx
{/* 배지 컬렉션 */}
<div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
  {/* ✅ 변경: 단순 h2에서 flex 레이아웃으로 */}
  <div className="flex items-center justify-between mb-4">
    <h2 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
      🏅 나의 배지
    </h2>

    {/* ✅ 새로 추가: 배지 순서 변경 버튼 */}
    {badges.length > 0 && (
      <button
        onClick={() => setIsBadgeOrderModalOpen(true)}
        className="text-sm bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition shadow-md hover:shadow-lg font-semibold flex items-center gap-2"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
        배지 순서 변경
      </button>
    )}
  </div>

  {/* 배지 표시 영역 (기존 코드 유지) */}
  {badges.length === 0 ? (
    ...
  ) : (
    ...
  )}
</div>
```

**4. PlayerBadgeOrderModal 추가** (line 416 이후, 배지 섹션 닫는 태그 다음):
```jsx
{/* 배지 컬렉션 */}
<div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
  ...
</div>

{/* ✅ 배지 순서 커스텀 모달 - 새로 추가 */}
<PlayerBadgeOrderModal
  open={isBadgeOrderModalOpen}
  onOpenChange={setIsBadgeOrderModalOpen}
  player={{
    id: studentData.playerId,
    name: studentData.name,
    badges: badges.map(b => b.badge_id)
  }}
  onSave={async (newBadgeOrder) => {
    try {
      // Firestore에 새로운 배지 순서 저장
      await firestoreService.savePlayerBadges(studentData.playerId, {
        badges: newBadgeOrder
      });

      console.log('✅ 배지 순서 저장 완료:', newBadgeOrder);

      // 데이터 갱신
      await loadStudentData();

      // 모달 닫기
      setIsBadgeOrderModalOpen(false);
    } catch (error) {
      console.error('❌ 배지 순서 저장 실패:', error);
      alert('배지 순서 저장에 실패했습니다. 다시 시도해주세요.');
    }
  }}
/>

{/* 경기 기록 (기존 코드) */}
<div className="mb-6">
  <StudentGameHistory ... />
</div>
```

---

### 🎨 버튼 디자인 옵션

사용자가 원하는 스타일로 선택 가능합니다:

#### 옵션 1: 아이콘 + 텍스트 (추천)
```jsx
<button className="...">
  <svg className="w-4 h-4" ...>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
  배지 순서 변경
</button>
```
```
[≡ 배지 순서 변경]
```

#### 옵션 2: 이모지 + 텍스트
```jsx
<button className="...">
  ✏️ 배지 순서 변경
</button>
```
```
[✏️ 배지 순서 변경]
```

#### 옵션 3: 텍스트만
```jsx
<button className="...">
  배지 순서 변경
</button>
```
```
[배지 순서 변경]
```

---

### 🎬 사용자 플로우

1. **학생 페이지 접속**
   ```
   🏅 나의 배지    [≡ 배지 순서 변경]

   [🏆] [⚾] [🎯] [🥇] [⭐]
   ```

2. **"배지 순서 변경" 버튼 클릭**
   ```
   모달 오픈 ↓

   ┌─────────────────────────┐
   │ 🎨 홍길동 - 배지 순서 변경│
   ├─────────────────────────┤
   │ ⠿ 🏆 첫 경기 출전      │
   │ ⠿ ⚾ 안타왕            │
   │ ⠿ 🎯 득점왕            │
   │ ⠿ 🥇 홈런왕            │
   │ ⠿ ⭐ MVP              │
   │                         │
   │ 💡 드래그하여 순서 변경 │
   │                         │
   │      [취소] [✅ 저장]   │
   └─────────────────────────┘
   ```

3. **드래그앤드롭으로 순서 변경**
   ```
   ⚾ 안타왕을 맨 위로 드래그

   ⠿ ⚾ 안타왕            ← 드래그됨
   ⠿ 🏆 첫 경기 출전      ← 아래로 이동
   ⠿ 🎯 득점왕
   ⠿ 🥇 홈런왕
   ⠿ ⭐ MVP
   ```

4. **저장 버튼 클릭**
   ```
   Firestore에 저장 →

   users/{teacherId}/playerBadges/{playerId}
   {
     badges: ['안타왕', '첫경기', '득점왕', '홈런왕', 'MVP']
   }
   ```

5. **즉시 화면 반영**
   ```
   🏅 나의 배지    [≡ 배지 순서 변경]

   [⚾] [🏆] [🎯] [🥇] [⭐]  ← 순서 변경됨!
   ```

6. **모든 화면에 자동 적용**
   - 학급 관리 카드
   - 팀 관리 상세
   - 실시간 경기
   - 경기 통계

   모든 곳에서 [⚾] [🏆] [🎯] 순서로 표시됨!

---

## 3. 기타 컴포넌트 UI

### StatsView - 경기 통계 테이블

**현재 컬럼**:
```
이름 | 포지션 | 안타 | 득점 | 수비 | 쿠키 | (newBadges 별도)
```

**개선 후 컬럼**:
```
배지 | 이름 | 포지션 | 안타 | 득점 | 수비 | 쿠키 | 이 경기 획득 배지
```

**예시**:
```
┌──────────┬────────┬────────┬──────┬──────┬──────┬──────┬──────────────┐
│   배지   │  이름  │ 포지션 │ 안타 │ 득점 │ 수비 │ 쿠키 │ 경기 획득배지│
├──────────┼────────┼────────┼──────┼──────┼──────┼──────┼──────────────┤
│ 🏆⚾🎯  │ 홍길동 │  포수  │  3   │  2   │  1   │  0   │   🥇⭐     │
│ 🥇⭐    │ 김철수 │ 1루수  │  2   │  1   │  0   │  1   │      -       │
│ 🥈      │ 이영희 │ 2루수  │  1   │  0   │  2   │  0   │     🥈      │
└──────────┴────────┴────────┴──────┴──────┴──────┴──────┴──────────────┘
```

---

### TeamSelectModal - 팀 선택 모달

**현재**: 팀 카드만 표시 (선수 수만 표시)
**개선**: 변경 없음 (개별 선수 표시 안 함)

---

### LineupModal - 라인업 편성

**현재**:
```
타순 | 선수명 | 수비 포지션
```

**선택적 개선** (필요시):
```
타순 | 배지 | 선수명 | 수비 포지션
```

---

## 📝 구현 우선순위

### Phase 1 (필수)
1. ✅ ClassTeamManagementView - 배지 컬럼 추가
2. ✅ StudentView - 배지 순서 커스텀 버튼 추가
3. ✅ StatsView - 배지 컬럼 2개 추가

### Phase 2 (선택)
4. LineupModal - 배지 컬럼 추가 (필요시)
5. 기타 최적화 및 스타일 조정

---

## 🎯 최종 확인 사항

### UI 일관성
- [ ] 모든 화면에서 배지 크기 통일 (size='sm')
- [ ] 배지 간격 및 정렬 일관성
- [ ] 호버 효과 통일

### 기능 동작
- [ ] 배지 순서 변경 후 저장
- [ ] 모든 화면에서 동일한 순서로 표시
- [ ] 배지 없는 학생 케이스 처리

### 반응형
- [ ] 모바일에서 버튼 크기 적절
- [ ] 태블릿에서 레이아웃 유지
- [ ] 데스크톱에서 최적 표시

---

**작성일**: 2025-01-05
**버전**: 2.0
**목적**: 정확한 UI 위치 및 코드 제시
