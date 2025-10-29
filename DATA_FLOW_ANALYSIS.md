# 야구 게임 앱 데이터 흐름 상세 분석 보고서

## 1. 데이터 구조 (Firestore Collection Hierarchy)

```
users/
└── userId/
    ├── students/
    │   └── studentId: {
    │       ├── name: string
    │       ├── className: string
    │       ├── playerId: string (studentId와 동일)
    │       ├── studentCode: string (학생 로그인용)
    │       ├── createdAt: timestamp
    │       └── updatedAt: timestamp
    │       }
    │
    ├── teams/
    │   └── teamId: {
    │       ├── name: string
    │       ├── className: string
    │       ├── grade: number
    │       ├── classNum: number
    │       ├── players: [{ id, playerId, name, className, ... }]
    │       ├── createdAt: timestamp
    │       └── updatedAt: timestamp
    │       }
    │
    ├── games/
    │   └── gameId: {
    │       ├── status: 'playing'
    │       ├── teamA: {
    │       │   ├── id, name, className
    │       │   └── lineup: [player_with_stats]
    │       │   }
    │       ├── teamB: { ... }
    │       ├── scoreBoard: {
    │       │   ├── teamA: [이닝별_점수]
    │       │   ├── teamB: [이닝별_점수]
    │       │   ├── teamATotal: number
    │       │   └── teamBTotal: number
    │       │   }
    │       ├── innings: number
    │       ├── createdAt: timestamp
    │       └── updatedAt: timestamp
    │       }
    │
    ├── finishedGames/
    │   └── gameId: {
    │       ├── status: 'finished'
    │       ├── teamA: { lineup: [player_with_final_stats], ... }
    │       ├── teamB: { ... }
    │       ├── scoreBoard: { ... }
    │       ├── finishedAt: timestamp
    │       └── ... (games와 동일한 필드)
    │       }
    │
    ├── playerHistory/
    │   └── playerId: {
    │       ├── playerId: string
    │       ├── playerName: string
    │       ├── games: [{
    │       │   ├── gameId: string
    │       │   ├── date: ISO_string
    │       │   ├── stats: {
    │       │   │   ├── hits: number (총 안타 횟수)
    │       │   │   ├── single: number (1루타)
    │       │   │   ├── double: number (2루타)
    │       │   │   ├── triple: number (3루타)
    │       │   │   ├── homerun: number (홈런)
    │       │   │   ├── runs: number (득점)
    │       │   │   ├── bonusCookie: number
    │       │   │   ├── goodDefense: number
    │       │   │   }
    │       │   ├── team: string (팀 이름)
    │       │   }]
    │       ├── updatedAt: timestamp
    │       }
    │
    ├── playerBadges/
    │   └── playerId: {
    │       ├── playerId: string
    │       ├── badges: [badgeId_list]
    │       ├── updatedAt: timestamp
    │       }
    │
    └── settings/
        └── userSettings: { ... }
```

## 2. 실시간 데이터 흐름

### 2.1 경기 시작 시 데이터 흐름

```
GameScreen 컴포넌트
    │
    ├─→ createGame(gameData)
    │    ├─→ firestoreService.createGame()
    │    │   ├─→ games 컬렉션에 경기 문서 생성
    │    │   │   └─→ status: 'playing'
    │    │   │
    │    │   ├─→ 배치 작업으로 모든 라인업 선수의 playerHistory 초기화
    │    │   │   └─→ playerHistory/{playerId}에 현재 경기 기록 추가
    │    │   │       ├─→ gameId, date, team
    │    │   │       └─→ stats: 초기화된 스탯 (모두 0)
    │    │   │
    │    │   └─→ 배지 즉시 재계산 (병렬 처리)
    │    │       └─→ updatePlayerBadgesFromHistory() × N명
    │    │           ├─→ playerHistory 로드
    │    │           ├─→ calculatePlayerTotalStats() 실행
    │    │           └─→ playerBadges 업데이트
    │    │
    │    └─→ GameContext.createGame() 반영
    │        └─→ setGames() 업데이트
    │
    └─→ subscribeToGame(gameId) 리스너 시작
        └─→ 실시간으로 game 문서 변경 감지
```

