# 야구 게임 앱 데이터 흐름 - 빠른 가이드

## 한눈에 보는 데이터 구조

```
학생 정보
├─ students/{studentId}
│  ├─ name, className, playerId (=studentId)
│  └─ studentCode (학생 로그인용)
│
선수 누적 기록 (핵심!)
├─ playerHistory/{playerId}
│  └─ games: [
│       { gameId, date, team, stats: { hits, runs, defense, cookie } }
│     ]
│
배지 보유 목록
├─ playerBadges/{playerId}
│  └─ badges: ['first_game', 'steady', 'hit_maker', ...]
│
경기 데이터
├─ games/{gameId}           ← 진행 중 경기
│  ├─ status: 'playing'
│  └─ teamA/B: { lineup: [{ name, stats: { ... } }], ... }
│
└─ finishedGames/{gameId}    ← 종료된 경기 (참고용)
   ├─ status: 'finished'
   └─ finishedAt: timestamp
```

## 경기 진행 흐름과 데이터 동기화

### 1단계: 경기 생성

```javascript
createGame(gameData)
  │
  ├─→ Firestore: games/{gameId} 생성 (status: 'playing')
  ├─→ Firestore: playerHistory/{각_playerId} 초기화
  │   └─→ 새로운 game record 추가 (stats: 0)
  │
  └─→ 배지 재계산 (병렬 처리)
      └─→ Firestore: playerBadges/{playerId} 업데이트
          └─→ first_game 배지 자동 수여 가능
```

**결과**: games 컬렉션에 경기 생성 → StudentView에서 진행 중 경기 감지 가능

---

### 2단계: 경기 진행 (매 타석마다)

```
교사가 타석 기록 입력
  │
  ├─→ GameScreen: 메모리 상태 업데이트 (즉시)
  │   └─→ game.teamA.lineup[playerIdx].stats.hits++
  │
  ├─→ Firestore: games/{gameId} 업데이트 (100-500ms)
  │
  └─→ Firestore 리스너: subscribeToGame() 콜백 (100-500ms)
      └─→ GameScreen: game 상태 재동기화
          └─→ UI 업데이트 (16ms)

┌─────────────────────────────────────────┐
│ 실시간 배지 진행도 계산                    │
├─────────────────────────────────────────┤
│ calculateLiveTotalStats(player)          │
│   = playerHistory[playerId] 기존 기록   │
│   + player.stats 현재 경기 스탯           │
│                                         │
│ 예: steady 배지 (5경기 필요)             │
│   gamesPlayed = 3 (기존) + 1 (현재진행) │
│             = 4 → 80% 진행도            │
└─────────────────────────────────────────┘
```

**특징**:
- GameScreen의 로컬 상태 → 즉시 반영 (빠름)
- Firestore 리스너 → 약 200-500ms 지연 (정상)
- StudentView는 1분마다 갱신 → 실시간 아님 (문제!)

---

### 3단계: 경기 종료

```javascript
finishGame(gameId, finalGameData)
  │
  ├─→ Batch 작업 시작
  │
  ├─→ Firestore: games/{gameId} 삭제
  │   └─→ 진행 중인 경기 목록에서 제거
  │
  ├─→ Firestore: finishedGames/{gameId} 생성
  │   └─→ 최종 스코어, 선수별 최종 스탯 저장
  │
  ├─→ Firestore: playerHistory/{playerId} 업데이트 (배치 내)
  │   └─→ games[].stats 현재 경기 최종 통계로 업데이트
  │
  └─→ Batch 커밋
      │
      └─→ 100ms 대기 후 배지 재계산 (비동기)
          └─→ updatePlayerBadgesFromHistory()
              ├─→ playerHistory 로드
              ├─→ 누적 통계 재계산
              └─→ playerBadges/{playerId} 최종 업데이트
                  └─→ 새로운 배지 수여 (예: hit_king)
```

**주의**: 경기 종료 후 100ms 지연 있음 → 배지 수여가 즉시 아님

---

## 배지 획득 로직

### 배지 5가지 등급

