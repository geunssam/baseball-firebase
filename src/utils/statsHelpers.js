/**
 * statsHelpers.js
 *
 * 통합 분석 모달에서 사용하는 통계 도우미 함수 모음
 */

/**
 * 선수 총점 계산 (1점 체계)
 * @param {Object} stats - { hits, runs, goodDefense, bonusCookie }
 * @returns {number} 총점
 */
export function calculatePlayerPoints(stats) {
  if (!stats) return 0;

  return (
    (stats.hits || 0) +
    (stats.runs || 0) +
    (stats.goodDefense || 0) +
    (stats.bonusCookie || 0)
  );
}

/**
 * 반별 점수 집계 (선택된 경기들)
 * @param {Array} selectedGames - 선택된 경기 목록
 * @param {Array} teams - 전체 팀 목록 (className 매핑용)
 * @returns {Object} { className: { totalScore, inningScores[], games[] } }
 */
export function aggregateClassScores(selectedGames, teams) {
  const classScores = {};

  // 최대 이닝 수 계산 (다양한 이닝 수 대응)
  const maxInnings = selectedGames.length > 0
    ? Math.max(...selectedGames.map(g => g.innings || 3))
    : 3;

  selectedGames.forEach(game => {
    // 현재 teams에서 className 가져오기 (우선순위)
    const currentTeamA = teams.find(t => t.id === game.teamAId);
    const currentTeamB = teams.find(t => t.id === game.teamBId);

    const classA = currentTeamA?.className || game.teamA?.className || game.teamA?.name || 'Unknown';
    const classB = currentTeamB?.className || game.teamB?.className || game.teamB?.name || 'Unknown';

    // 초기화
    if (!classScores[classA]) {
      classScores[classA] = {
        totalScore: 0,
        games: [],
        inningScores: Array(maxInnings).fill(0)
      };
    }
    if (!classScores[classB]) {
      classScores[classB] = {
        totalScore: 0,
        games: [],
        inningScores: Array(maxInnings).fill(0)
      };
    }

    // 이닝별 점수 합산 (범위 체크) - scoreBoard (대문자 B) 사용
    const teamAScores = game.scoreBoard?.teamA || [];
    const teamBScores = game.scoreBoard?.teamB || [];

    teamAScores.forEach((score, idx) => {
      if (idx < maxInnings) {
        classScores[classA].inningScores[idx] += score;
      }
    });

    teamBScores.forEach((score, idx) => {
      if (idx < maxInnings) {
        classScores[classB].inningScores[idx] += score;
      }
    });

    // 총점 합산
    const scoreA = teamAScores.reduce((a, b) => a + b, 0);
    const scoreB = teamBScores.reduce((a, b) => a + b, 0);

    classScores[classA].totalScore += scoreA;
    classScores[classB].totalScore += scoreB;

    classScores[classA].games.push(game.id);
    classScores[classB].games.push(game.id);
  });

  return classScores;
}

/**
 * 선수별 통계 집계 (간소화 버전 - 통합 분석 모달 전용)
 * @param {Array} selectedGames - 선택된 경기 목록
 * @param {Array} teams - 전체 팀 목록 (className 매핑용)
 * @param {Array} students - 전체 학생 목록 (정확한 className 조회용)
 * @returns {Object} { playerId: { name, className, teamNames, hits, runs, ..., gamesPlayed } }
 */