### 2.2 경기 진행 중 스탯 업데이트

```
GameScreen (경기 진행)
    │
    ├─→ 타석 기록 (안타, 득점, 수비 등)
    │
    ├─→ updateGame(gameId, {
    │    teamA: { lineup: [updated_player_stats], ... },
    │    teamB: { ... },
    │    scoreBoard: { ... }
    │    })
    │    └─→ firestoreService.updateGame()
    │        └─→ games/{gameId} 문서 업데이트
    │            ├─→ teamA.lineup[].stats 업데이트
    │            ├─→ teamB.lineup[].stats 업데이트
    │            └─→ scoreBoard 업데이트
    │
    ├─→ subscribeToGame() 콜백 실행
    │    └─→ game 상태 변경 감지
    │        └─→ UI 실시간 반영
    │
    └─→ calculateLiveTotalStats(player)
        ├─→ playerHistory[playerId] (메모리) + 현재 경기 stats (RAM)
        ├─→ 실시간 배지 진행도 계산
        ├─→ getNextBadgesProgress() 실행
        └─→ BadgeProgressIndicator 컴포넌트에 표시
```

### 2.3 경기 종료 시 스탯 저장

```
GameScreen (경기 종료)
    │
    ├─→ finishGame(gameId, finalGameData)
    │    └─→ firestoreService.finishGame()
    │        ├─→ Batch 작업 시작
    │        │
    │        ├─→ games/{gameId} 삭제
    │        │   └─→ 진행 중인 경기 목록에서 제거
    │        │
    │        ├─→ finishedGames/{gameId} 생성
    │        │   └─→ 최종 경기 데이터 저장
    │        │       ├─→ 최종 스코어
    │        │       ├─→ 각 선수의 최종 스탯
    │        │       └─→ finishedAt: timestamp
    │        │
    │        ├─→ playerHistory/{playerId} 업데이트 (배치 내)
    │        │   └─→ games[].stats 현재 경기 통계로 업데이트
    │        │       └─→ 기존 히스토리 + 현재 경기 통계 병합
    │        │
    │        └─→ Batch 커밋
    │
    ├─→ 100ms 대기 후 배지 재계산 (비동기)
    │    └─→ updatePlayerBadgesFromHistory() × N명
    │        ├─→ playerHistory 로드
    │        ├─→ calculatePlayerTotalStats() 실행
    │        └─→ playerBadges 업데이트
    │
    └─→ GameContext 업데이트
        ├─→ games 제거
        └─→ finishedGames 추가
```

## 3. 배지 시스템 데이터 흐름

### 3.1 배지 획득 조건 체크 (계층적 구조)

```
배지 시스템 계층:
1. 입문 배지 (BEGINNER) - 1단계
   └─→ first_game, first_hit, first_run, first_defense, first_cookie

2. 숙련 배지 (SKILLED) - 2단계
   └─→ steady, hit_maker, running_machine, defense_master, cookie_collector

3. 마스터 배지 (MASTER) - 3단계
   └─→ iron_man, hit_king, run_king, defense_king, cookie_rich

4. 레전드 배지 (LEGEND) - 4단계
   └─→ immortal, legend_hitter, legend_runner, legend_defender, legend_cookie

5. 특별 배지 (SPECIAL) - 5단계
   └─→ mvp_debut, mvp_hat_trick, mvp_king, superstar, 
       perfect_game, all_rounder, super_rounder, ultra_rounder,
       perfect, hall_of_fame
```

### 3.2 배지 조건 판정 로직

