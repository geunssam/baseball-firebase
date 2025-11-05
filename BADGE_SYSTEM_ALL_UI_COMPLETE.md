# 배지 시스템 - 전체 UI 통합 가이드

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [학급 관리 - 학생 카드](#1-학급-관리---학생-카드)
3. [팀 관리 - 라인업 편성](#2-팀-관리---라인업-편성)
4. [실시간 경기 - 라인업 테이블](#3-실시간-경기---라인업-테이블)
5. [경기 통계 - 기록 테이블](#4-경기-통계---기록-테이블)
6. [학생 페이지 - 배지 컬렉션](#5-학생-페이지---배지-컬렉션)
7. [구현 순서 및 체크리스트](#구현-순서-및-체크리스트)

---

## 🎯 프로젝트 개요

### 목적
모든 학생 카드 UI에 배지를 일관되게 표시하여 배지 시스템의 가시성과 동기부여 효과를 극대화합니다.

### 핵심 기능
1. **배지 자동 동기화**: 학생이 설정한 배지 순서가 모든 화면에 자동 적용
2. **학생 주도 커스텀**: 학생 페이지에서 자신의 배지 순서를 직접 관리
3. **최소 코드 변경**: 기존 `PlayerBadgeDisplay` 컴포넌트 재사용

### 기술 스택
- React 18 + Firestore
- PlayerBadgeDisplay (재사용 컴포넌트)
- PlayerBadgeOrderModal (드래그앤드롭)
- @dnd-kit (배지 순서 변경)

---

## 1. 학급 관리 - 학생 카드

### 📍 위치
**파일**: `src/components/ClassTeamManagementView.jsx`
**컴포넌트**: `SortablePlayerRow` (line 27-163)

### 🔍 현재 UI 구조

**Grid 레이아웃** (line 80):
```jsx
className="grid grid-cols-[auto_auto_1fr_120px_32px] gap-2 ..."
```

**5개 컬럼**:
```
┌────────┬────────┬──────────────────────┬────────────┬──────┐
│ 드래그 │  타순  │ 이름 + 반 + 번호    │  포지션    │ 삭제 │
│   ⠿   │  1번   │ 홍길동 (3-1) #1     │   포수     │  🗑  │
│   ⠿   │  2번   │ 김철수 (3-2) #2     │  1루수     │  🗑  │
│   ⠿   │  3번   │ 이영희 (3-1) #3     │  2루수     │  🗑  │
└────────┴────────┴──────────────────────┴────────────┴──────┘
  auto    auto          1fr              120px      32px
```

**현재 코드** (line 84-111):
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

{/* 이름 + 학년-반 배지 */}
<div className="flex items-center gap-1.5">
  <span className="font-bold text-sm">{player.name}</span>
  {player.className && (
    <Badge variant="outline" className="...">
      {player.className}
    </Badge>
  )}
  <span className="text-[10px] text-muted-foreground">
    #{player.number || index + 1}
  </span>
</div>

{/* 포지션 */}
<div className="w-[120px]">
  <Select value={player.position || ''} onValueChange={handlePositionChange}>
    ...
  </Select>
</div>

{/* 삭제 버튼 */}
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
className="grid grid-cols-[auto_auto_auto_1fr_120px_32px] gap-2 ..."
```

**6개 컬럼 (배지 추가)**:
```
┌────────┬────────┬──────────────┬────────────────────┬────────────┬──────┐
│ 드래그 │  타순  │    배지      │ 이름 + 반 + 번호  │  포지션    │ 삭제 │
│   ⠿   │  1번   │  🏆⚾🎯     │ 홍길동 (3-1) #1   │   포수     │  🗑  │
│   ⠿   │  2번   │  🥇⭐       │ 김철수 (3-2) #2   │  1루수     │  🗑  │
│   ⠿   │  3번   │  🥈         │ 이영희 (3-1) #3   │  2루수     │  🗑  │
└────────┴────────┴──────────────┴────────────────────┴────────────┴──────┘
  auto    auto       auto              1fr            120px      32px
```

---

### 💻 구현 코드

#### 1. Import 추가 (파일 상단)
```jsx
import PlayerBadgeDisplay from './PlayerBadgeDisplay';
```

#### 2. Grid 레이아웃 수정 (line 80)
```jsx
// 변경 전
className="grid grid-cols-[auto_auto_1fr_120px_32px] gap-2 ..."

// 변경 후
className="grid grid-cols-[auto_auto_auto_1fr_120px_32px] gap-2 ..."
```

#### 3. 배지 컬럼 추가 (line 102 이전에 삽입)
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

#### 4. SortablePlayerRowForNewTeam도 동일하게 수정
- line 169부터 시작하는 컴포넌트
- 새 팀 생성 시 사용되는 카드
- 위와 동일한 방식으로 배지 컬럼 추가

---

### 📊 시각적 비교

#### Before:
```
⠿  1번  홍길동 (3-1) #1         포수  🗑
⠿  2번  김철수 (3-2) #2         1루수 🗑
⠿  3번  이영희 (3-1) #3         2루수 🗑
```

#### After:
```
⠿  1번  🏆⚾🎯  홍길동 (3-1) #1  포수  🗑
⠿  2번  🥇⭐    김철수 (3-2) #2  1루수 🗑
⠿  3번  🥈      이영희 (3-1) #3  2루수 🗑
```

---

## 2. 팀 관리 - 라인업 편성

### 📍 위치
**파일**: `src/components/LineupModal.jsx`
**컴포넌트**: `LineupModal` (전체 테이블)

### 🔍 현재 UI 구조

**테이블 헤더** (line 150-156):
```jsx
<thead className="bg-muted">
  <tr>
    <th className="p-3 text-sm font-semibold border w-20">타순</th>
    <th className="p-3 text-sm font-semibold border">선수명</th>
    <th className="p-3 text-sm font-semibold border">수비 포지션</th>
  </tr>
</thead>
```

**테이블 바디** (line 162-169):
```jsx
<tbody>
  {lineup.map((player, idx) => (
    <SortableRow
      key={player.id}
      player={player}
      index={idx}
      onPositionChange={handlePositionChange}
    />
  ))}
</tbody>
```

**SortableRow 컴포넌트** (line 26-62):
```jsx
<tr ref={setNodeRef} style={style} className="...">
  <td className="p-3 text-center font-bold text-lg bg-muted/30">
    {index + 1}
  </td>
  <td className="p-3">
    <div className="flex items-center gap-2">
      <span {...attributes} {...listeners} className="...">⠿</span>
      <span className="font-medium">{player.name}</span>
    </div>
  </td>
  <td className="p-3">
    <Select value={player.position || ''} onValueChange={...}>
      ...
    </Select>
  </td>
</tr>
```

**현재 테이블 모습**:
```
┌──────┬─────────────────────┬──────────────┐
│ 타순 │     선수명          │ 수비 포지션  │
├──────┼─────────────────────┼──────────────┤
│  1   │ ⠿  홍길동          │    포수      │
│  2   │ ⠿  김철수          │   1루수      │
│  3   │ ⠿  이영희          │   2루수      │
└──────┴─────────────────────┴──────────────┘
```

---

### ✨ 개선 후 UI

**새로운 테이블 헤더**:
```jsx
<thead className="bg-muted">
  <tr>
    <th className="p-3 text-sm font-semibold border w-20">타순</th>
    <th className="p-3 text-sm font-semibold border w-24">배지</th>  {/* 새로 추가 */}
    <th className="p-3 text-sm font-semibold border">선수명</th>
    <th className="p-3 text-sm font-semibold border">수비 포지션</th>
  </tr>
</thead>
```

**개선된 테이블 모습**:
```
┌──────┬──────────────┬─────────────────────┬──────────────┐
│ 타순 │    배지      │     선수명          │ 수비 포지션  │
├──────┼──────────────┼─────────────────────┼──────────────┤
│  1   │  🏆⚾🎯     │ ⠿  홍길동          │    포수      │
│  2   │  🥇⭐       │ ⠿  김철수          │   1루수      │
│  3   │  🥈         │ ⠿  이영희          │   2루수      │
└──────┴──────────────┴─────────────────────┴──────────────┘
```

---

### 💻 구현 코드

#### 1. Import 추가 (파일 상단)
```jsx
import PlayerBadgeDisplay from './PlayerBadgeDisplay';
```

#### 2. SortableRow 컴포넌트 수정 (line 26-62)
```jsx
const SortableRow = ({ player, index, onPositionChange }) => {
  // ... (기존 코드 유지)

  return (
    <tr ref={setNodeRef} style={style} className="border-b hover:bg-accent/5">
      {/* 타순 */}
      <td className="p-3 text-center font-bold text-lg bg-muted/30">
        {index + 1}
      </td>

      {/* ✅ 배지 - 새로 추가 */}
      <td className="p-3 text-center">
        <PlayerBadgeDisplay
          player={player}
          maxBadges={3}
          size="sm"
          showEmpty={false}
          showOverflow={true}
        />
      </td>

      {/* 선수명 (기존 코드 유지) */}
      <td className="p-3">
        <div className="flex items-center gap-2">
          <span {...attributes} {...listeners} className="...">⠿</span>
          <span className="font-medium">{player.name}</span>
        </div>
      </td>

      {/* 포지션 (기존 코드 유지) */}
      <td className="p-3">
        <Select value={player.position || ''} onValueChange={...}>
          ...
        </Select>
      </td>
    </tr>
  );
};
```

#### 3. 테이블 헤더 수정 (line 150-156)
```jsx
<thead className="bg-muted">
  <tr>
    <th className="p-3 text-sm font-semibold border w-20">타순</th>
    <th className="p-3 text-sm font-semibold border w-24">배지</th>  {/* 추가 */}
    <th className="p-3 text-sm font-semibold border">선수명</th>
    <th className="p-3 text-sm font-semibold border">수비 포지션</th>
  </tr>
</thead>
```

---

### 📊 시각적 비교

#### Before:
```
타순 | 선수명      | 포지션
1    | ⠿ 홍길동   | 포수
2    | ⠿ 김철수   | 1루수
3    | ⠿ 이영희   | 2루수
```

#### After:
```
타순 | 배지      | 선수명      | 포지션
1    | 🏆⚾🎯   | ⠿ 홍길동   | 포수
2    | 🥇⭐     | ⠿ 김철수   | 1루수
3    | 🥈       | ⠿ 이영희   | 2루수
```

---

## 3. 실시간 경기 - 라인업 테이블

### 📍 위치
**파일**: `src/components/GameScreen.jsx`
**테이블 헤더**: line 2751-2759
**배지 표시**: line 2786-2811

### 🔍 현재 UI 구조

**테이블 헤더**:
```jsx
<thead className="sticky top-0 bg-white z-10 shadow-sm">
  <tr className="border-b-2 border-black">
    <th className="...">타순</th>
    <th className="...">이름</th>
    <th className="...">⚾ 안타</th>
    <th className="...">🏃 득점</th>
    <th className="...">🍪 쿠키</th>
  </tr>
</thead>
```

**배지 표시 코드** (line 2784-2825):
```jsx
<td className="py-2 align-middle text-left pl-2">
  <div className="flex items-center gap-1">
    {/* 배지 영역 (최대 3개) - 현재 직접 구현 */}
    <div className="flex items-center gap-0.5 w-16 flex-shrink-0">
      {player.badges && player.badges.length > 0 ? (
        <>
          {player.badges.slice(0, 3).map((badgeId, idx) => {
            const badge = Object.values(BADGES).find(b => b.id === badgeId);
            return badge ? (
              <span key={idx} title={badge.name} className="text-sm">
                {badge.icon}
              </span>
            ) : null;
          })}
          {player.badges.length > 3 && (
            <span className="text-xs text-gray-500">
              +{player.badges.length - 3}
            </span>
          )}
        </>
      ) : null}
    </div>

    {/* 이름 + 진행도 */}
    <div className="flex flex-col gap-1 flex-1">
      <span
        className="font-bold cursor-pointer underline"
        onClick={() => handlePlayerNameClick(player)}
      >
        {player.name}
      </span>
      <BadgeProgressIndicator progressData={...} />
    </div>

    <button onClick={() => {...}}>교체</button>
  </div>
</td>
```

**현재 테이블 모습**:
```
┌──────┬─────────────────────────┬──────┬──────┬──────┐
│ 타순 │        이름             │ 안타 │ 득점 │ 쿠키 │
├──────┼─────────────────────────┼──────┼──────┼──────┤
│  1   │ 🏆⚾🎯 홍길동          │  3   │  2   │  0   │
│      │ ▓▓▓░░ 다음: 안타왕+2    │      │      │      │
│  2   │ 🥇⭐ 김철수            │  2   │  1   │  1   │
│      │ ▓▓░░░ 다음: 득점왕+1    │      │      │      │
└──────┴─────────────────────────┴──────┴──────┴──────┘
```

---

### ✨ 개선 제안: PlayerBadgeDisplay 사용

**현재**: 배지를 직접 렌더링 (line 2788-2810)
**개선**: PlayerBadgeDisplay 컴포넌트 사용으로 일관성 확보

#### 개선 후 코드
```jsx
<td className="py-2 align-middle text-left pl-2">
  <div className="flex items-center gap-1">
    {/* ✅ PlayerBadgeDisplay 사용 */}
    <div className="w-16 flex-shrink-0">
      <PlayerBadgeDisplay
        player={player}
        maxBadges={3}
        size="sm"
        showEmpty={false}
        showOverflow={true}
      />
    </div>

    {/* 이름 + 진행도 (기존 코드 유지) */}
    <div className="flex flex-col gap-1 flex-1">
      <span
        className="font-bold cursor-pointer underline"
        onClick={() => handlePlayerNameClick(player)}
      >
        {player.name}
      </span>
      <BadgeProgressIndicator progressData={...} />
    </div>

    <button onClick={() => {...}}>교체</button>
  </div>
</td>
```

---

### 💡 개선 효과

**Before (직접 구현)**:
- 배지 렌더링 로직 중복
- 유지보수 어려움
- 스타일 불일치 가능성

**After (컴포넌트 사용)**:
- 코드 간결화
- 일관된 배지 표시
- 배지 순서 자동 동기화
- 유지보수 용이

---

### 📊 UI 변화 (실제 동작은 동일)

```
타순 | 이름                       | 안타 | 득점 | 쿠키
1    | 🏆⚾🎯 홍길동              |  3   |  2   |  0
     | ▓▓▓░░ 다음: 안타왕+2       |      |      |
2    | 🥇⭐ 김철수                |  2   |  1   |  1
     | ▓▓░░░ 다음: 득점왕+1       |      |      |
```

**변경 사항**: 내부 구현만 변경, UI는 동일하게 유지

---

## 4. 경기 통계 - 기록 테이블

### 📍 위치
**파일**: `src/components/StatsView.jsx`
**팀A 테이블**: line 266-304
**팀B 테이블**: line 312-352

### 🔍 현재 UI 구조

**테이블 헤더** (line 267-276):
```jsx
<thead className="bg-blue-50">
  <tr className="font-bold">
    <th className="border-2 border-gray-300 p-4 text-center w-36">이름</th>
    <th className="border-2 border-gray-300 p-4 text-center w-32">포지션</th>
    <th className="border-2 border-gray-300 p-4 text-center w-24">안타</th>
    <th className="border-2 border-gray-300 p-4 text-center w-24">득점</th>
    <th className="border-2 border-gray-300 p-4 text-center w-24">수비</th>
    <th className="border-2 border-gray-300 p-4 text-center w-24">쿠키</th>
    <th className="border-2 border-gray-300 p-4 text-center w-32">획득 배지</th>
  </tr>
</thead>
```

**테이블 바디** (line 278-302):
```jsx
<tbody>
  {game.teamA?.lineup?.sort(...).map((player, idx) => (
    <tr key={idx} className="hover:bg-blue-50/50">
      <td className="...">
        {player.name}
      </td>
      <td className="...">
        {player.position || '-'}
      </td>
      <td className="...">{player.stats?.hits || 0}</td>
      <td className="...">{player.stats?.runs || 0}</td>
      <td className="...">{player.stats?.goodDefense || 0}</td>
      <td className="...">{player.stats?.bonusCookie || 0}</td>
      <td className="...">
        {player.newBadges && player.newBadges.length > 0 ? (
          <div className="flex flex-wrap gap-1 justify-center">
            {player.newBadges.map((badge, bidx) => (
              <span key={bidx} className="text-2xl" title={badge.name}>
                {badge.emoji}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
    </tr>
  ))}
</tbody>
```

**현재 테이블 모습**:
```
┌────────┬────────┬──────┬──────┬──────┬──────┬──────────────┐
│  이름  │ 포지션 │ 안타 │ 득점 │ 수비 │ 쿠키 │  획득 배지   │
├────────┼────────┼──────┼──────┼──────┼──────┼──────────────┤
│ 홍길동 │  포수  │  3   │  2   │  1   │  0   │   🥇⭐     │
│ 김철수 │ 1루수  │  2   │  1   │  0   │  1   │     -        │
│ 이영희 │ 2루수  │  1   │  0   │  2   │  0   │    🥈       │
└────────┴────────┴──────┴──────┴──────┴──────┴──────────────┘
```

---

### ✨ 개선 후 UI

**새로운 테이블 헤더**:
```jsx
<thead className="bg-blue-50">
  <tr className="font-bold">
    <th className="border-2 border-gray-300 p-4 text-center w-24">배지</th>        {/* 추가 */}
    <th className="border-2 border-gray-300 p-4 text-center w-36">이름</th>
    <th className="border-2 border-gray-300 p-4 text-center w-32">포지션</th>
    <th className="border-2 border-gray-300 p-4 text-center w-24">안타</th>
    <th className="border-2 border-gray-300 p-4 text-center w-24">득점</th>
    <th className="border-2 border-gray-300 p-4 text-center w-24">수비</th>
    <th className="border-2 border-gray-300 p-4 text-center w-24">쿠키</th>
    <th className="border-2 border-gray-300 p-4 text-center w-32">획득 배지</th>  {/* 유지 */}
  </tr>
</thead>
```

**개선된 테이블 모습**:
```
┌──────────┬────────┬────────┬──────┬──────┬──────┬──────┬──────────────┐
│   배지   │  이름  │ 포지션 │ 안타 │ 득점 │ 수비 │ 쿠키 │  획득 배지   │
├──────────┼────────┼────────┼──────┼──────┼──────┼──────┼──────────────┤
│ 🏆⚾🎯  │ 홍길동 │  포수  │  3   │  2   │  1   │  0   │   🥇⭐     │
│ 🥇⭐    │ 김철수 │ 1루수  │  2   │  1   │  0   │  1   │     -        │
│ 🥈      │ 이영희 │ 2루수  │  1   │  0   │  2   │  0   │    🥈       │
└──────────┴────────┴────────┴──────┴──────┴──────┴──────┴──────────────┘
```

---

### 💻 구현 코드

#### 1. Import 추가 (파일 상단)
```jsx
import PlayerBadgeDisplay from './PlayerBadgeDisplay';
```

#### 2. 테이블 헤더 수정 (line 267-276)
```jsx
<thead className="bg-blue-50">
  <tr className="font-bold">
    {/* ✅ 배지 컬럼 추가 */}
    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-24">
      배지
    </th>
    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-36">
      이름
    </th>
    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-32">
      포지션
    </th>
    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-24">
      안타
    </th>
    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-24">
      득점
    </th>
    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-24">
      수비
    </th>
    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-24">
      쿠키
    </th>
    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-32">
      획득 배지
    </th>
  </tr>
</thead>
```

#### 3. 테이블 바디 수정 (line 278-302)
```jsx
<tbody>
  {game.teamA?.lineup?.sort(...).map((player, idx) => (
    <tr key={idx} className="hover:bg-blue-50/50">
      {/* ✅ 현재 보유 배지 - 새로 추가 */}
      <td className="border-2 border-gray-300 p-4 text-center">
        <div className="flex justify-center">
          <PlayerBadgeDisplay
            player={player}
            maxBadges={3}
            size="md"
            showEmpty={false}
            showOverflow={true}
          />
        </div>
      </td>

      {/* 이름 (기존 코드 유지) */}
      <td className="border-2 border-gray-300 p-4 text-center font-bold text-gray-900">
        {player.name}
      </td>

      {/* 포지션 (기존 코드 유지) */}
      <td className="border-2 border-gray-300 p-4 text-center font-semibold text-gray-900">
        {player.position || '-'}
      </td>

      {/* 스탯 (기존 코드 유지) */}
      <td className="border-2 border-gray-300 p-4 text-center font-bold text-green-600">
        {player.stats?.hits || 0}
      </td>
      <td className="border-2 border-gray-300 p-4 text-center font-bold text-blue-600">
        {player.stats?.runs || 0}
      </td>
      <td className="border-2 border-gray-300 p-4 text-center font-bold text-amber-600">
        {player.stats?.goodDefense || 0}
      </td>
      <td className="border-2 border-gray-300 p-4 text-center font-bold text-purple-600">
        {player.stats?.bonusCookie || 0}
      </td>

      {/* 이 경기 획득 배지 (기존 코드 유지) */}
      <td className="border-2 border-gray-300 p-4 text-center">
        {player.newBadges && player.newBadges.length > 0 ? (
          <div className="flex flex-wrap gap-1 justify-center">
            {player.newBadges.map((badge, bidx) => (
              <span key={bidx} className="text-2xl" title={badge.name}>
                {badge.emoji}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
    </tr>
  ))}
</tbody>
```

#### 4. 팀B 테이블도 동일하게 수정 (line 312-352)
- 팀A와 동일한 방식으로 배지 컬럼 추가
- 헤더는 `bg-red-50` 사용

---

### 📊 시각적 비교

#### Before:
```
이름   | 포지션 | 안타 | 득점 | 수비 | 쿠키 | 획득 배지
홍길동 |  포수  |  3   |  2   |  1   |  0   |  🥇⭐
김철수 | 1루수  |  2   |  1   |  0   |  1   |   -
```

#### After:
```
배지      | 이름   | 포지션 | 안타 | 득점 | 수비 | 쿠키 | 획득 배지
🏆⚾🎯   | 홍길동 |  포수  |  3   |  2   |  1   |  0   |  🥇⭐
🥇⭐     | 김철수 | 1루수  |  2   |  1   |  0   |  1   |   -
```

---

### 💡 배지 컬럼 설명

**"배지" 컬럼**: 선수가 현재 보유한 배지 (학생이 설정한 순서대로 최대 3개)
**"획득 배지" 컬럼**: 이 경기에서 새로 획득한 배지 (기존 newBadges 데이터)

두 컬럼을 통해:
- **배지**: 선수의 전체 성장 과정 파악
- **획득 배지**: 이 경기의 성과 확인

---

## 5. 학생 페이지 - 배지 컬렉션

### 📍 위치
**파일**: `src/components/StudentView.jsx`
**배지 섹션**: line 367-416

### 🔍 현재 UI 구조

**배지 섹션 코드** (line 367-416):
```jsx
{/* 배지 컬렉션 */}
<div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
  <h2 className="text-3xl font-bold text-gray-800 mb-4 flex items-center gap-2">
    🏅 나의 배지
  </h2>

  {badges.length === 0 ? (
    <div className="text-center py-12 text-gray-500">
      <div className="text-6xl mb-4">🎯</div>
      <p className="text-lg">아직 획득한 배지가 없습니다.</p>
      <p className="text-sm mt-2">열심히 활동해서 배지를 모아보세요!</p>
    </div>
  ) : (
    <div className="grid ...">
      {badges.map((badge, index) => (
        <div key={index} className="...">
          <div className="text-center">
            <span className="text-5xl">{badge.badge?.icon}</span>
            <div className="text-gray-800 font-bold">
              {badge.badge?.name}
            </div>
            <div className="text-gray-500 text-sm">
              📅 {formatDate(badge.earned_at)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )}
</div>
```

**현재 UI 모습**:
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

---

### ✨ 개선 후 UI

**새로운 배지 섹션 구조**:
```jsx
{/* 배지 컬렉션 */}
<div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
  {/* ✅ 헤더 영역: flex 레이아웃으로 변경 */}
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
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
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

**개선된 UI 모습**:
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

#### 1. Import 추가 (파일 상단)
```jsx
import { useState, useEffect } from 'react';  // useState 이미 있음
import PlayerBadgeOrderModal from './PlayerBadgeOrderModal';
import firestoreService from '../services/firestoreService';
```

#### 2. State 추가 (line 24 근처)
```jsx
const [isBadgeOrderModalOpen, setIsBadgeOrderModalOpen] = useState(false);
```

#### 3. 배지 섹션 헤더 수정 (line 367-371)
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

#### 4. PlayerBadgeOrderModal 추가 (line 416 이후)
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
  <StudentGameHistory
    playerId={studentData?.playerId}
    teacherId={studentData?.teacherId}
  />
</div>
```

---

### 🎬 사용자 플로우

#### 1. 학생 페이지 접속
```
🏅 나의 배지    [≡ 배지 순서 변경]

[🏆] [⚾] [🎯] [🥇] [⭐]
```

#### 2. "배지 순서 변경" 버튼 클릭
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

#### 3. 드래그앤드롭으로 순서 변경
```
⚾ 안타왕을 맨 위로 드래그

⠿ ⚾ 안타왕            ← 드래그됨
⠿ 🏆 첫 경기 출전      ← 아래로 이동
⠿ 🎯 득점왕
⠿ 🥇 홈런왕
⠿ ⭐ MVP
```

#### 4. 저장 버튼 클릭
```
Firestore에 저장 →

users/{teacherId}/playerBadges/{playerId}
{
  badges: ['안타왕', '첫경기', '득점왕', '홈런왕', 'MVP']
}
```

#### 5. 즉시 화면 반영
```
🏅 나의 배지    [≡ 배지 순서 변경]

[⚾] [🏆] [🎯] [🥇] [⭐]  ← 순서 변경됨!
```

#### 6. 모든 화면에 자동 적용
- 학급 관리 카드
- 팀 관리 라인업
- 실시간 경기
- 경기 통계

**모든 곳에서 [⚾] [🏆] [🎯] 순서로 표시됨!**

---

### 📊 버튼 디자인 옵션

#### 옵션 1: 아이콘 + 텍스트 (추천)
```jsx
<button className="...">
  <svg>...</svg>
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

## 구현 순서 및 체크리스트

### 🚀 Phase 1: 학급 관리 (1.5시간)

#### ClassTeamManagementView.jsx
- [ ] PlayerBadgeDisplay import
- [ ] SortablePlayerRow 수정
  - [ ] Grid 레이아웃 변경 (`auto` 추가)
  - [ ] 배지 컬럼 추가 (line 102 이전)
  - [ ] PlayerBadgeDisplay 컴포넌트 추가
- [ ] SortablePlayerRowForNewTeam 수정
  - [ ] 동일한 방식으로 배지 컬럼 추가
- [ ] 스타일 조정 및 테스트

---

### 🚀 Phase 2: 팀 관리 라인업 (1시간)

#### LineupModal.jsx
- [ ] PlayerBadgeDisplay import
- [ ] 테이블 헤더 수정
  - [ ] "배지" 컬럼 추가 (w-24)
- [ ] SortableRow 컴포넌트 수정
  - [ ] 배지 셀 추가 (타순과 이름 사이)
  - [ ] PlayerBadgeDisplay 컴포넌트 추가
- [ ] 스타일 조정 및 테스트

---

### 🚀 Phase 3: 경기 통계 (2시간)

#### StatsView.jsx
- [ ] PlayerBadgeDisplay import
- [ ] 팀A 테이블 수정
  - [ ] 테이블 헤더에 "배지" 컬럼 추가 (첫 번째)
  - [ ] 테이블 바디에 배지 셀 추가
  - [ ] PlayerBadgeDisplay 컴포넌트 추가
- [ ] 팀B 테이블 수정
  - [ ] 팀A와 동일하게 배지 컬럼 추가
- [ ] 스타일 조정 (배지 크기 md)
- [ ] 테스트

---

### 🚀 Phase 4: 학생 페이지 (1시간)

#### StudentView.jsx
- [ ] Import 추가
  - [ ] PlayerBadgeOrderModal
  - [ ] firestoreService
- [ ] State 추가
  - [ ] isBadgeOrderModalOpen
- [ ] 배지 섹션 헤더 수정
  - [ ] h2를 flex 레이아웃으로 변경
  - [ ] "배지 순서 변경" 버튼 추가
  - [ ] 조건부 렌더링 (badges.length > 0)
- [ ] PlayerBadgeOrderModal 추가
  - [ ] player 객체 구성
  - [ ] onSave 핸들러 구현
  - [ ] Firestore 저장 로직
  - [ ] 데이터 갱신 (loadStudentData)
- [ ] 스타일 조정 및 테스트

---

### 🚀 Phase 5: 실시간 경기 리팩토링 (선택, 0.5시간)

#### GameScreen.jsx
- [ ] PlayerBadgeDisplay 이미 import되어 있는지 확인
- [ ] 배지 표시 코드 리팩토링 (line 2786-2811)
  - [ ] 직접 구현 코드 제거
  - [ ] PlayerBadgeDisplay 컴포넌트로 교체
- [ ] 동작 테스트 (UI는 동일하게 유지)

---

### 🚀 Phase 6: 통합 테스트 (0.5시간)

#### 기능 테스트
- [ ] StudentView에서 배지 순서 변경
- [ ] 변경된 순서가 StudentView에 즉시 반영
- [ ] ClassTeamManagementView에서 동일한 순서 확인
- [ ] LineupModal에서 동일한 순서 확인
- [ ] GameScreen에서 동일한 순서 확인
- [ ] StatsView에서 동일한 순서 확인

#### 엣지 케이스
- [ ] 배지가 없는 학생 (빈 공간 표시 안 함)
- [ ] 배지가 1-2개만 있는 경우
- [ ] 배지가 3개 초과인 경우 (+N 표시)
- [ ] 긴 이름과 배지 동시 표시

#### 반응형 디자인
- [ ] 모바일에서 모든 컴포넌트 확인
- [ ] 태블릿에서 모든 컴포넌트 확인
- [ ] 데스크톱에서 모든 컴포넌트 확인

#### 스타일 일관성
- [ ] 모든 화면에서 배지 크기 통일
- [ ] 배지 간격 및 정렬 일관성
- [ ] 호버 효과 통일

---

## 📊 구현 진행률 추적

| Phase | 컴포넌트 | 예상 시간 | 실제 시간 | 상태 |
|-------|---------|----------|----------|------|
| 1 | ClassTeamManagementView | 1.5h | - | ⏸️ |
| 2 | LineupModal | 1.0h | - | ⏸️ |
| 3 | StatsView | 2.0h | - | ⏸️ |
| 4 | StudentView | 1.0h | - | ⏸️ |
| 5 | GameScreen (선택) | 0.5h | - | ⏸️ |
| 6 | 통합 테스트 | 0.5h | - | ⏸️ |
| **총계** | | **6.5h** | **-** | ⏸️ |

---

## 🎁 기대 효과

### 1. 가시성 향상
- **Before**: 배지가 일부 화면에서만 보임
- **After**: 모든 학생 카드 UI에서 배지 확인 가능
- **효과**: 배지 시스템의 존재감 증대

### 2. 동기부여 강화
- **Before**: 배지를 확인하려면 특정 화면으로 이동
- **After**: 어느 화면에서든 배지가 보임
- **효과**: 성취감과 수집 욕구 자극

### 3. 개인화 경험
- **Before**: 배지 순서는 시스템이 정한 대로
- **After**: 학생이 직접 배지 순서 커스텀
- **효과**: 자신만의 배지 컬렉션 구성

### 4. 일관성 확보
- **Before**: 화면마다 정보 표시 방식이 다름
- **After**: 모든 화면에서 동일한 방식으로 배지 표시
- **효과**: 직관성 향상, 학습 곡선 감소

### 5. 교육적 효과
- **Before**: 배지가 단순한 보상
- **After**: 배지가 학생의 성장 과정을 시각화
- **효과**: 자기 주도적 학습, 목표 설정 능력 향상

### 6. 관리 편의성
- **Before**: 학생별 배지 현황 파악 어려움
- **After**: 학급 관리 화면에서 한눈에 배지 확인
- **효과**: 개별 학생 관찰 용이, 맞춤형 피드백 가능

---

## 🛠️ 기술 상세

### PlayerBadgeDisplay 컴포넌트

**위치**: `src/components/PlayerBadgeDisplay.jsx`

**Props**:
```typescript
{
  player: {
    badges: string[];  // 배지 ID 배열 (순서대로)
  };
  maxBadges?: number;  // 최대 표시 배지 개수 (기본값: 3)
  size?: 'sm' | 'md' | 'lg';  // 배지 크기
  showEmpty?: boolean;  // 배지 없을 때 빈 공간 표시 여부
  showOverflow?: boolean;  // "+N" 표시 여부
}
```

**사용 예시**:
```jsx
<PlayerBadgeDisplay
  player={player}
  maxBadges={3}
  size="sm"
  showEmpty={false}
  showOverflow={true}
/>
```

---

### PlayerBadgeOrderModal 컴포넌트

**위치**: `src/components/PlayerBadgeOrderModal.jsx`

**Props**:
```typescript
{
  open: boolean;  // 모달 열림 상태
  onOpenChange: (open: boolean) => void;  // 모달 상태 변경 핸들러
  player: {
    id: string;  // 선수 ID
    name: string;  // 선수 이름
    badges: string[];  // 현재 배지 ID 배열
  };
  onSave: (newBadgeOrder: string[]) => void;  // 저장 핸들러
}
```

**사용 예시**:
```jsx
<PlayerBadgeOrderModal
  open={isModalOpen}
  onOpenChange={setIsModalOpen}
  player={{
    id: studentData.playerId,
    name: studentData.name,
    badges: badges.map(b => b.badge_id)
  }}
  onSave={async (newOrder) => {
    await firestoreService.savePlayerBadges(playerId, {
      badges: newOrder
    });
    await loadStudentData();
  }}
/>
```

---

### Firestore 데이터 구조

```
users
└── {teacherId}
    ├── playerBadges
    │   └── {playerId}
    │       ├── playerId: string
    │       ├── badges: string[]  // 배지 ID 배열 (순서 보존!)
    │       └── updatedAt: timestamp
    │
    ├── playerHistory
    │   └── {playerId}
    │       └── games: array
    │           └── newBadges: array  // 해당 경기에서 획득한 배지
    │
    └── games
        └── {gameId}
            ├── teamA
            │   └── lineup: array
            │       └── player
            │           ├── badges: string[]  // 현재 보유 배지
            │           └── newBadges: array  // 이 경기에서 획득한 배지
            └── teamB
                └── lineup: array
```

---

### 배지 순서 자동 동기화 원리

**1. 배지 순서 저장**:
```javascript
// Firestore에 배열로 저장
await firestoreService.savePlayerBadges(playerId, {
  badges: ['id1', 'id2', 'id3']  // 순서 보존
});
```

**2. PlayerBadgeDisplay가 읽음**:
```javascript
const badgeIds = player?.badges || [];  // 배열 순서 그대로
const displayBadges = badgeIds.slice(0, maxBadges);  // 순서 유지
```

**3. 모든 UI에서 동일하게 표시**:
- ClassTeamManagementView: `['id1', 'id2', 'id3']`
- LineupModal: `['id1', 'id2', 'id3']`
- GameScreen: `['id1', 'id2', 'id3']`
- StatsView: `['id1', 'id2', 'id3']`
- StudentView: `['id1', 'id2', 'id3']`

**추가 구현 불필요!** 자동으로 동기화됩니다. ✅

---

## 💡 추가 고려사항

### 성능 최적화
- PlayerBadgeDisplay는 `useMemo` 사용
- Firestore 읽기 최소화 (캐싱)
- 불필요한 리렌더링 방지

### 접근성
- 배지에 `title` 속성 (호버 시 이름 표시)
- 키보드 네비게이션 지원
- 스크린 리더 지원

### 확장성
- 커스텀 배지 추가 시에도 동일한 시스템 적용
- 배지 티어 추가 시 최소 수정
- 배지 애니메이션 추가 가능

### 유지보수
- 재사용 컴포넌트로 코드 중복 최소화
- 명확한 데이터 흐름
- 일관된 코딩 스타일

---

## 📝 마무리

### 핵심 포인트
1. ✅ 기존 컴포넌트 재사용 (PlayerBadgeDisplay, PlayerBadgeOrderModal)
2. ✅ 배지 순서 자동 동기화 (추가 구현 불필요)
3. ✅ 단계별 구현으로 리스크 최소화
4. ✅ 통합 테스트로 품질 보장
5. ✅ 최소 코드 변경으로 최대 효과

### 최종 기대 효과
- 학생들의 배지 시스템 인지도 **향상**
- 성취감과 동기부여 **강화**
- 선생님의 학생 관찰 편의성 **증대**
- 일관된 사용자 경험 **제공**

---

**작성일**: 2025-01-05
**버전**: 3.0 - 전체 UI 통합 가이드
**작성자**: Claude Code (with 이원근 선생님)
**예상 구현 시간**: 6.5시간
