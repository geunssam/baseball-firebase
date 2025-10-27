import { calculateMVPScore } from './mvpCalculator';

/**
 * Stats Aggregator
 *
 * 여러 완료된 경기의 선수 스탯을 통합하는 유틸리티
 * - 원 소속팀 기록만 집계 (임대선수 필터링)
 * - 선수별 누적 통계 계산
 * - 경기별 상세 기록 유지
 */

/**
 * 선수의 원 소속팀 찾기
 * @param {string} playerId - 선수 ID
 * @param {Array} teams - 전체 팀 목록
 * @returns {Object|null} 원 소속팀 객체
 */
function findOriginalTeam(playerId, teams) {
  for (const team of teams) {
    if (team.players && team.players.some(p => (p.id || p.playerId) === playerId)) {
      return team;
    }
  }
  return null;
}

/**
 * 빈 스탯 객체 생성
 * @returns {Object} 초기화된 스탯 객체
 */
function createEmptyStats() {
  return {
    hits: 0,
    single: 0,
    double: 0,
    triple: 0,
    homerun: 0,
    runs: 0,
    bonusCookie: 0,
    goodDefense: 0
  };
}

/**
 * 두 스탯 객체를 합침
 * @param {Object} stats1 - 첫 번째 스탯
 * @param {Object} stats2 - 두 번째 스탯
 * @returns {Object} 합쳐진 스탯
 */
function mergeStats(stats1, stats2) {
  return {
    hits: (stats1.hits || 0) + (stats2.hits || 0),
    single: (stats1.single || 0) + (stats2.single || 0),
    double: (stats1.double || 0) + (stats2.double || 0),
    triple: (stats1.triple || 0) + (stats2.triple || 0),
    homerun: (stats1.homerun || 0) + (stats2.homerun || 0),
    runs: (stats1.runs || 0) + (stats2.runs || 0),
    bonusCookie: (stats1.bonusCookie || 0) + (stats2.bonusCookie || 0),
    goodDefense: (stats1.goodDefense || 0) + (stats2.goodDefense || 0)
  };
}

/**
 * 여러 완료된 경기의 선수 스탯을 통합
 * @param {Array} finishedGames - 완료된 경기 목록
 * @param {Array} teams - 전체 팀 목록
 * @returns {Object} 선수별 통합 스탯 { playerId: { ...playerStats } }
 */
export function aggregatePlayerStats(finishedGames, teams) {
  const playerStatsMap = {};

  finishedGames.forEach(game => {
    // 양 팀의 라인업을 순회
    [game.teamA, game.teamB].forEach(team => {
      if (!team || !team.lineup) return;

      team.lineup.forEach(player => {
        const playerId = player.playerId || player.id;
        if (!playerId) return;

        // 원 소속팀 찾기
        const originalTeam = findOriginalTeam(playerId, teams);

        // 원 소속팀이 없으면 스킵 (삭제된 선수일 수 있음)
        if (!originalTeam) {
          console.warn(`⚠️ ${player.name}의 원 소속팀을 찾을 수 없습니다.`);
          return;
        }

        // 원 소속팀에서 뛴 경기만 집계
        const isOriginalTeamGame = originalTeam.id === team.id;

        if (!playerStatsMap[playerId]) {
          // 선수 첫 등록
          playerStatsMap[playerId] = {
            playerId,
            playerName: player.name,
            originalTeamId: originalTeam.id,
            originalTeamName: originalTeam.name,
            gamesPlayed: 0,
            stats: createEmptyStats(),
            gameDetails: []
          };
        }

        // 경기 상세 기록 추가 (원 소속팀 여부 표시)
        playerStatsMap[playerId].gameDetails.push({
          gameId: game.id,
          gameDate: game.finishedAt || game.createdAt,
          teamPlayed: team.name,
          teamId: team.id,
          isOriginalTeam: isOriginalTeamGame,
          stats: player.stats || createEmptyStats()
        });

        // 원 소속팀 경기만 통계에 포함
        if (isOriginalTeamGame) {
          playerStatsMap[playerId].gamesPlayed += 1;
          playerStatsMap[playerId].stats = mergeStats(
            playerStatsMap[playerId].stats,
            player.stats || createEmptyStats()
          );
        }
      });
    });
  });

  // MVP 점수 계산
  Object.values(playerStatsMap).forEach(player => {
    player.mvpScore = calculateMVPScore(player.stats);
  });

  return playerStatsMap;
}