```
updatePlayerBadgesFromHistory(playerId)
    │
    ├─→ playerHistory 로드
    │
    ├─→ calculatePlayerTotalStats(games)
    │   └─→ 누적 통계 계산
    │       ├─→ totalHits: 모든 game.stats.hits 합산
    │       ├─→ totalRuns: 모든 game.stats.runs 합산
    │       ├─→ totalGoodDefense: 모든 game.stats.goodDefense 합산
    │       ├─→ totalBonusCookie: 모든 game.stats.bonusCookie 합산
    │       ├─→ gamesPlayed: games 배열 길이
    │       └─→ mvpCount: 별도 관리 (아직 미구현)
    │
    ├─→ Object.values(BADGES).forEach(badge)
    │   ├─→ badge.condition(totalStats) 실행
    │   │   ├─→ true: 배지 획득 조건 만족
    │   │   └─→ false: 조건 미충족
    │   │
    │   └─→ 조건 만족 배지 → earnedBadges 배열에 추가
    │
    ├─→ playerBadges/{playerId} 업데이트
    │   └─→ badges: [badgeId, badgeId, ...]
    │
    └─→ 완료 로깅
```

### 3.3 배지 진행도 계산 (GameScreen에서 실시간 표시)

```
calculateLiveTotalStats(player)
    │
    ├─→ playerHistory[playerId] 메모리 로드
    │   └─→ GameContext에 이미 로드된 히스토리 사용
    │
    ├─→ 과거 통계 + 현재 경기 스탯 합산
    │   ├─→ pastStats.totalHits += history[].stats.hits
    │   ├─→ pastStats.totalRuns += history[].stats.runs
    │   └─→ ... (다른 통계)
    │
    ├─→ currentStats = player.stats (현재 경기 진행 중 스탯)
    │
    └─→ liveTotalStats = pastStats + currentStats
        └─→ BadgeProgressIndicator에 전달
```

### 3.4 getNextBadgesProgress() - 다음 목표 배지 추천

```
getNextBadgesProgress(stats, currentBadges)
    │
    ├─→ Object.values(BADGES).forEach(badge)
    │   ├─→ currentBadges.includes(badge.id) → 건너뛰기
    │   ├─→ badge.condition(stats) === true → 건너뛰기 (곧 획득될 배지)
    │   └─→ badge.progress 함수 있음? 
    │       ├─→ yes: progressPercent 계산
    │       │   ├─→ progress = badge.progress(stats) [0-100]
    │       │   ├─→ current = calculateCurrent(badge, stats)
    │       │   ├─→ target = calculateTarget(badge, stats)
    │       │   └─→ progressList에 추가
    │       │
    │       └─→ no: progress = 0% (입문 배지)
    │           └─→ progressList에 추가
    │
    ├─→ progressList 진행도 높은 순 정렬
    │
    └─→ 상위 3개 배지 반환 (또는 전체)
```

## 4. 학생 페이지 데이터 조회 흐름

### 4.1 StudentView.jsx - 학생 데이터 로드

```
StudentView 마운트
    │
    ├─→ useEffect(() => {
    │    loadStudentData()
    │    // 1분마다 자동 갱신 (setInterval)
    │    })
    │
    ├─→ loadStudentData()
    │
    └─→ 1️⃣ 개인 통계 조회
        ├─→ playerHistory/{playerId} 쿼리
        │   └─→ where('playerId', '==', studentData.playerId)
        │
        ├─→ historyData.games[] 순회
        │   └─→ 각 game.stats 누적 합산
        │       ├─→ totalStats.total_hits += game.stats.hits
        │       ├─→ totalStats.total_runs += game.stats.runs
        │       └─→ ... (다른 통계)
        │
        └─→ 2️⃣ 진행 중인 경기 추가 (NEW)
            ├─→ games 컬렉션 쿼리
            │   └─→ where('status', '==', 'in_progress')
            │
            ├─→ 각 진행 중인 경기에서 해당 학생 찾기
            │   ├─→ game.teamA.lineup[] 순회
            │   ├─→ game.teamB.lineup[] 순회
            │   └─→ playerId 매칭
            │
            └─→ currentPlayer.stats 발견 시
                └─→ totalStats에 추가 합산
                    ├─→ totalStats.total_hits += currentPlayer.stats.hits
                    └─→ ... (다른 통계)

        ✅ 결과: 과거 경기 + 현재 진행 경기 스탯 통합
```

### 4.2 학생 배지 조회

