import { useState } from 'react';
import { calculateMVPScore } from '../utils/mvpCalculator';
import { calculatePlayerPoints } from '../utils/statsHelpers';
import SelectedGamesModal from './SelectedGamesModal';

const StatsView = ({ finishedGames, teams, students = [], onBack }) => {
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
        <div className="bg-gradient-to-br from-blue-50 to-sky-50 rounded-lg shadow-lg p-12 text-center">
          {/* 애니메이션 야구공 */}
          <div className="mb-6 flex justify-center">
            <div className="relative">
              <div className="text-8xl animate-bounce">⚾</div>
              <div className="absolute inset-0 text-8xl animate-ping opacity-20">⚾</div>
            </div>
          </div>

          {/* 제목 */}
          <h3 className="text-2xl font-bold text-gray-700 mb-3">
            아직 경기 기록이 없어요
          </h3>

          {/* 설명 */}
          <p className="text-gray-500 mb-6 text-lg">
            첫 경기를 시작하고 멋진 기록을 만들어보세요!
          </p>

          {/* CTA 버튼 */}
          <button
            onClick={onBack}
            className="px-8 py-3 bg-green-500 hover:bg-green-600 text-white font-bold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
          >
            ⚾ 대시보드로 돌아가기
          </button>
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
                  const scoreA = game.scoreBoard?.teamA?.reduce((a, b) => a + b, 0) || 0;
                  const scoreB = game.scoreBoard?.teamB?.reduce((a, b) => a + b, 0) || 0;
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

                  // 날짜 변환
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
                    const scoreA = game.scoreBoard?.teamA?.reduce((a, b) => a + b, 0) || 0;
                    const scoreB = game.scoreBoard?.teamB?.reduce((a, b) => a + b, 0) || 0;
                    const winner = scoreA > scoreB ? 'A' : scoreA < scoreB ? 'B' : 'draw';
                    const isSelected = selectedGameIds.includes(game.id);

                    // 시작 시간
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

                    const dateStr = `${gameDate.getMonth() + 1}/${gameDate.getDate()}`;
                    const timeStr = gameDate.toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    });

                    // 종료 시간
                    let finishedTimeStr = null;
                    if (game.finishedAt) {
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

                        finishedTimeStr = timestamp.toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false
                        });
                      } catch (e) {
                        finishedTimeStr = null;
                      }
                    }

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
                          border-2 rounded-lg p-2 cursor-pointer transition-all
                          grid grid-cols-[1fr_auto_auto] items-center gap-3
                          ${isSelected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-300 bg-white hover:border-blue-300'
                          }
                        `}
                      >
                        {/* 왼쪽: 팀명과 점수 (테이블 형식 고정) */}
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-sm w-16 text-center truncate" title={game.teamA?.name || '팀A'}>
                            {game.teamA?.name || '팀A'}
                          </span>
                          <span className={`font-bold text-lg w-6 text-center ${winner === 'A' ? 'text-blue-600' : 'text-gray-600'}`}>
                            {scoreA}
                          </span>
                          <span className="text-gray-400 text-xs w-3 text-center">:</span>
                          <span className={`font-bold text-lg w-6 text-center ${winner === 'B' ? 'text-red-600' : 'text-gray-600'}`}>
                            {scoreB}
                          </span>
                          <span className="font-semibold text-sm w-16 text-center truncate" title={game.teamB?.name || '팀B'}>
                            {game.teamB?.name || '팀B'}
                          </span>
                        </div>

                        {/* 중앙: 날짜/시간 정보 (고정 너비) */}
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span className="inline-flex items-center gap-0.5 w-16">
                            <span>📅</span>
                            <span>{dateStr}</span>
                          </span>
                          <span className="inline-flex items-center gap-0.5 w-16">
                            <span>🏁</span>
                            <span>{timeStr}</span>
                          </span>
                          <span className="inline-flex items-center gap-0.5 w-16">
                            {finishedTimeStr ? (
                              <>
                                <span>✅</span>
                                <span>{finishedTimeStr}</span>
                              </>
                            ) : (
                              <span></span>
                            )}
                          </span>
                          <span className="inline-flex items-center gap-0.5 w-16">
                            <span>⚾</span>
                            <span>{game.innings || 3}이닝</span>
                          </span>
                        </div>

                        {/* 오른쪽: 선택 아이콘 */}
                        <div className="flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              e.stopPropagation();
                            }}
                            className="w-5 h-5 cursor-pointer"
                          />
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
          students={students}
          onClose={() => setShowSelectedGamesModal(false)}
        />
      )}
    </div>
  );
};

export default StatsView;