export function aggregatePlayerStats(selectedGames, teams = [], students = []) {
  const playerStatsMap = {};

  console.log('🔍 [aggregatePlayerStats] 시작');
  console.log('  - teams 배열:', teams.length, '개');
  console.log('  - students 배열:', students.length, '개');
  console.log('  - 선택된 경기 수:', selectedGames.length);

  selectedGames.forEach((game, gameIdx) => {
    console.log(`\n📋 경기 ${gameIdx + 1}:`, {
      gameId: game.id,
      teamAId: game.teamAId,
      teamBId: game.teamBId,
      'game.teamA.className': game.teamA?.className,
      'game.teamB.className': game.teamB?.className
    });

    // teams 배열에서 정확한 className 찾기
    const currentTeamA = teams.find(t => t.id === game.teamAId);
    const currentTeamB = teams.find(t => t.id === game.teamBId);

    console.log('  🔎 찾은 팀 정보:', {
      'currentTeamA': currentTeamA,
      'currentTeamB': currentTeamB
    });

    // className 우선순위: currentTeam.className > game.teamA.className
    const teamAClassName = currentTeamA?.className || game.teamA?.className || '';
    const teamBClassName = currentTeamB?.className || game.teamB?.className || '';

    console.log('  ✅ 결정된 className:', {
      teamAClassName,
      teamBClassName
    });

    // 팀명 (게임 내 팀 이름)
    const teamAName = game.teamA?.name || currentTeamA?.name || '팀A';
    const teamBName = game.teamB?.name || currentTeamB?.name || '팀B';

    // 팀A 선수들 처리
    (game.teamA?.lineup || []).forEach(player => {
      const playerId = player.playerId || player.id;
      if (!playerId) return;

      // 우선순위: students 배열 > player.className > teamAClassName
      const studentData = students.find(s => s.id === playerId);
      const finalClassName = studentData?.className || player.className || teamAClassName;

      if (!playerStatsMap[playerId]) {
        playerStatsMap[playerId] = {
          id: playerId,
          name: player.name,
          className: finalClassName, // 학년반
          teamNames: new Set(), // 속한 팀들
          hits: 0,
          runs: 0,
          goodDefense: 0,
          bonusCookie: 0,
          gamesPlayed: 0
        };

        // className이 비어있는 선수 경고
        if (!finalClassName) {
          console.warn(`⚠️ 팀A - className 없음:`, {
            playerId,
            playerName: player.name,
            'studentData?.className': studentData?.className,
            'player.className': player.className,
            teamAClassName,
            gameId: game.id
          });
        } else {
          console.log(`✅ 팀A - ${player.name}: ${finalClassName} (출처: ${studentData ? '학생 데이터' : player.className ? '경기 데이터' : '팀 데이터'})`);
        }
      }

      const stats = playerStatsMap[playerId];
      // className이 비어있으면 업데이트
      if (!stats.className && finalClassName) {
        console.log(`  ✏️ ${player.name}의 className 업데이트: ${finalClassName}`);
        stats.className = finalClassName;
      }
      // 팀명 추가
      stats.teamNames.add(teamAName);

      stats.hits += player.stats?.hits || 0;
      stats.runs += player.stats?.runs || 0;
      stats.goodDefense += player.stats?.goodDefense || 0;
      stats.bonusCookie += player.stats?.bonusCookie || 0;
      stats.gamesPlayed += 1;
    });

    // 팀B 선수들 처리
    (game.teamB?.lineup || []).forEach(player => {
      const playerId = player.playerId || player.id;
      if (!playerId) return;

      // 우선순위: students 배열 > player.className > teamBClassName
      const studentData = students.find(s => s.id === playerId);
      const finalClassName = studentData?.className || player.className || teamBClassName;

      if (!playerStatsMap[playerId]) {
        playerStatsMap[playerId] = {
          id: playerId,
          name: player.name,
          className: finalClassName, // 학년반
          teamNames: new Set(), // 속한 팀들
          hits: 0,
          runs: 0,
          goodDefense: 0,
          bonusCookie: 0,
          gamesPlayed: 0
        };

        // className이 비어있는 선수 경고
        if (!finalClassName) {
          console.warn(`⚠️ 팀B - className 없음:`, {
            playerId,
            playerName: player.name,
            'studentData?.className': studentData?.className,
            'player.className': player.className,
            teamBClassName,
            gameId: game.id
          });
        } else {
          console.log(`✅ 팀B - ${player.name}: ${finalClassName} (출처: ${studentData ? '학생 데이터' : player.className ? '경기 데이터' : '팀 데이터'})`);
        }
      }

      const stats = playerStatsMap[playerId];
      // className이 비어있으면 업데이트
      if (!stats.className && finalClassName) {
        console.log(`  ✏️ ${player.name}의 className 업데이트: ${finalClassName}`);
        stats.className = finalClassName;
      }
      // 팀명 추가
      stats.teamNames.add(teamBName);

      stats.hits += player.stats?.hits || 0;
      stats.runs += player.stats?.runs || 0;
      stats.goodDefense += player.stats?.goodDefense || 0;
      stats.bonusCookie += player.stats?.bonusCookie || 0;
      stats.gamesPlayed += 1;
    });
  });

  // Set을 배열로 변환
  Object.values(playerStatsMap).forEach(player => {
    player.teamNames = Array.from(player.teamNames);
  });

  return playerStatsMap;
}

/**
 * 선수 랭킹 계산
 * @param {Object} playerStatsMap - aggregatePlayerStats 결과
 * @returns {Array} 랭킹 배열 (총점 내림차순)
 */
export function calculatePlayerRanking(playerStatsMap) {
  const players = Object.values(playerStatsMap).map(player => ({
    ...player,
    totalPoints: calculatePlayerPoints(player)
  })).sort((a, b) => b.totalPoints - a.totalPoints);

  // 등수 계산 (학교 성적표 방식 - 연속 등수)
  // 예: 1등(2명) → 2등 (3등 아님)
  let currentRank = 1;
  players.forEach((player, index) => {
    if (index > 0 && player.totalPoints < players[index - 1].totalPoints) {
      currentRank = index + 1; // 실제 순번 사용
    }
    player.rank = currentRank;
  });

  return players;
}

/**
 * MVP 선정 (공동 MVP 지원)
 * @param {Array} ranking - calculatePlayerRanking 결과
 * @returns {Array} MVP 선수 배열 (동점 시 여러 명)
 */
export function getMVPs(ranking) {
  if (!ranking || ranking.length === 0) return [];

  const topScore = ranking[0].totalPoints;
  if (topScore === 0) return [];

  // 1위와 같은 점수를 가진 모든 선수 반환
  return ranking.filter(player => player.totalPoints === topScore);
}