```
StudentView - 2️⃣ 배지 조회
    │
    ├─→ playerBadges/{playerId} 쿼리
    │   └─→ where('playerId', '==', studentData.playerId)
    │
    ├─→ badgesData.badges [] 로드 (배지 ID 배열)
    │
    ├─→ earnedBadges.map(badgeId)
    │   └─→ BADGES에서 badgeId 찾아 상세 정보 병합
    │       ├─→ badge.name
    │       ├─→ badge.icon
    │       ├─→ badge.tier (등급색상 결정)
    │       └─→ badge.description
    │
    └─→ 등급별 색상 적용
        ├─→ BEGINNER: 회색
        ├─→ SKILLED: 초록색
        ├─→ MASTER: 파란색
        ├─→ SPECIAL: 보라색
        └─→ LEGEND: 노란색
```

### 4.3 학생 반 랭킹 조회

```
StudentView - 3️⃣ 반 랭킹 조회
    │
    ├─→ students 컬렉션 쿼리
    │   └─→ where('className', '==', studentData.className)
    │
    ├─→ 각 학생별 playerHistory 로드
    │   └─→ for (const studentId of classStudentIds)
    │       └─→ playerHistory/{studentId} 쿼리
    │           └─→ games[] 누적 합산
    │
    ├─→ 총점 계산 (안타 + 득점 + 수비 + 쿠키)
    │   └─→ total_points = hits + runs + goodDefense + bonusCookie
    │
    ├─→ 총점 기준 내림차순 정렬
    │
    └─→ 상위 10명 표시
```

## 5. 데이터 서비스 레이어 분석

### 5.1 firestoreService.js의 주요 함수

| 함수명 | 역할 | 데이터 흐름 |
|--------|------|----------|
| `createGame()` | 경기 생성 + playerHistory 초기화 | 배치 작업으로 원자성 보장 |
| `updateGame()` | 경기 진행 중 스탯 업데이트 | 실시간 쓰기 (리스너 감지) |
| `finishGame()` | 경기 종료 + playerHistory 최종 저장 | 배치 작업으로 데이터 일관성 유지 |
| `subscribeToGame()` | 특정 경기 실시간 감시 | onSnapshot() 리스너 |
| `subscribeToGames()` | 모든 경기 실시간 감시 | onSnapshot() 리스너 |
| `getPlayerHistory()` | 선수 히스토리 로드 | 단일 문서 조회 |
| `updatePlayerBadgesFromHistory()` | 배지 재계산 및 저장 | 동기식 계산 + 비동기 저장 |

### 5.2 badgeSystem.js의 핵심 함수

```javascript
// 1. 배지 조건 정의
BADGES = {
  first_game: {
    id: 'first_game',
    condition: (stats) => stats.gamesPlayed >= 1
  },
  steady: {
    id: 'steady',
    condition: (stats) => stats.gamesPlayed >= 5,
    progress: (stats) => Math.min(100, (stats.gamesPlayed / 5) * 100)
  },
  // ... 더 많은 배지
}

// 2. 새 배지 체크
checkNewBadges(playerStats, currentBadges) 
  → 새로 획득한 배지 반환

// 3. 누적 통계 계산
calculatePlayerTotalStats(playerHistory, mvpCount)
  → { totalHits, totalRuns, totalGoodDefense, totalBonusCookie, gamesPlayed, mvpCount }

// 4. 배지 진행도 계산
getBadgeProgress(playerStats, badgeId)
  → 0-100 사이의 진행도 백분율
```

## 6. 실시간 업데이트 메커니즘

### 6.1 GameContext의 리스너 설정

```javascript
useEffect(() => {
  // 1. subscribeToStudents()
  const unsubscribeStudents = firestoreService.subscribeToStudents((data) => {
    setStudents(data);
  });

  // 2. subscribeToTeams()
  const unsubscribeTeams = firestoreService.subscribeToTeams((data) => {
    setTeams(data);
  });

  // 3. subscribeToGames()
  const unsubscribeGames = firestoreService.subscribeToGames((data) => {
    setGames(data);
  });

  // 4. subscribeToFinishedGames()
  const unsubscribeFinishedGames = firestoreService.subscribeToFinishedGames((data) => {
    setFinishedGames(data);
  });

  // 컴포넌트 언마운트 시 정리
  return () => {
    unsubscribeStudents();
    unsubscribeTeams();
    unsubscribeGames();
    unsubscribeFinishedGames();
  };
}, [currentUser]);
```

