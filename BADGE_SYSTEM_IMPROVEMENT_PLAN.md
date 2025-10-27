# 🎯 배지 시스템 완전 개선 계획

## 📋 문제 상황
- **현재**: 경기 시작 후 배지 모달이 4초 뒤에 표시됨
- **원인**: 2번의 중복 로드 + 2초 대기 + Firestore API 호출 80회 (16명 기준)
- **목표**: 즉시 배지 모달 표시 (0.5초 이내) + API 호출 최소화

---

## 🔧 수정할 파일 및 변경 내역

### **1. GameContext.jsx** ([src/contexts/GameContext.jsx](src/contexts/GameContext.jsx))

#### **변경 1-1: playerHistory state 추가**
```javascript
// Line 38 다음에 추가
const [playerHistory, setPlayerHistory] = useState({}); // { playerId: [game1, game2, ...] }
```

#### **변경 1-2: loadGameHistory 함수 추가**
```javascript
// Line 302 다음에 추가
const loadGameHistory = async (gameId) => {
  try {
    // 경기의 모든 선수 ID 추출
    const game = games.find(g => g.id === gameId);
    if (!game) return;

    const allPlayerIds = [
      ...(game.teamA?.lineup || []).map(p => p.id || p.playerId),
      ...(game.teamB?.lineup || []).map(p => p.id || p.playerId)
    ].filter(Boolean);

    console.log(`🔄 ${allPlayerIds.length}명의 히스토리 로드 시작...`);

    // 병렬로 모든 선수의 히스토리 로드
    const historyMap = {};
    await Promise.all(
      allPlayerIds.map(async (id) => {
        const { games: history } = await firestoreService.getPlayerHistory(id);
        historyMap[id] = history || [];
      })
    );

    setPlayerHistory(historyMap);
    console.log('✅ 히스토리 로드 완료');
    return historyMap;
  } catch (error) {
    console.error('❌ 히스토리 로드 실패:', error);
    return {};
  }
};
```

#### **변경 1-3: Context value에 추가**
```javascript
// Line 318-352 수정
const value = {
  // 기존 상태들...
  playerHistory,        // ✅ 추가

  // 기존 함수들...
  loadGameHistory,      // ✅ 추가
};
```

---

### **2. firestoreService.js** ([src/services/firestoreService.js](src/services/firestoreService.js))

#### **변경 2-1: createGame에서 배지 재계산 대기**
```javascript
// Line 461-480 수정 (setTimeout 제거)
// 배지 재계산을 await으로 대기 (비동기 제거)
const playerIds = allPlayers.map(p => p.playerId || p.id).filter(Boolean);
console.log(`🔄 ${playerIds.length}명의 배지 재계산 시작...`);

await Promise.all(
  playerIds.map(playerId =>
    this.updatePlayerBadgesFromHistory(playerId).catch(err => {
      console.warn(`⚠️ ${playerId} 배지 재계산 실패:`, err);
    })
  )
);

console.log('✅ 배지 재계산 완료');
return newGameRef.id;
```

---

### **3. GameScreen.jsx** ([src/components/GameScreen.jsx](src/components/GameScreen.jsx))

#### **변경 3-1: useGame에서 playerHistory 가져오기**
```javascript
// Line 124 수정
const { games, updateGame, students, teams, playerHistory, loadGameHistory } = useGame();
```