/**
 * 팀별 통합 스탯 계산
 * @param {Array} finishedGames - 완료된 경기 목록
 * @returns {Object} 팀별 통합 스탯 { teamName: { ...teamStats } }
 */
export function aggregateTeamStats(finishedGames) {
  const teamStatsMap = {};

  finishedGames.forEach(game => {
    // 팀 A
    const teamAName = game.teamA.name;
    const teamAId = game.teamA.id;
    const teamARuns = game.scoreBoard?.teamATotal || 0;
    const teamBRuns = game.scoreBoard?.teamBTotal || 0;

    if (!teamStatsMap[teamAName]) {
      teamStatsMap[teamAName] = {
        teamId: teamAId,
        teamName: teamAName,
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        totalRuns: 0,
        totalRunsAllowed: 0
      };
    }

    teamStatsMap[teamAName].totalGames += 1;
    teamStatsMap[teamAName].totalRuns += teamARuns;
    teamStatsMap[teamAName].totalRunsAllowed += teamBRuns;

    if (teamARuns > teamBRuns) {
      teamStatsMap[teamAName].wins += 1;
    } else if (teamARuns < teamBRuns) {
      teamStatsMap[teamAName].losses += 1;
    } else {
      teamStatsMap[teamAName].draws += 1;
    }

    // 팀 B
    const teamBName = game.teamB.name;
    const teamBId = game.teamB.id;

    if (!teamStatsMap[teamBName]) {
      teamStatsMap[teamBName] = {
        teamId: teamBId,
        teamName: teamBName,
        totalGames: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        totalRuns: 0,
        totalRunsAllowed: 0
      };
    }

    teamStatsMap[teamBName].totalGames += 1;
    teamStatsMap[teamBName].totalRuns += teamBRuns;
    teamStatsMap[teamBName].totalRunsAllowed += teamARuns;

    if (teamBRuns > teamARuns) {
      teamStatsMap[teamBName].wins += 1;
    } else if (teamBRuns < teamARuns) {
      teamStatsMap[teamBName].losses += 1;
    } else {
      teamStatsMap[teamBName].draws += 1;
    }
  });

  return teamStatsMap;
}

/**
 * 통합 스코어보드 생성
 * @param {Array} finishedGames - 완료된 경기 목록
 * @returns {Array} 경기별 스코어보드 정보
 */
export function buildCombinedScoreboard(finishedGames) {
  return finishedGames.map(game => ({
    gameId: game.id,
    gameTitle: `${game.teamA.name} vs ${game.teamB.name}`,
    gameDate: game.finishedAt || game.createdAt,
    teamA: game.teamA.name,
    teamB: game.teamB.name,
    finalScore: {
      teamA: game.scoreBoard?.teamATotal || 0,
      teamB: game.scoreBoard?.teamBTotal || 0
    },
    winner: game.scoreBoard?.teamATotal > game.scoreBoard?.teamBTotal
      ? game.teamA.name
      : game.scoreBoard?.teamATotal < game.scoreBoard?.teamBTotal
      ? game.teamB.name
      : '무승부',
    inningScores: {
      teamA: game.scoreBoard?.teamA || [],
      teamB: game.scoreBoard?.teamB || []
    },
    totalInnings: game.innings || 0
  }));
}

/**
 * 선수 필터링 옵션
 */
export const PlayerFilterOptions = {
  ALL: 'all', // 모든 선수
  HAS_GAMES: 'has_games', // 출전 경기가 있는 선수만
  HAS_HITS: 'has_hits', // 안타가 있는 선수만
  MVP_TOP_10: 'mvp_top_10' // MVP 점수 상위 10명
};

/**
 * 필터 옵션에 따라 선수 목록 필터링
 * @param {Object} playerStatsMap - 선수별 통합 스탯
 * @param {string} filterOption - 필터 옵션
 * @returns {Array} 필터링된 선수 목록
 */
export function filterPlayers(playerStatsMap, filterOption = PlayerFilterOptions.ALL) {
  let players = Object.values(playerStatsMap);

  switch (filterOption) {
    case PlayerFilterOptions.HAS_GAMES:
      players = players.filter(p => p.gamesPlayed > 0);
      break;

    case PlayerFilterOptions.HAS_HITS:
      players = players.filter(p => p.stats.hits > 0);
      break;

    case PlayerFilterOptions.MVP_TOP_10:
      players = players.filter(p => p.gamesPlayed > 0)
        .sort((a, b) => b.mvpScore - a.mvpScore)
        .slice(0, 10);
      break;

    case PlayerFilterOptions.ALL:
    default:
      // 필터링 없음
      break;
  }

  return players;
}