### 6.2 GameScreen의 게임별 리스너

```javascript
useEffect(() => {
  const unsubscribe = firestoreService.subscribeToGame(gameId, (game) => {
    setGame(game);
    // UI 업데이트
  });

  return () => unsubscribe();
}, [gameId]);
```

## 7. 데이터 동기화 지연 분석

### 7.1 경기 중 스탯 업데이트 지연 요인

| 단계 | 소요 시간 | 원인 |
|------|----------|------|
| updateGame() 호출 | 즉시 | 동기식 함수 호출 |
| Firestore 쓰기 | 100-500ms | 네트워크 지연 |
| subscribeToGame() 콜백 | 100-500ms | Firestore 리스너 감지 지연 |
| UI 렌더링 | 16ms | React 렌더링 주기 |
| **총 지연** | **300-1000ms** | 네트워크 상태에 따라 변동 |

### 7.2 배지 수여 타이밍

```
시점 1: 경기 생성 직후
  └─→ updatePlayerBadgesFromHistory() 즉시 실행
      ├─→ gamesPlayed 1 증가 (첫 출전 배지 가능)
      └─→ playerBadges 업데이트

시점 2: 경기 진행 중
  └─→ calculateLiveTotalStats() 사용 (메모리 기반)
      ├─→ 배지 진행도 실시간 표시
      └─→ Firestore 조회 없음 (빠른 응답)

시점 3: 경기 종료 후
  └─→ 100ms 지연 후 updatePlayerBadgesFromHistory() 실행
      ├─→ playerHistory 최종 저장된 후
      ├─→ 누적 통계 재계산
      └─→ playerBadges 최종 업데이트
```

## 8. 잠재적 문제점 및 개선 필요 사항

### 8.1 데이터 동기화 문제

#### 문제 1: 진행 중인 경기 스탯과 Firestore 불일치
```
원인:
  - GameScreen의 메모리 상태(game) vs Firestore의 game 문서가 비동기로 동기화
  - subscribeToGame()이 지연되면 UI와 Firestore 데이터 불일치

증상:
  - updateGame() 호출 직후 UI에는 반영되지만 Firestore에는 지연
  - 다른 장치에서 조회 시 구 데이터 표시 가능

해결책:
  - Optimistic Update 패턴 적용
  - updateGame() 전에 로컬 상태 업데이트
  - 실패 시 롤백
```

#### 문제 2: StudentView의 1분 갱신 주기
```
현재 구현:
  - 1분마다 자동 갱신 (setInterval 60초)
  - 진행 중인 경기는 매번 재조회

문제점:
  - 경기 진행 중에 1분 대기는 너무 김
  - 학생이 최신 정보 즉시 확인 불가
  - 불필요한 Firestore 쿼리

개선안:
  - 리스너 기반 실시간 동기화 (onSnapshot)
  - 경기 상태 변경 시에만 갱신
  - 학생 권한에 맞는 필터링
```

### 8.2 중복 기록 가능성

#### 문제 1: playerHistory 초기화 중복
```
현재 흐름:
  1. createGame() 호출
  2. Batch 작업으로 playerHistory 초기화
  3. 배치 커밋 전에 유효성 검사 없음

위험:
  - 같은 gameId로 createGame() 중복 호출 가능
  - playerHistory에 중복 게임 레코드 생성
  - 배지 조건 중복 판정

해결책:
  - gameId 유니크 제약 조건 강화
  - 트랜잭션 사용 (Batch 대신)
  - Idempotency key 패턴 적용
```

#### 문제 2: 배지 중복 저장
```
현재:
  - updatePlayerBadgesFromHistory()가 모든 배지를 다시 계산
  - 같은 배지ID를 중복 저장할 가능성 없음 (badges는 배열)

안전:
  - GOOD: badges 배열은 자동으로 중복 제거
  - 하지만 명시적 Set 사용이 더 안전
```