```
🥉 입문 (BEGINNER)
  first_game (첫 출전)
  first_hit (첫 안타)
  first_run (첫 득점)
  first_defense (첫 수비)
  first_cookie (첫 쿠키)

🥈 숙련 (SKILLED)
  steady (5경기 출전)
  hit_maker (안타 10개)
  running_machine (득점 10점)
  defense_master (수비 10회)
  cookie_collector (쿠키 10개)

🥇 마스터 (MASTER)
  iron_man (10경기 출전)
  hit_king (안타 30개)
  run_king (득점 30점)
  defense_king (수비 30회)
  cookie_rich (쿠키 30개)

👑 레전드 (LEGEND)
  immortal (30경기 출전)
  legend_hitter (안타 50개)
  legend_runner (득점 50점)
  legend_defender (수비 50회)
  legend_cookie (쿠키 50개)

⭐ 특별 (SPECIAL)
  mvp_debut (MVP 1회)
  mvp_hat_trick (MVP 3회)
  superstar (MVP 10회)
  perfect_game (한 경기에서 안타+득점+수비 모두)
  all_rounder (모든 기록 5 이상)
  ... (더 있음)
```

### 배지 진행도 표시 로직

```
GameScreen에서 실시간으로 계산:

1. 획득한 배지 제외
2. 조건 미충족인 배지만 대상
3. progress 함수 있으면 진행도 계산

예: hit_maker 배지 (안타 10개 필요)
  현재 누적: hits = 7
  진행도: (7/10) × 100 = 70%
  
  "🎯 안타 메이커 (70% 진행도)"
  ████████░░ 7/10
```

---

## StudentView의 데이터 조회

### 현재 구현 (문제점 있음)

```javascript
loadStudentData() {
  // 1️⃣ playerHistory 조회 (과거 경기만)
  const historyData = await getDocs(
    query(playerHistory, where('playerId', '==', studentData.playerId))
  );
  
  // 2️⃣ 진행 중인 경기 추가 (NEW!)
  const gamesData = await getDocs(
    query(games, where('status', '==', 'in_progress'))
  );
  
  // 3️⃣ 배지 조회
  const badgesData = await getDocs(
    query(playerBadges, where('playerId', '==', studentData.playerId))
  );
  
  // 4️⃣ 반 랭킹 (N+1 쿼리 문제!)
  for (const studentId of classStudentIds) {
    const history = await getDocs(...); // ← 학생마다 쿼리!
  }
}

// ⚠️ 1분마다 자동 갱신 (setInterval)
```

### 문제점

```
1. 학생 10명 × 1번의 쿼리 = 10번 조회 (N+1 문제)
2. 1분 갱신은 너무 느림 (진행 중 경기 반영 안 됨)
3. Firestore 읽기 비용 낭비
```

---

## 데이터 동기화 타이밍

### 경기 중 스탯 업데이트

```
updateGame() 호출
    │
    ├─→ [0ms]     함수 호출
    ├─→ [50ms]    네트워크 전송 중
    ├─→ [100-500ms] Firestore 쓰기 완료
    │
    └─→ [200-600ms] subscribeToGame() 콜백
        └─→ setGame() 업데이트
            └─→ [616ms] UI 렌더링 완료

총 지연: 약 300-1000ms (네트워크 상태에 따라)

⚠️ 이 사이에 교사가 또 다른 타석을 입력하면?
   → 경기 상태 불일치 가능 (하지만 배치 마지막에 해결)
```

### 배지 수여 타이밍

```
시나리오: "hit_maker 배지" 획득 (안타 10개)

1️⃣ 경기 1-9 (안타 9개 기록)
   playerHistory: hits = 9

2️⃣ 경기 10 시작
   calculateLiveTotalStats()
   = playerHistory (hits: 9)
   + 현재 경기 (hits: 0)
   = 9 → 아직 배지 미획득

3️⃣ 경기 10 중 10번째 안타 기록
   calculateLiveTotalStats()
   = playerHistory (hits: 9)
   + 현재 경기 (hits: 1)
   = 10 → 배지 진행도 100% ✓

4️⃣ 경기 10 종료
   finishGame() → playerHistory 최종 저장
   100ms 대기
   updatePlayerBadgesFromHistory()
   → playerBadges 업데이트
   → hit_maker 배지 정식 수여 ✓

📌 중요: 경기 진행 중 UI에는 "배지 진행도 100%" 표시
         경기 종료 후 정식으로 배지 획득
```

---

## 주요 함수 역할

### firestoreService.js

```javascript
// 경기 관리
createGame(gameData)          // 경기 생성 + playerHistory 초기화
updateGame(gameId, updates)   // 경기 진행 중 스탯 업데이트
finishGame(gameId, data)      // 경기 종료 + playerHistory 최종 저장

// 리스너 (실시간 동기화)
subscribeToGame(gameId, cb)   // 특정 경기 감시
subscribeToGames(cb)          // 모든 경기 감시

// 배지 계산
updatePlayerBadgesFromHistory(playerId)
  → playerHistory 로드
  → calculatePlayerTotalStats() 실행
  → 모든 BADGES 조건 체크
  → playerBadges 업데이트
```