#### **변경 3-2: calculateLiveTotalStats를 동기 함수로 변경**
```javascript
// Line 185-236 수정
/**
 * 실시간 총 통계 계산 함수 (동기)
 * Context의 playerHistory에서 읽어옴 (Firestore 호출 없음)
 */
const calculateLiveTotalStats = (player) => {
  try {
    const playerId = player.id || player.playerId;
    if (!playerId) return null;

    // Context에서 히스토리 가져오기 (이미 메모리에 있음)
    const history = playerHistory[playerId] || [];

    // 과거 통계 계산
    const pastStats = {
      totalHits: 0,
      totalRuns: 0,
      totalGoodDefense: 0,
      totalBonusCookie: 0,
      gamesPlayed: history.length,  // ⭐ +1 제거! (이미 현재 경기가 history에 포함됨)
      mvpCount: 0
    };

    history.forEach(game => {
      const stats = game.stats || {};
      pastStats.totalHits += stats.hits || 0;
      pastStats.totalRuns += stats.runs || 0;
      pastStats.totalGoodDefense += stats.goodDefense || 0;
      pastStats.totalBonusCookie += stats.bonusCookie || 0;
      if (game.isMVP) pastStats.mvpCount++;
    });

    // 현재 경기 통계
    const currentStats = player.stats || {};

    // 총 통계 = 과거 + 현재
    const totalStats = {
      totalHits: pastStats.totalHits + (currentStats.hits || 0),
      totalRuns: pastStats.totalRuns + (currentStats.runs || 0),
      totalGoodDefense: pastStats.totalGoodDefense + (currentStats.goodDefense || 0),
      totalBonusCookie: pastStats.totalBonusCookie + (currentStats.bonusCookie || 0),
      gamesPlayed: pastStats.gamesPlayed,  // ⭐ +1 없음!
      mvpCount: pastStats.mvpCount
    };

    totalStats.totalPoints =
      totalStats.totalHits +
      totalStats.totalRuns +
      totalStats.totalGoodDefense +
      totalStats.totalBonusCookie;

    return totalStats;
  } catch (error) {
    console.error('❌ totalStats 계산 실패:', error);
    return null;
  }
};
```

#### **변경 3-3: loadBadgesForTeam 간소화**
```javascript
// Line 247-271 수정
// totalStats 계산 제거 (배지만 로드)
const loadBadgesForTeam = async (team) => {
  if (!team || !team.lineup) return team;

  const lineupWithBadges = await Promise.all(
    team.lineup.map(async (player) => {
      if (!player.id) return player;

      try {
        const badgeData = await firestoreService.getPlayerBadges(player.id);
        return {
          ...player,
          badges: badgeData.badges || []
        };
      } catch (error) {
        console.warn(`⚠️ ${player.name} 배지 로드 실패`);
        return { ...player, badges: [] };
      }
    })
  );

  return { ...team, lineup: lineupWithBadges };
};
```

#### **변경 3-4: 경기 로드 및 즉시 배지 체크**
```javascript
// Line 238-360 완전 재작성
useEffect(() => {
  let badgeCheckInterval;

  const loadGameWithBadges = async () => {
    const currentGame = games.find(g => g.id === gameId);
    if (!currentGame) return;

    try {
      // 1. 히스토리 먼저 로드 (메모리에 캐싱)
      await loadGameHistory(gameId);

      // 2. 배지 로드
      const [teamAWithBadges, teamBWithBadges] = await Promise.all([
        loadBadgesForTeam(currentGame.teamA),
        loadBadgesForTeam(currentGame.teamB)
      ]);

      setGame({
        ...currentGame,
        teamA: teamAWithBadges,
        teamB: teamBWithBadges
      });

      console.log('✅ 게임 및 배지 로드 완료');

      // 3. 즉시 배지 체크 (2초 대기 제거!)
      if (!hasShownInitialBadgesRef.current) {
        const allNewBadges = [];

        // 팀A 배지 체크
        teamAWithBadges.lineup.forEach(player => {
          const playerBadgeIds = player.badges || [];

          playerBadgeIds.forEach(badgeId => {
            const badge = Object.values(BADGES).find(b => b.id === badgeId);
            if (badge) {
              allNewBadges.push({
                ...badge,
                playerName: player.name
              });
            }
          });
        });

        // 팀B 배지 체크
        teamBWithBadges.lineup.forEach(player => {
          const playerBadgeIds = player.badges || [];

          playerBadgeIds.forEach(badgeId => {
            const badge = Object.values(BADGES).find(b => b.id === badgeId);
            if (badge) {
              allNewBadges.push({
                ...badge,
                playerName: player.name
              });
            }
          });
        });

        // 4. 즉시 모달 표시
        if (allNewBadges.length > 0) {
          console.log('🎉 새 배지 발견:', allNewBadges);
          setNewBadges(allNewBadges);
          setShowBadgePopup(true);
          hasShownInitialBadgesRef.current = true;

          // 5초 후 자동 닫기
          if (badgePopupTimerRef.current) {
            clearTimeout(badgePopupTimerRef.current);
          }
          badgePopupTimerRef.current = setTimeout(() => {
            setShowBadgePopup(false);
            setNewBadges([]);
          }, 5000);
        }
      }

      // 5. 이후 주기적 배지 체크 (경기 중 배지 획득)
      badgeCheckInterval = setInterval(async () => {
        // 기존 로직 유지...
      }, 3000);

    } catch (error) {
      console.error('❌ 게임 로드 실패:', error);
    }
  };

  loadGameWithBadges();

  return () => {
    if (badgeCheckInterval) clearInterval(badgeCheckInterval);
    if (badgePopupTimerRef.current) clearTimeout(badgePopupTimerRef.current);
  };
}, [gameId, games, loadGameHistory]);
```