### 8.3 배지 수여 타이밍 이슈

#### 문제 1: MVP 배지 미구현
```
현재:
  - mvpCount가 updatePlayerBadgesFromHistory()에서 계산되지 않음
  - calculatePlayerTotalStats(games, 0) → mvpCount 항상 0

문제점:
  - MVP 관련 배지 (mvp_debut, mvp_hat_trick 등) 획득 불가
  - 특별 배지 달성 불가

필요한 개선:
  - finishedGames에서 MVP 기록 조회
  - playerHistory에 MVP 데이터 통합
  - mvpCount 실시간 계산
```

#### 문제 2: 배지 획득 알림 타이밍
```
현재:
  - GameScreen에서 calculateLiveTotalStats() 사용
  - badge.condition(stats) === true 시 새 배지 감지
  - BadgePopup으로 표시

문제점:
  - 경기 종료 후 배지 재계산까지 100ms 지연
  - PlayerHistory 최종 저장 전에 배지 체크 가능

위험 시나리오:
  1. 경기 종료 (finishGame 호출)
  2. playerHistory 배치 커밋 100ms 대기
  3. 그 사이 updatePlayerBadgesFromHistory() 실행
  4. 구 데이터로 배지 계산 가능

개선:
  - finishGame 콜백 후 배지 재계산
  - 또는 Firestore 서버 함수(Cloud Function)로 원자성 보장
```

### 8.4 데이터 쿼리 성능 이슈

#### 문제 1: StudentView의 N+1 쿼리
```javascript
// 현재 코드:
const classStudentIds = studentsSnapshot.docs.map(doc => doc.id);
for (const studentId of classStudentIds) {
  const historyQuery = query(
    collection(db, 'users', studentData.teacherId, 'playerHistory'),
    where('playerId', '==', studentInfo.playerId || studentId)
  );
  const historySnap = await getDocs(historyQuery); // ← 각 학생마다 쿼리
}
```

문제점:
  - 학생 10명 = 10번의 Firestore 쿼리
  - Firestore 읽기 비용 증가 (Pricing: 1 read = 1 operation)

해결책:
  - Batch 읽기 (getDoc × 10)
  - 또는 Collection Group 쿼리 활용
  - 또는 playerHistory를 캐싱

#### 문제 2: 종료된 경기 무제한 로드
```javascript
// 현재:
subscribeToFinishedGames(callback, limitCount = 20)
  └─→ orderBy('finishedAt', 'desc'), limit(limitCount)
```

개선점:
  - Pagination 구현 (커서 기반)
  - Virtual scrolling (대량 데이터)
  - 클라이언트 필터링 지양
```

### 8.5 보안 및 권한 이슈

#### 문제 1: Firestore Rules 부재
```
현재:
  - /Desktop/필드형게임\ 마스터\ 보드/baseball-firebase/firestore.rules 파일 있음
  - 하지만 내용 확인 필요

잠재 위험:
  - 학생이 다른 학생 배지 수정 가능?
  - 학생이 다른 반 데이터 조회 가능?
  - 공격자가 임의 배지 추가 가능?
```

#### 문제 2: studentCode 검증 부족
```
현재:
  - studentCode로 로그인 가능
  - 하지만 Firestore Rules에서 검증 필요

개선:
  - studentCode는 읽기 전용 필드
  - 학생은 자신의 데이터만 조회
  - 교사는 자신의 학생 데이터만 수정
```

## 9. 데이터 흐름 시각화

### 9.1 경기 생성 → 경기 진행 → 경기 종료 전체 흐름

```
[경기 생성]
    ↓
games/{gameId} 문서 생성 (status: 'playing')
    ↓
playerHistory/{playerId} 초기화 (배치)
    ├─ game record 추가
    └─ stats: { hits: 0, runs: 0, ... }
    ↓
배지 재계산 (병렬)
    └─ playerBadges/{playerId} 업데이트
    ↓
