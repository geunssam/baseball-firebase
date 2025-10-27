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
 * @returns {Object} { playerId: { name, className, hits, runs, ..., gamesPlayed } }
 */
export function aggregatePlayerStats(selectedGames) {
  const playerStatsMap = {};

  selectedGames.forEach(game => {
    const allPlayers = [
      ...(game.teamA?.lineup || []),
      ...(game.teamB?.lineup || [])
    ];

    allPlayers.forEach(player => {
      const playerId = player.playerId || player.id;
      if (!playerId) return;

      if (!playerStatsMap[playerId]) {
        playerStatsMap[playerId] = {
          id: playerId,
          name: player.name,
          className: player.className,
          hits: 0,
          runs: 0,
          goodDefense: 0,
          bonusCookie: 0,
          gamesPlayed: 0
        };
      }

      const stats = playerStatsMap[playerId];
      stats.hits += player.stats?.hits || 0;
      stats.runs += player.stats?.runs || 0;
      stats.goodDefense += player.stats?.goodDefense || 0;
      stats.bonusCookie += player.stats?.bonusCookie || 0;
      stats.gamesPlayed += 1;
    });
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
