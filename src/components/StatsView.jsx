import { useState } from 'react';
import { calculateMVPScore } from '../utils/mvpCalculator';
import { calculatePlayerPoints } from '../utils/statsHelpers';
import SelectedGamesModal from './SelectedGamesModal';

const StatsView = ({ finishedGames, teams, onBack }) => {
  const [statsSubTab, setStatsSubTab] = useState('scoreboard');
  const [selectedGameIds, setSelectedGameIds] = useState([]);
  const [showSelectedGamesModal, setShowSelectedGamesModal] = useState(false);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 font-medium rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
          >
            <span>←</span>
            <span>대시보드</span>
          </button>
          <h1 className="text-2xl font-bold">📊 통합 통계</h1>
        </div>
      </div>

      {finishedGames.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">
          종료된 경기가 없습니다.
        </div>
      ) : (
        <>
          {/* 서브탭 네비게이션 */}
          <div className="bg-white rounded-lg shadow-md p-2">
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setStatsSubTab('scoreboard')}
                className={`px-6 py-3 rounded-lg font-bold transition ${
                  statsSubTab === 'scoreboard'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                📊 통합 스코어보드
              </button>
              <button
                onClick={() => setStatsSubTab('history')}
                className={`px-6 py-3 rounded-lg font-bold transition ${
                  statsSubTab === 'history'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                📋 경기 기록
              </button>
            </div>
          </div>

          {/* 📋 경기 기록 탭 */}
          {statsSubTab === 'history' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">📋 종료된 경기 목록</h2>
                <div className="text-sm text-gray-600">
                  총 <span className="font-bold text-blue-600">{finishedGames.length}</span>개 경기
                </div>
              </div>

              <div className="space-y-4">
                {[...finishedGames].reverse().map((game, idx) => {
                  const scoreA = game.scoreboard?.teamA?.reduce((a, b) => a + b, 0) || 0;
                  const scoreB = game.scoreboard?.teamB?.reduce((a, b) => a + b, 0) || 0;
                  const winner = scoreA > scoreB ? 'A' : scoreA < scoreB ? 'B' : 'draw';

                  // 각 경기의 MVP 계산 (공동 MVP 지원)
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

                  return (
                    <details
                      key={game.id || idx}
                      className="border-2 border-gray-300 rounded-xl bg-gradient-to-br from-gray-50 to-white hover:shadow-lg transition-shadow"
                    >
                      <summary className="cursor-pointer p-5 hover:bg-gray-100 rounded-xl transition-colors">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold">
                                {game.teamA?.name} <span className="text-gray-400">vs</span> {game.teamB?.name}
                              </h3>
                              {winner !== 'draw' && (
                                <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">
                                  🏆 {winner === 'A' ? game.teamA?.name : game.teamB?.name} 승리
                                </span>
                              )}
                              {winner === 'draw' && (
                                <span className="bg-gray-400 text-white px-3 py-1 rounded-full text-sm font-bold">
                                  무승부
                                </span>
                              )}
                            </div>

                            <div className="flex gap-4 text-sm text-gray-600 flex-wrap">
                              <span>🏁 시작: {(() => {
                                try {
                                  const createdAt = game.createdAt;
                                  let timestamp;

                                  if (typeof createdAt === 'string') {
                                    // ISO 문자열
                                    timestamp = new Date(createdAt);
                                  } else if (createdAt?.toMillis) {
                                    // Firestore Timestamp
                                    timestamp = new Date(createdAt.toMillis());
                                  } else if (createdAt?.seconds) {
                                    // Firestore Timestamp 객체 형태
                                    timestamp = new Date(createdAt.seconds * 1000);
                                  } else if (typeof createdAt === 'number') {
                                    // 밀리초
                                    timestamp = new Date(createdAt);
                                  } else {
                                    timestamp = new Date();
                                  }

                                  return timestamp.toLocaleString('ko-KR', {
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  });
                                } catch (e) {
                                  return '시간 정보 없음';
                                }
                              })()}</span>
                              {game.finishedAt && (
                                <span>✅ 종료: {(() => {
                                  try {
                                    const finishedAt = game.finishedAt;
                                    let timestamp;

                                    if (typeof finishedAt === 'string') {
                                      timestamp = new Date(finishedAt);
                                    } else if (finishedAt?.toMillis) {
                                      timestamp = new Date(finishedAt.toMillis());
                                    } else if (finishedAt?.seconds) {
                                      timestamp = new Date(finishedAt.seconds * 1000);
                                    } else if (typeof finishedAt === 'number') {
                                      timestamp = new Date(finishedAt);
                                    } else {
                                      timestamp = new Date();
                                    }

                                    return timestamp.toLocaleString('ko-KR', {
                                      year: 'numeric',
                                      month: 'long',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    });
                                  } catch (e) {
                                    return '시간 정보 없음';
                                  }
                                })()}</span>
                              )}
                              <span>⚾ {game.innings || 3}회 진행</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-3xl font-black">
                              <span className={winner === 'A' ? 'text-blue-600' : 'text-gray-600'}>{scoreA}</span>
                              <span className="text-gray-400 mx-2">:</span>
                              <span className={winner === 'B' ? 'text-red-600' : 'text-gray-600'}>{scoreB}</span>
                            </div>
                          </div>
                        </div>
                      </summary>

                      {/* 상세 내용 */}
                      <div className="p-5 pt-0 space-y-4" onClick={(e) => e.stopPropagation()}>
                        {/* MVP 정보 (공동 MVP 지원) */}
                        {gameMVPs.length > 0 && (
                          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3">
                            <div className="text-sm text-yellow-800 font-semibold mb-2 flex items-center gap-2">
                              <span className="text-2xl">👑</span>
                              <span>
                                {gameMVPs.length === 1 ? '이 경기 MVP' : `이 경기 공동 MVP (${gameMVPs.length}명)`}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {gameMVPs.map((mvp, idx) => (
                                <div key={idx} className="bg-white rounded-lg px-3 py-2 shadow-sm flex-1 min-w-[200px]">
                                  <div className="font-bold text-yellow-900 mb-1">{mvp.name}</div>
                                  <div className="text-xs text-gray-600 flex items-center gap-2">
                                    <span>⚾ {mvp.stats?.hits || 0}</span>
                                    <span>🏃 {mvp.stats?.runs || 0}</span>
                                    <span>🛡️ {mvp.stats?.goodDefense || 0}</span>
                                    <span>🍪 {mvp.stats?.bonusCookie || 0}</span>
                                    <span className="ml-auto font-bold text-orange-600">{mvp.totalPoints}점</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* 이닝별 점수 */}
                        <details className="mt-4">
                          <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800 font-semibold">
                            📊 이닝별 점수 보기
                          </summary>
                          <table className="w-full text-center border-collapse text-sm mt-2">
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
                                {game.scoreboard?.teamA?.map((s, i) => (
                                  <td key={i} className="border border-gray-300 p-2">{s}</td>
                                ))}
                                <td className="border border-gray-300 p-2 font-bold">{scoreA}</td>
                              </tr>
                              <tr className={winner === 'B' ? 'bg-red-50' : ''}>
                                <td className="border border-gray-300 p-2 font-semibold">{game.teamB?.name}</td>
                                {game.scoreboard?.teamB?.map((s, i) => (
                                  <td key={i} className="border border-gray-300 p-2">{s}</td>
                                ))}
                                <td className="border border-gray-300 p-2 font-bold">{scoreB}</td>
                              </tr>
                            </tbody>
                          </table>
                        </details>
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          )}

          {/* 📊 통합 스코어보드 탭 */}
          {statsSubTab === 'scoreboard' && (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-2xl p-6">
              <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                📊 통합할 경기를 선택하세요
              </h2>

              {/* 선택 상태 및 제어 버튼 */}
              <div className="bg-white rounded-xl p-4 mb-6 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">
                    선택된 경기: <span className="text-blue-600">{selectedGameIds.length}</span>개
                  </h3>
                  <div className="flex gap-3 items-center">
                    <button
                      onClick={() => setSelectedGameIds(finishedGames.map(g => g.id))}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition"
                    >
                      전체 선택
                    </button>
                    <button
                      onClick={() => setSelectedGameIds([])}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition"
                    >
                      전체 해제
                    </button>
                    {selectedGameIds.length > 0 && (
                      <button
                        onClick={() => setShowSelectedGamesModal(true)}
                        className="px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-105"
                      >
                        ✅ 통합 분석 보기 ({selectedGameIds.length}개)
                      </button>
                    )}
                  </div>
                </div>

                {/* 경기 카드 리스트 (가로 1열, 최신순) */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto p-2">
                  {[...finishedGames].reverse().map(game => {
                    const scoreA = game.scoreboard?.teamA?.reduce((a, b) => a + b, 0) || 0;
                    const scoreB = game.scoreboard?.teamB?.reduce((a, b) => a + b, 0) || 0;
                    const winner = scoreA > scoreB ? 'A' : scoreA < scoreB ? 'B' : 'draw';
                    const isSelected = selectedGameIds.includes(game.id);

                    const gameDate = game.startTime ? new Date(game.startTime) :
                                    game.createdAt ? new Date(game.createdAt) : new Date();
                    const dateStr = gameDate.toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                    const timeStr = gameDate.toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={game.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedGameIds(selectedGameIds.filter(id => id !== game.id));
                          } else {
                            setSelectedGameIds([...selectedGameIds, game.id]);
                          }
                        }}
                        className={`
                          border-4 rounded-xl p-4 cursor-pointer transition-all transform hover:scale-[1.01]
                          flex items-center justify-between gap-4
                          ${isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-lg'
                            : 'border-gray-300 bg-white hover:border-blue-300 hover:shadow-md'
                          }
                        `}
                      >
                        {/* 왼쪽: 경기 정보 */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg">
                              {game.teamA?.name || '팀A'} vs {game.teamB?.name || '팀B'}
                            </h3>
                            <div className="text-2xl font-black">
                              <span className={winner === 'A' ? 'text-blue-600' : 'text-gray-600'}>{scoreA}</span>
                              <span className="text-gray-400 mx-1">:</span>
                              <span className={winner === 'B' ? 'text-red-600' : 'text-gray-600'}>{scoreB}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            {winner === 'A' && (
                              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                                🏆 {game.teamA?.name} 승리
                              </span>
                            )}
                            {winner === 'B' && (
                              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold">
                                🏆 {game.teamB?.name} 승리
                              </span>
                            )}
                            {winner === 'draw' && (
                              <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-bold">
                                ⚖ 무승부
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <span>📅</span>
                              <span>{dateStr}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>🕐</span>
                              <span>{timeStr}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>⚾</span>
                              <span>{game.innings || 3}이닝</span>
                            </div>
                          </div>
                        </div>

                        {/* 오른쪽: 선택 아이콘 */}
                        <div className="flex-shrink-0">
                          {isSelected ? (
                            <span className="text-4xl animate-bounce">✅</span>
                          ) : (
                            <div className="w-12 h-12 border-4 border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                              ☐
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* 선택된 경기 통합 분석 모달 */}
      {showSelectedGamesModal && (
        <SelectedGamesModal
          selectedGames={finishedGames.filter(g => selectedGameIds.includes(g.id))}
          teams={teams}
          onClose={() => setShowSelectedGamesModal(false)}
        />
      )}
    </div>
  );
};

export default StatsView;