### badgeSystem.js

```javascript
// 배지 정의
BADGES = {
  first_game: { condition: (stats) => stats.gamesPlayed >= 1 },
  steady: {
    condition: (stats) => stats.gamesPlayed >= 5,
    progress: (stats) => (stats.gamesPlayed / 5) * 100
  },
  // ... 더 많음
}

// 배지 계산
calculatePlayerTotalStats(games, mvpCount)
  → { totalHits, totalRuns, totalGoodDefense, totalBonusCookie, 
      gamesPlayed, mvpCount }

getNextBadgesProgress(stats, currentBadges)
  → 획득 가능한 배지의 진행도 배열
  → 진행도 높은 순 정렬
```

---

## 가장 중요한 데이터 경로

### "선수가 안타를 쳤을 때" 데이터 흐름

```
1. 교사가 GameScreen에서 "1루타" 버튼 클릭
   ↓
2. 메모리 상태 업데이트 (즉시)
   player.stats.hits++ 
   player.stats.single++
   ↓
3. Firestore에 쓰기 (비동기)
   updateGame() → games/{gameId}.teamA.lineup[].stats
   ↓
4. Firestore 리스너 감지 (200-500ms 후)
   subscribeToGame() 콜백
   → setGame() 업데이트
   ↓
5. 배지 진행도 계산 (메모리 기반, 빠름)
   calculateLiveTotalStats(player)
   = playerHistory[playerId] + player.stats
   → BadgeProgressIndicator 업데이트
   ↓
6. 경기 종료 시 (경기 후)
   finishGame() → playerHistory 최종 저장
   ↓
7. 배지 재계산 (경기 종료 후 100ms)
   updatePlayerBadgesFromHistory()
   → playerBadges 최종 업데이트
```

### "학생이 자신의 성적을 볼 때" 데이터 흐름

```
1. 학생이 StudentView 접속
   ↓
2. playerHistory/{playerId} 조회 (과거 경기)
   ↓
3. 진행 중인 games 조회 (현재 경기)
   → 자신의 현재 스탯 찾기
   ↓
4. playerHistory + games 스탯 합산
   = 최신 누적 통계 표시
   ↓
5. playerBadges/{playerId} 조회
   ↓
6. 배지 상세 정보 병합
   = 배지 컬렉션 표시
```

---

## 문제점 요약

### 🔴 높은 우선순위

1. **MVP 배지 작동 안 함**
   - mvpCount를 계산하지 않음
   - MVP 관련 배지 획득 불가

2. **StudentView 1분 갱신 너무 느림**
   - 진행 중 경기 실시간 반영 안 됨
   - 학생이 최신 정보 못 봄

3. **N+1 쿼리 (반 랭킹)**
   - 학생 10명 = 10번 쿼리
   - Firestore 비용 낭비

### 🟡 중간 우선순위

4. **배지 타이밍 정확성**
   - 경기 종료 후 100ms 지연
   - Cloud Function으로 원자성 보장 필요

5. **Optimistic Update 부재**
   - updateGame() 직후 네트워크 지연
   - 다른 기기에서 구 데이터 보일 수 있음

---

## 개선 방안 (한 줄 요약)

| 문제 | 해결책 |
|------|--------|
| MVP 배지 작동 안 함 | finishedGames에서 MVP 기록 조회 + playerHistory에 통합 |
| 1분 갱신 느림 | setInterval 제거 → onSnapshot 리스너 적용 |
| N+1 쿼리 | Batch 읽기 또는 Collection Group 쿼리 사용 |
| 배지 타이밍 지연 | Cloud Function으로 배지 자동 수여 |
| Firestore 읽기 오버 | 캐싱 + Pagination 구현 |
| 보안 부실 | Firestore Rules 강화 |

---

## 참고: 데이터 저장소별 역할

```
Firestore (영구 저장소)
  ├─ games/{gameId}        ← 현재 경기 진행 상태 (실시간)
  ├─ playerHistory/{id}    ← 선수 누적 기록 (중요!)
  ├─ playerBadges/{id}     ← 배지 보유 목록 (중요!)
  └─ finishedGames/{id}    ← 종료된 경기 (참고용)

GameContext (메모리 캐시)
  ├─ games[]                ← Firestore 실시간 미러
  ├─ playerHistory{}        ← 온디맨드 로드
  └─ teams[], students[]    ← Firestore 실시간 미러

GameScreen Local (UI 상태)
  ├─ game                   ← subscribeToGame() 미러
  ├─ newBadges[]            ← 새로 획득한 배지
  └─ ... (UI 상태들)
```

