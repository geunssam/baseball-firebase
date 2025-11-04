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
const SelectedGamesModal = ({ selectedGames, teams, students = [], onClose }) => {
  // ============================================
  // 데이터 계산 (useMemo로 최적화)
  // ============================================

  const classScores = useMemo(() =>
    aggregateClassScores(selectedGames, teams),
    [selectedGames, teams]
  );

  const playerStatsMap = useMemo(() =>
    aggregatePlayerStats(selectedGames, teams, students),
    [selectedGames, teams, students]
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
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-6 rounded-t-2xl z-10 shadow-lg">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <h2 className="text-2xl font-bold">📊 통합 분석</h2>
              <span className="text-blue-100 text-xl">선택된 경기: {selectedGames.length}개</span>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg px-3 py-1 font-bold transition text-2xl"
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
              <table className="w-full text-center border-collapse text-3xl">
                <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                  <tr className="font-bold">
                    <th className="border-2 border-gray-300 py-3 px-5 rounded-tl-lg">반</th>
                    {Array.from({ length: maxInnings }, (_, i) => (
                      <th key={i} className="border-2 border-gray-300 py-3 px-5">{i + 1}회</th>
                    ))}
                    <th className="border-2 border-gray-300 py-3 px-5 bg-yellow-500 rounded-tr-lg">총점</th>
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
                        <td className="border-2 border-gray-300 py-3 px-5 font-bold">
                          {idx === 0 && <span className="mr-2 text-4xl">🥇</span>}
                          {className}
                        </td>
                        {data.inningScores.map((score, i) => (
                          <td key={i} className="border-2 border-gray-300 py-3 px-5 font-semibold">
                            {score}
                          </td>
                        ))}
                        <td className="border-2 border-gray-300 py-3 px-5 font-black text-4xl bg-yellow-100">
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
              {/* 여러 MVP 표시 */}
              <div className={`space-y-8 ${mvps.length > 1 ? 'divide-y-4 divide-orange-300' : ''}`}>
                {mvps.map((mvp, idx) => (
                  <div key={mvp.id} className={idx > 0 ? 'pt-8' : ''}>
                    {/* 첫 줄: 왕관 | 통합 MVP | 폭죽 */}
                    <div className="flex items-center justify-center gap-6 mb-6">
                      <span className="text-6xl animate-bounce">👑</span>
                      <h3 className="text-5xl font-black text-yellow-900">
                        {mvps.length === 1 ? '통합 MVP' : `공동 MVP`}
                      </h3>
                      <span className="text-6xl animate-pulse">🎉</span>
                    </div>

                    {/* 둘째 줄: 이름, 학년반 | 소속팀 (한 줄로) */}
                    <div className="text-center mb-6">
                      <div className="text-5xl font-black text-orange-600 mb-3">{mvp.name}</div>
                      <div className="text-3xl text-gray-800 font-bold">
                        {mvp.className || '-'} | 소속 팀: {mvp.teamNames?.join(', ') || '-'}
                      </div>
                    </div>

                    {/* 셋째 줄: 경기 스탯 카드 */}
                    <div className="grid grid-cols-5 gap-4">
                      {/* 안타 카드 */}
                      <div className="bg-blue-100 rounded-xl p-4 shadow-lg flex items-center justify-between gap-2">
                        <div className="text-3xl">⚾</div>
                        <div className="text-xl text-blue-800 font-bold">안타</div>
                        <div className="text-3xl font-black text-blue-900">{mvp.hits}</div>
                      </div>
                      {/* 득점 카드 */}
                      <div className="bg-green-100 rounded-xl p-4 shadow-lg flex items-center justify-between gap-2">
                        <div className="text-3xl">🏃</div>
                        <div className="text-xl text-green-800 font-bold">득점</div>
                        <div className="text-3xl font-black text-green-900">{mvp.runs}</div>
                      </div>
                      {/* 수비 카드 */}
                      <div className="bg-amber-100 rounded-xl p-4 shadow-lg flex items-center justify-between gap-2">
                        <div className="text-3xl">🛡️</div>
                        <div className="text-xl text-amber-800 font-bold">수비</div>
                        <div className="text-3xl font-black text-amber-900">{mvp.goodDefense}</div>
                      </div>
                      {/* 쿠키 카드 */}
                      <div className="bg-violet-100 rounded-xl p-4 shadow-lg flex items-center justify-between gap-2">
                        <div className="text-3xl">🍪</div>
                        <div className="text-xl text-violet-800 font-bold">쿠키</div>
                        <div className="text-3xl font-black text-violet-900">{mvp.bonusCookie}</div>
                      </div>
                      {/* 총점 카드 */}
                      <div className="bg-gradient-to-r from-yellow-200 to-orange-200 rounded-xl p-4 shadow-xl flex items-center justify-between gap-2">
                        <div className="text-3xl">⭐</div>
                        <div className="text-xl text-orange-900 font-black">총점</div>
                        <div className="text-3xl font-black text-orange-900">{mvp.totalPoints}</div>
                      </div>
                    </div>

                    {/* 출전 경기 수 */}
                    <div className="mt-4 text-center text-xl text-gray-700 font-semibold">
                      출전 경기: {mvp.gamesPlayed}개
                    </div>
                  </div>
                ))}
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
              <div className="max-h-[500px] overflow-y-auto border-2 border-gray-300 rounded-lg">
                <table className="w-full text-center border-collapse">
                  <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white sticky top-0 z-10">
                    <tr className="text-2xl font-bold">
                      <th className="border-2 border-gray-300 p-4 w-16">순위</th>
                      <th className="border-2 border-gray-300 p-4">이름</th>
                      <th className="border-2 border-gray-300 p-4">반</th>
                      <th className="border-2 border-gray-300 p-4">팀</th>
                      <th className="border-2 border-gray-300 p-4">출전</th>
                      <th className="border-2 border-gray-300 p-4">⚾ 안타</th>
                      <th className="border-2 border-gray-300 p-4">🏃 득점</th>
                      <th className="border-2 border-gray-300 p-4">🛡️ 수비</th>
                      <th className="border-2 border-gray-300 p-4">🍪 쿠키</th>
                      <th className="border-2 border-gray-300 p-4 bg-yellow-500">총점</th>
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
                          <td className="border-2 border-gray-300 p-4 text-2xl font-bold">
                            {player.rank === 1 && <span className="text-gray-900">🥇 {player.rank}</span>}
                            {player.rank === 2 && <span className="text-gray-900">🥈 {player.rank}</span>}
                            {player.rank === 3 && <span className="text-gray-900">🥉 {player.rank}</span>}
                            {player.rank > 3 && <span className="text-gray-800">{player.rank}</span>}
                          </td>
                          <td className="border-2 border-gray-300 p-4 font-bold text-2xl text-gray-900">{player.name}</td>
                          <td className="border-2 border-gray-300 p-4 text-2xl font-semibold text-gray-800">{player.className || '-'}</td>
                          <td className="border-2 border-gray-300 p-4 text-xl font-semibold text-gray-800">{player.teamNames?.join(', ') || '-'}</td>
                          <td className="border-2 border-gray-300 p-4 text-2xl font-semibold text-gray-800">{player.gamesPlayed}</td>
                          <td className="border-2 border-gray-300 p-4 text-2xl font-bold text-gray-900">{player.hits}</td>
                          <td className="border-2 border-gray-300 p-4 text-2xl font-bold text-gray-900">{player.runs}</td>
                          <td className="border-2 border-gray-300 p-4 text-2xl font-bold text-gray-900">{player.goodDefense}</td>
                          <td className="border-2 border-gray-300 p-4 text-2xl font-bold text-gray-900">{player.bonusCookie}</td>
                          <td className="border-2 border-gray-300 p-4 font-black text-2xl bg-yellow-50 text-gray-900">{player.totalPoints}</td>
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

                // 이 경기의 MVP (공동 MVP 지원)
                const allPlayers = [...(game.teamA?.lineup || []), ...(game.teamB?.lineup || [])];
                const playerWithPoints = allPlayers
                  .map(p => ({
                    ...p,
                    totalPoints: calculatePlayerPoints(p.stats)
                  }))
                  .sort((a, b) => b.totalPoints - a.totalPoints);

                const topScore = playerWithPoints[0]?.totalPoints || 0;
                const gameMVPs = topScore > 0
                  ? playerWithPoints.filter(p => p.totalPoints === topScore)
                  : [];

                // 날짜/시간 파싱 개선
                let gameDate;
                try {
                  const createdAt = game.createdAt;
                  if (typeof createdAt === 'string') {
                    gameDate = new Date(createdAt);
                  } else if (createdAt?.toMillis) {
                    gameDate = new Date(createdAt.toMillis());
                  } else if (createdAt?.seconds) {
                    gameDate = new Date(createdAt.seconds * 1000);
                  } else if (typeof createdAt === 'number') {
                    gameDate = new Date(createdAt);
                  } else {
                    gameDate = new Date();
                  }
                } catch (e) {
                  gameDate = new Date();
                }

                return (
                  <details
                    key={game.id || idx}
                    className="border-2 border-gray-300 rounded-xl bg-white hover:shadow-md transition-shadow"
                  >
                    <summary className="cursor-pointer p-6 hover:bg-gray-50 rounded-xl transition-colors list-none">
                      {/* 1열 가로 레이아웃 - 고정 너비 */}
                      <div className="flex items-center gap-4 text-xl">
                        {/* 승리 배지 */}
                        <span className={`w-12 text-center flex-shrink-0 text-4xl ${winner !== 'draw' ? '' : 'invisible'}`}>
                          🏆
                        </span>

                        {/* 팀명과 점수 - 고정 너비로 균형 */}
                        <div className="flex items-center gap-3">
                          <span className="font-bold w-32 text-center truncate text-2xl" title={game.teamA?.name}>
                            {game.teamA?.name}
                          </span>
                          <span className={`font-black text-4xl w-16 text-center ${winner === 'A' ? 'text-blue-600' : 'text-gray-600'}`}>
                            {scoreA}
                          </span>
                          <span className="text-gray-400 text-xl w-12 text-center font-bold">vs</span>
                          <span className={`font-black text-4xl w-16 text-center ${winner === 'B' ? 'text-red-600' : 'text-gray-600'}`}>
                            {scoreB}
                          </span>
                          <span className="font-bold w-32 text-center truncate text-2xl" title={game.teamB?.name}>
                            {game.teamB?.name}
                          </span>
                        </div>

                        <span className="text-gray-300 w-6 text-center text-2xl">|</span>

                        {/* 날짜 */}
                        <span className="text-gray-700 flex items-center justify-center gap-2 w-44 font-semibold">
                          <span className="text-2xl">📅</span>
                          <span className="text-center">{gameDate.toLocaleDateString('ko-KR')}</span>
                        </span>

                        <span className="text-gray-300 w-6 text-center text-2xl">|</span>

                        {/* 시간 */}
                        <span className="text-gray-700 flex items-center justify-center gap-2 w-36 font-semibold">
                          <span className="text-2xl">🕐</span>
                          <span className="text-center">{gameDate.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span>
                        </span>

                        <span className="text-gray-300 w-6 text-center text-2xl">|</span>

                        {/* 이닝 */}
                        <span className="text-gray-700 flex items-center justify-center gap-2 w-32 font-semibold">
                          <span className="text-2xl">⚾</span>
                          <span className="text-center">{game.innings || 3}이닝</span>
                        </span>

                        {/* 돋보기 아이콘 - 우측 끝 */}
                        <div className="ml-auto text-4xl text-gray-400 hover:text-blue-600 transition-colors flex-shrink-0">
                          🔍
                        </div>
                      </div>
                    </summary>

                    {/* 상세 내용 */}
                    <div className="p-2 pt-0 space-y-2" onClick={(e) => e.stopPropagation()}>
                      {/* MVP 정보 (공동 MVP 지원) */}
                      {gameMVPs.length > 0 && (
                        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-6">
                          <div className="text-2xl text-yellow-800 font-bold mb-4 flex items-center gap-3">
                            <span className="text-4xl">👑</span>
                            <span>
                              {gameMVPs.length === 1 ? '이 경기 MVP' : `공동 MVP (${gameMVPs.length}명)`}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-4">
                            {gameMVPs.map((mvp, idx) => (
                              <div key={idx} className="bg-white rounded-lg px-6 py-4 shadow-md flex-1 min-w-[300px] flex items-center gap-4">
                                <div className="font-bold text-yellow-900 text-2xl">{mvp.name}</div>
                                <div className="text-xl text-gray-700 flex items-center gap-4 font-semibold">
                                  <span>⚾ {mvp.stats?.hits || 0}</span>
                                  <span>🏃 {mvp.stats?.runs || 0}</span>
                                  <span>🛡️ {mvp.stats?.goodDefense || 0}</span>
                                  <span>🍪 {mvp.stats?.bonusCookie || 0}</span>
                                  <span className="font-black text-orange-600 text-2xl">{mvp.totalPoints}점</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 경기 세부 내용 */}
                      <details className="mt-4" open>
                        <summary className="text-xl text-blue-600 cursor-pointer hover:text-blue-800 font-bold">
                          📊 경기 세부 내용 보기
                        </summary>

                        <div className="mt-6 space-y-6">
                          {/* 이닝별 점수 테이블 */}
                          <div>
                            <h4 className="text-2xl font-bold mb-4">이닝별 점수</h4>
                            <table className="w-full text-center border-collapse text-2xl">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="border-2 border-gray-300 p-4 font-black">팀</th>
                                  {Array.from({ length: game.innings }, (_, i) => (
                                    <th key={i} className="border-2 border-gray-300 p-4 font-bold">{i + 1}회</th>
                                  ))}
                                  <th className="border-2 border-gray-300 p-4 bg-yellow-100 font-black">총점</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr className={winner === 'A' ? 'bg-blue-50' : ''}>
                                  <td className="border-2 border-gray-300 p-4 font-black">{game.teamA?.name}</td>
                                  {game.scoreBoard?.teamA?.map((s, i) => (
                                    <td key={i} className="border-2 border-gray-300 p-4 font-bold">{s}</td>
                                  ))}
                                  <td className="border-2 border-gray-300 p-4 font-black text-3xl bg-yellow-50">{scoreA}</td>
                                </tr>
                                <tr className={winner === 'B' ? 'bg-red-50' : ''}>
                                  <td className="border-2 border-gray-300 p-4 font-black">{game.teamB?.name}</td>
                                  {game.scoreBoard?.teamB?.map((s, i) => (
                                    <td key={i} className="border-2 border-gray-300 p-4 font-bold">{s}</td>
                                  ))}
                                  <td className="border-2 border-gray-300 p-4 font-black text-3xl bg-yellow-50">{scoreB}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* 팀A 선수 기록 */}
                          <div>
                            <h4 className="text-2xl font-bold mb-4 text-blue-700">
                              {game.teamA?.name} 팀 선수 기록
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-2xl border-collapse">
                                <thead className="bg-blue-50">
                                  <tr className="font-bold">
                                    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-36">이름</th>
                                    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-32">포지션</th>
                                    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-24">안타</th>
                                    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-24">득점</th>
                                    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-24">수비</th>
                                    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-24">쿠키</th>
                                    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-32">획득 배지</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {game.teamA?.lineup?.sort((a, b) => (a.battingOrder || 999) - (b.battingOrder || 999)).map((player, idx) => (
                                    <tr key={idx} className="hover:bg-blue-50/50">
                                      <td className="border-2 border-gray-300 p-4 text-center font-bold text-gray-900">{player.name}</td>
                                      <td className="border-2 border-gray-300 p-4 text-center font-semibold text-gray-900">{player.position || '-'}</td>
                                      <td className="border-2 border-gray-300 p-4 text-center font-bold text-green-600">{player.stats?.hits || 0}</td>
                                      <td className="border-2 border-gray-300 p-4 text-center font-bold text-blue-600">{player.stats?.runs || 0}</td>
                                      <td className="border-2 border-gray-300 p-4 text-center font-bold text-amber-600">{player.stats?.goodDefense || 0}</td>
                                      <td className="border-2 border-gray-300 p-4 text-center font-bold text-purple-600">{player.stats?.bonusCookie || 0}</td>
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
                              </table>
                            </div>
                          </div>

                          {/* 팀B 선수 기록 */}
                          <div>
                            <h4 className="text-2xl font-bold mb-4 text-red-700">
                              {game.teamB?.name} 팀 선수 기록
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-2xl border-collapse">
                                <thead className="bg-red-50">
                                  <tr className="font-bold">
                                    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-36">이름</th>
                                    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-32">포지션</th>
                                    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-24">안타</th>
                                    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-24">득점</th>
                                    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-24">수비</th>
                                    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-24">쿠키</th>
                                    <th className="border-2 border-gray-300 p-4 text-center text-gray-900 w-32">획득 배지</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {game.teamB?.lineup?.sort((a, b) => (a.battingOrder || 999) - (b.battingOrder || 999)).map((player, idx) => (
                                    <tr key={idx} className="hover:bg-red-50/50">
                                      <td className="border-2 border-gray-300 p-4 text-center font-bold text-gray-900">{player.name}</td>
                                      <td className="border-2 border-gray-300 p-4 text-center font-semibold text-gray-900">{player.position || '-'}</td>
                                      <td className="border-2 border-gray-300 p-4 text-center font-bold text-green-600">{player.stats?.hits || 0}</td>
                                      <td className="border-2 border-gray-300 p-4 text-center font-bold text-blue-600">{player.stats?.runs || 0}</td>
                                      <td className="border-2 border-gray-300 p-4 text-center font-bold text-amber-600">{player.stats?.goodDefense || 0}</td>
                                      <td className="border-2 border-gray-300 p-4 text-center font-bold text-purple-600">{player.stats?.bonusCookie || 0}</td>
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
                              </table>
                            </div>
                          </div>
                        </div>
                      </details>
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