#### **변경 3-5: 라인업 테이블 렌더링 시 totalStats 계산**
```javascript
// Line 2189-2191에서 player.totalStats 사용 시
// calculateLiveTotalStats(player) 즉시 호출하여 사용

// 예시:
const totalStats = calculateLiveTotalStats(player);
<BadgeProgressIndicator
  progressData={getNextBadgesProgress(
    totalStats || {},
    player.badges || [],
    BADGES,
    true
  )}
/>
```

---

## 📊 예상 효과

| 항목 | 현재 (Before) | 개선 후 (After) | 개선율 |
|-----|--------------|----------------|--------|
| **Firestore Reads (16명)** | 80 reads | 32 reads | **60% 감소** |
| **배지 모달 표시 시간** | ~4초 | ~0.5초 | **87% 단축** |
| **중복 로드** | 2번 | 0번 | **100% 제거** |
| **gamesPlayed 정확도** | ❌ 잘못됨 (+1 중복) | ✅ 정확함 | **버그 수정** |

---

## ✅ 체크리스트

### Phase 1: Context 개선
- [ ] GameContext에 `playerHistory` state 추가
- [ ] `loadGameHistory()` 함수 구현
- [ ] Context value에 추가

### Phase 2: firestoreService 개선
- [ ] createGame에서 setTimeout 제거
- [ ] 배지 재계산을 await으로 대기

### Phase 3: GameScreen 개선
- [ ] `calculateLiveTotalStats` 동기 함수로 변경
- [ ] `gamesPlayed` 계산 수정 (+1 제거)
- [ ] `loadBadgesForTeam` 간소화
- [ ] 2초 setTimeout 완전 제거
- [ ] 즉시 배지 체크 로직 추가

### Phase 4: 테스트
- [ ] 새 경기 시작 → 배지 모달 즉시 표시 확인
- [ ] "첫 출전" 배지 프로그레스바 0/1 → 1/1 확인
- [ ] 다음 배지 "꾸준함 0/5" 표시 확인
- [ ] 배지 도감에 반영 확인
- [ ] Firestore 읽기 횟수 확인 (Chrome DevTools)

---

## 🎯 최종 동작 시나리오

### **김철수 (첫 경기 출전)**

1. **T=0ms**: 경기 생성 버튼 클릭
2. **T=100-800ms**: Firestore 배치 작업 + 배지 재계산 (대기)
3. **T=800ms**: createGame() 완료, gameId 반환
4. **T=800-1200ms**: GameScreen 마운트
   - loadGameHistory() 실행 (16명 히스토리 로드)
   - loadBadgesForTeam() 실행 (배지 로드)
5. **T=1200ms**: 🎉 **배지 축하 모달 즉시 표시!**
   - "김철수님이 🎽 첫 출전 배지를 획득하셨습니다!"
6. **라인업 테이블**:
   - 이름 옆에 🎽 아이콘 표시
   - 프로그레스바: "경기 참여 1/1 ✅" "꾸준함 0/5"
7. **배지 도감**:
   - 🎽 첫 출전 (획득) - 컬러 표시
   - 기타 배지들 (미획득) - 회색 표시

---

## 🚨 주의사항

1. **Context 의존성**: `loadGameHistory`는 `games` 배열에 의존하므로 useEffect 의존성에 추가 불필요
2. **메모리 관리**: playerHistory는 경기 종료 시 클리어하지 않음 (다음 경기에서 재사용 가능)
3. **에러 처리**: 히스토리 로드 실패 시 빈 배열로 fallback
4. **기존 로직 유지**: Firestore 실시간 저장 로직은 변경하지 않음
