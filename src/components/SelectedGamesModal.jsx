import { useMemo } from 'react';
import {
  aggregateClassScores,
  aggregatePlayerStats,
  calculatePlayerRanking,
  getMVPs,
  calculatePlayerPoints
} from '../utils/statsHelpers';

/**
 * SelectedGamesModal
 *
 * 선택된 경기들의 통합 분석 모달
 *
 * Props:
 * - selectedGames: 선택된 경기 목록
 * - teams: 전체 팀 목록 (className 매핑용)
 * - onClose: 모달 닫기 핸들러
 */
const SelectedGamesModal = ({ selectedGames, teams, onClose }) => {
  // ============================================
  // 데이터 계산 (useMemo로 최적화)
  // ============================================

  const classScores = useMemo(() =>
    aggregateClassScores(selectedGames, teams),
    [selectedGames, teams]
  );

  const playerStatsMap = useMemo(() =>
    aggregatePlayerStats(selectedGames),
    [selectedGames]
  );

  const playerRanking = useMemo(() =>
    calculatePlayerRanking(playerStatsMap),
    [playerStatsMap]
  );

  const mvps = useMemo(() =>
    getMVPs(playerRanking),
    [playerRanking]
  );

  // 최대 이닝 수 계산
  const maxInnings = selectedGames.length > 0
    ? Math.max(...selectedGames.map(g => g.innings || 3))
    : 3;

  // ============================================
  // 렌더링
  // ============================================

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-y-auto">
        {/* 모달 헤더 (sticky) */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl z-10 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold">📊 통합 분석</h2>
              <p className="text-blue-100 mt-1">선택된 경기: {selectedGames.length}개</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg px-4 py-2 font-bold transition text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* 모달 내용 */}
        <div className="p-6 space-y-6">
          {/* Section 1: 반별 통합 스코어보드 */}
          <section className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 shadow-lg">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span>🏆</span>
              <span>반별 통합 스코어보드</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <tr>
                    <th className="border border-gray-300 p-3 rounded-tl-lg">반</th>
                    {Array.from({ length: maxInnings }, (_, i) => (
                      <th key={i} className="border border-gray-300 p-3">{i + 1}회</th>
                    ))}
                    <th className="border border-gray-300 p-3 bg-yellow-500 rounded-tr-lg">총점</th>
                  </tr>
                </thead>
                <tbody className="bg-white">
                  {Object.entries(classScores)
                    .sort(([, a], [, b]) => b.totalScore - a.totalScore)
                    .map(([className, data], idx) => (
                      <tr
                        key={className}
                        className={idx === 0 ? 'bg-yellow-50 font-bold' : 'hover:bg-gray-50'}
                      >
                        <td className="border border-gray-300 p-3 font-semibold">
                          {idx === 0 && <span className="mr-2">🥇</span>}
                          {className}
                        </td>
                        {data.inningScores.map((score, i) => (
                          <td key={i} className="border border-gray-300 p-3">
                            {score}
                          </td>
                        ))}
                        <td className="border border-gray-300 p-3 font-bold text-lg bg-yellow-100">
                          {data.totalScore}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 2: 통합 MVP 카드 */}
          {mvps.length > 0 && (
            <section className="bg-gradient-to-br from-yellow-100 via-orange-100 to-red-100 rounded-xl p-8 shadow-xl border-4 border-yellow-400">
              <div className="text-center">
                <div className="text-6xl mb-4 animate-bounce">
                  {mvps.length === 1 ? '👑' : '👑'.repeat(Math.min(mvps.length, 3))}
                </div>
                <h3 className="text-3xl font-black text-yellow-900 mb-2">
                  {mvps.length === 1 ? '통합 MVP' : `공동 MVP (${mvps.length}명)`}
                </h3>

                {/* 여러 MVP 표시 */}
                <div className={`space-y-6 mt-6 ${mvps.length > 1 ? 'divide-y-2 divide-orange-300' : ''}`}>
                  {mvps.map((mvp, idx) => (
                    <div key={mvp.id} className={idx > 0 ? 'pt-6' : ''}>
                      <div className="text-4xl font-black text-orange-600 mb-2">{mvp.name}</div>
                      <div className="text-lg text-gray-700 mb-4">{mvp.className}</div>

                      {/* MVP 통계 그리드 */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div className="bg-white rounded-lg p-4 shadow-md">
                          <div className="text-2xl font-bold text-blue-600">{mvp.hits}</div>
                          <div className="text-sm text-gray-600">⚾ 안타</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-md">
                          <div className="text-2xl font-bold text-green-600">{mvp.runs}</div>
                          <div className="text-sm text-gray-600">🏃 득점</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-md">
                          <div className="text-2xl font-bold text-purple-600">{mvp.goodDefense}</div>
                          <div className="text-sm text-gray-600">🛡️ 수비</div>
                        </div>
                        <div className="bg-white rounded-lg p-4 shadow-md">
                          <div className="text-2xl font-bold text-pink-600">{mvp.bonusCookie}</div>
                          <div className="text-sm text-gray-600">🍪 보너스</div>
                        </div>
                        <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-lg p-4 shadow-lg">
                          <div className="text-2xl font-bold text-white">{mvp.totalPoints}</div>
                          <div className="text-sm text-yellow-100 font-bold">총점</div>
                        </div>
                      </div>

                      <div className="mt-4 text-sm text-gray-600">
                        출전 경기: {mvp.gamesPlayed}개
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Section 3: 전체 선수 랭킹 */}
          <section className="bg-white rounded-xl p-6 shadow-lg border-2 border-gray-200">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span>🎖️</span>
              <span>전체 선수 랭킹</span>
              <span className="text-sm text-gray-500 font-normal">({playerRanking.length}명)</span>
            </h3>

            {/* 랭킹 테이블 (스크롤 가능) */}
            <div className="overflow-x-auto">
              <div className="max-h-[500px] overflow-y-auto border border-gray-300 rounded-lg">
                <table className="w-full text-center border-collapse">
                  <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white sticky top-0 z-10">
                    <tr>
                      <th className="border border-gray-300 p-3 w-16">순위</th>
                      <th className="border border-gray-300 p-3">이름</th>
                      <th className="border border-gray-300 p-3">반</th>
                      <th className="border border-gray-300 p-3">⚾ 안타</th>
                      <th className="border border-gray-300 p-3">🏃 득점</th>
                      <th className="border border-gray-300 p-3">🛡️ 수비</th>
                      <th className="border border-gray-300 p-3">🍪 보너스</th>
                      <th className="border border-gray-300 p-3 bg-yellow-500">총점</th>
                      <th className="border border-gray-300 p-3">출전</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {playerRanking.map((player) => {
                      const isMVP = player.rank === 1;
                      const isSecond = player.rank === 2;
                      const isThird = player.rank === 3;

                      return (
                        <tr
                          key={player.id}
                          className={`
                            ${isMVP ? 'bg-yellow-50 font-bold' : ''}
                            ${isSecond ? 'bg-gray-50 font-semibold' : ''}
                            ${isThird ? 'bg-orange-50 font-semibold' : ''}
                            ${player.rank > 3 ? 'hover:bg-gray-50' : ''}
                          `}
                        >
                          <td className="border border-gray-300 p-3">
                            {player.rank === 1 && <span>🥇 {player.rank}</span>}
                            {player.rank === 2 && <span>🥈 {player.rank}</span>}
                            {player.rank === 3 && <span>🥉 {player.rank}</span>}
                            {player.rank > 3 && <span className="text-gray-500">{player.rank}</span>}
                          </td>
                        <td className="border border-gray-300 p-3 font-semibold">{player.name}</td>
                          <td className="border border-gray-300 p-3 text-sm text-gray-600">{player.className}</td>
                          <td className="border border-gray-300 p-3">{player.hits}</td>
                          <td className="border border-gray-300 p-3">{player.runs}</td>
                          <td className="border border-gray-300 p-3">{player.goodDefense}</td>
                          <td className="border border-gray-300 p-3">{player.bonusCookie}</td>
                          <td className="border border-gray-300 p-3 font-bold bg-yellow-50">{player.totalPoints}</td>
                          <td className="border border-gray-300 p-3 text-sm text-gray-600">{player.gamesPlayed}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Section 4: 경기별 상세 기록 */}
          <section className="bg-gray-50 rounded-xl p-6 shadow-lg">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <span>📋</span>
              <span>경기별 상세 기록</span>
            </h3>

            <div className="space-y-4">
              {[...selectedGames].reverse().map((game, idx) => {
                const scoreA = game.scoreBoard?.teamA?.reduce((a, b) => a + b, 0) || 0;
                const scoreB = game.scoreBoard?.teamB?.reduce((a, b) => a + b, 0) || 0;
                const winner = scoreA > scoreB ? 'A' : scoreA < scoreB ? 'B' : 'draw';

                // 이 경기의 MVP
                const allPlayers = [...(game.teamA?.lineup || []), ...(game.teamB?.lineup || [])];
                const gameMVP = allPlayers.reduce((max, player) => {
                  const score = calculatePlayerPoints(player.stats);
                  return score > (max.score || 0) ? { ...player, score } : max;
                }, {});

                const gameDate = game.startTime ? new Date(game.startTime) :
                                game.createdAt ? new Date(game.createdAt) : new Date();

                return (
                  <details
                    key={game.id || idx}
                    className="border-2 border-gray-300 rounded-xl bg-white hover:shadow-md transition-shadow"
                  >
                    <summary className="cursor-pointer p-5 hover:bg-gray-50 rounded-xl transition-colors">
                      <div className="flex justify-between items-center">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-lg font-bold">
                              {game.teamA?.name} <span className="text-gray-400">vs</span> {game.teamB?.name}
                            </h4>
                            <div className="text-xl font-black">
                              <span className={winner === 'A' ? 'text-blue-600' : 'text-gray-600'}>{scoreA}</span>
                              <span className="text-gray-400 mx-1">:</span>
                              <span className={winner === 'B' ? 'text-red-600' : 'text-gray-600'}>{scoreB}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 text-sm text-gray-600">
                            <span>📅 {gameDate.toLocaleDateString('ko-KR')}</span>
                            <span>🕐 {gameDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                            <span>⚾ {game.innings || 3}이닝</span>
                            {winner !== 'draw' && (
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-bold">
                                🏆 {winner === 'A' ? game.teamA?.name : game.teamB?.name} 승리
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </summary>

                    {/* 상세 내용 */}
                    <div className="p-5 pt-0 space-y-4" onClick={(e) => e.stopPropagation()}>
                      {/* 이 경기 MVP */}
                      {gameMVP.name && gameMVP.score > 0 && (
                        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 flex items-center gap-3">
                          <span className="text-2xl">👑</span>
                          <div className="flex-1">
                            <div className="text-xs text-yellow-800 font-semibold">이 경기 MVP</div>
                            <div className="text-base font-bold text-yellow-900">{gameMVP.name}</div>
                          </div>
                          <div className="text-right text-xs text-yellow-800">
                            <div>⚾ {gameMVP.stats?.hits || 0} 🏃 {gameMVP.stats?.runs || 0}</div>
                            <div className="font-bold text-orange-600">{gameMVP.score}점</div>
                          </div>
                        </div>
                      )}

                      {/* 이닝별 점수 */}
                      <table className="w-full text-center border-collapse text-sm">
                        <thead className="bg-gray-100">
                          <tr>
                            <th className="border border-gray-300 p-2">팀</th>
                            {Array.from({ length: game.innings }, (_, i) => (
                              <th key={i} className="border border-gray-300 p-2">{i + 1}회</th>
                            ))}
                            <th className="border border-gray-300 p-2 bg-yellow-100">총점</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr className={winner === 'A' ? 'bg-blue-50' : ''}>
                            <td className="border border-gray-300 p-2 font-semibold">{game.teamA?.name}</td>
                            {game.scoreBoard?.teamA?.map((s, i) => (
                              <td key={i} className="border border-gray-300 p-2">{s}</td>
                            ))}
                            <td className="border border-gray-300 p-2 font-bold">{scoreA}</td>
                          </tr>
                          <tr className={winner === 'B' ? 'bg-red-50' : ''}>
                            <td className="border border-gray-300 p-2 font-semibold">{game.teamB?.name}</td>
                            {game.scoreBoard?.teamB?.map((s, i) => (
                              <td key={i} className="border border-gray-300 p-2">{s}</td>
                            ))}
                            <td className="border border-gray-300 p-2 font-bold">{scoreB}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </details>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default SelectedGamesModal;