[GameScreen 렌더링]
    ├─ subscribeToGame(gameId) 리스너 활성화
    ├─ calculateLiveTotalStats() 실시간 계산
    └─ BadgeProgressIndicator 표시
    ↓
[경기 진행 (매 타석마다)]
    ├─ updateGame() 호출
    │   ├─ games/{gameId}.teamA.lineup[].stats 업데이트
    │   └─ Firestore 쓰기
    │
    ├─ subscribeToGame() 콜백
    │   └─ UI 업데이트
    │
    └─ calculateLiveTotalStats() 재계산
        └─ BadgeProgressIndicator 업데이트
    ↓
[경기 종료]
    ├─ finishGame() 호출
    │   ├─ games/{gameId} 삭제
    │   ├─ finishedGames/{gameId} 생성
    │   └─ playerHistory/{playerId}.games[].stats 최종 저장 (배치)
    │
    └─ 100ms 대기 후
        └─ updatePlayerBadgesFromHistory() 실행
            └─ playerBadges/{playerId} 최종 업데이트
    ↓
[StudentView 조회]
    ├─ playerHistory 조회
    ├─ 과거 경기 + 진행 중 경기 스탯 합산
    └─ finishedGames 순회 (불필요? 이미 playerHistory에 있음)
```

### 9.2 데이터 저장소별 역할

```
┌─────────────────────────────────────────────────┐
│           Firestore (Persistent)                │
├─────────────────────────────────────────────────┤
│ ✓ games/(진행중)      - 현재 경기 상태           │
│ ✓ finishedGames/     - 종료된 경기 (참고용)     │
│ ✓ playerHistory/     - 선수 누적 히스토리        │
│ ✓ playerBadges/      - 획득한 배지 목록         │
│ ✓ students/          - 학생 기본 정보           │
│ ✓ teams/             - 팀 정보                  │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│       GameContext (React State)                 │
├─────────────────────────────────────────────────┤
│ ✓ games               - Firestore 실시간 미러   │
│ ✓ playerHistory       - 메모리 캐시             │
│   (loadGameHistory()로 온디맨드 로드)           │
│ ✓ teams, students     - Firestore 실시간 미러   │
│ ✓ finishedGames       - Firestore 실시간 미러   │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│      GameScreen Local State (UI)                │
├─────────────────────────────────────────────────┤
│ ✓ game                - subscribeToGame() 미러   │
│ ✓ newBadges           - 새로 획득한 배지         │
│ ✓ expandedHitRow      - UI 확장 상태            │
│ ✓ ... (UI 상태들)                               │
└─────────────────────────────────────────────────┘
```

## 10. 개선 권장사항 (Priority)

### 높음 (High Priority)

1. **MVP 배지 시스템 완성**
   - finishedGames에서 MVP 기록 조회
   - playerHistory에 mvpCount 통합
   - calculatePlayerTotalStats에 mvpCount 포함

2. **StudentView 실시간 동기화**
   - setInterval 제거
   - onSnapshot 리스너로 전환
   - 진행 중인 경기 실시간 반영

3. **Optimistic Update 패턴**
   - updateGame() 직후 로컬 상태 즉시 업데이트
   - Firestore 쓰기 실패 시 롤백

### 중간 (Medium Priority)

4. **배지 획득 타이밍 정확화**
   - Cloud Function으로 배지 자동 수여
   - 경기 종료 시 원자성 보장

5. **N+1 쿼리 개선**
   - StudentView의 반 랭킹 조회 최적화
   - Batch 읽기 또는 Collection Group 활용

6. **Firestore Rules 강화**
   - 학생 권한: 자신의 데이터만 읽기
   - 교사 권한: 자신의 학생 데이터만 읽기/쓰기

### 낮음 (Low Priority)

7. **캐싱 전략**
   - playerHistory 메모리 캐싱
   - 오래된 데이터 주기적 정리

8. **에러 핸들링 강화**
   - Firestore 오류 시 재시도 로직
   - 네트워크 오류 복구

9. **분석 및 모니터링**
   - Firestore 읽기/쓰기 비용 추적
   - 성능 메트릭 수집
