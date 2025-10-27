// 포인트 계산 시스템 (모든 기록 1점 동일)
export const POINTS = {
  HIT: 1,           // 안타: 1점
  RUN: 1,           // 득점: 1점
  DEFENSE: 1,       // 멋진수비: 1점
  BONUS_COOKIE: 1   // 보너스 🍪: 1점
};

/**
 * 선수 개인 포인트 계산
 * @param {Object} stats - { hits, runs, goodDefense, bonusCookie }
 * @returns {number} 총 포인트
 */
export function calculatePlayerPoints(stats) {
  if (!stats) return 0;
  const hits = stats.hits || 0;
  const runs = stats.runs || 0;
  const goodDefense = stats.goodDefense || 0;
  const bonusCookie = stats.bonusCookie || 0;

  return hits + runs + goodDefense + bonusCookie;
}

/**
 * 여러 경기의 선수 기록 합산
 * @param {Array} finishedGames - 종료된 경기 배열
 * @returns {Array} 선수별 누적 기록 [ { name, hits, runs, goodDefense, points, games } ]
 */
export function calculateTodayRanking(finishedGames) {
  const playerMap = new Map();

  finishedGames.forEach((game) => {
    // teamA와 teamB 모두 처리
    [game.teamA, game.teamB].forEach((team) => {
      team.lineup?.forEach((player) => {
        const stats = player.stats || { hits: 0, runs: 0, goodDefense: 0, bonusCookie: 0 };

        // 이름 + 반 조합으로 고유 키 생성 (동명이인 구분)
        const playerKey = player.className ? `${player.name} (${player.className})` : player.name;

        if (!playerMap.has(playerKey)) {
          playerMap.set(playerKey, {
            name: player.name,
            className: player.className || '',
            displayName: playerKey,
            hits: 0,
            runs: 0,
            goodDefense: 0,
            bonusCookie: 0,
            games: []
          });
        }

        const record = playerMap.get(playerKey);
        record.hits += stats.hits || 0;
        record.runs += stats.runs || 0;
        record.goodDefense += stats.goodDefense || 0;
        record.bonusCookie += stats.bonusCookie || 0;
        record.games.push(game.id);
      });
    });
  });

  // Map을 배열로 변환하고 포인트 계산
  const ranking = Array.from(playerMap.values()).map((player) => ({
    ...player,
    points: calculatePlayerPoints(player),
    gamesCount: player.games.length
  }));

  // 포인트 내림차순 정렬
  ranking.sort((a, b) => b.points - a.points);

  return ranking;
}

/**
 * MVP 선정 (최고 포인트)
 * @param {Array} ranking - calculateTodayRanking 결과
 * @returns {Object|null} MVP 선수 또는 null
 */
export function getMVP(ranking) {
  if (!ranking || ranking.length === 0) return null;
  return ranking[0].points > 0 ? ranking[0] : null;
}
