import { useState, useEffect } from 'react';
import { getPlayerDetailedHistory } from '../services/firestoreService';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

/**
 * 학생 경기 기록 컴포넌트
 * - 경기 목록 표시
 * - 누적 통계
 * - 정렬 기능
 * - 상세 통계 시각화
 */
export default function StudentGameHistory({ playerId, teacherId }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'
  const [showDetailModal, setShowDetailModal] = useState(false);

  useEffect(() => {
    if (playerId && teacherId) {
      loadGames();
    }
  }, [playerId, teacherId]);

  const loadGames = async () => {
    console.log('🔍 [StudentGameHistory] 경기 기록 로드 시작');
    console.log('  - playerId:', playerId);
    console.log('  - teacherId:', teacherId);

    setLoading(true);
    try {
      const history = await getPlayerDetailedHistory(teacherId, playerId);
      console.log('✅ [StudentGameHistory] 경기 기록 로드 완료:', history.length, '경기');
      console.log('  - 경기 목록:', history);
      setGames(history);
    } catch (error) {
      console.error('❌ [StudentGameHistory] 경기 기록 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  // 정렬된 경기 목록
  const sortedGames = [...games].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  // 누적 통계 계산
  const totalStats = games.reduce((acc, game) => ({
    hits: acc.hits + (game.stats.hits || 0),
    runs: acc.runs + (game.stats.runs || 0),
    goodDefense: acc.goodDefense + (game.stats.goodDefense || 0),
    bonusCookie: acc.bonusCookie + (game.stats.bonusCookie || 0),
    badges: acc.badges + (game.newBadges?.length || 0),
    wins: acc.wins + (game.result === 'win' ? 1 : 0)
  }), { hits: 0, runs: 0, goodDefense: 0, bonusCookie: 0, badges: 0, wins: 0 });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8 text-gray-500">
          로딩 중...
        </div>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-3xl font-bold mb-4">⚾ 나의 경기 기록</h2>
        <div className="text-center py-12 text-gray-500">
          <p className="text-4xl mb-4">⚾</p>
          <p className="text-lg">아직 출전한 경기가 없습니다.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-3xl font-bold">⚾ 나의 경기 기록</h2>
        <div className="flex gap-2 items-center">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="px-3 py-2 border rounded-lg text-base"
          >
            <option value="desc">최신순</option>
            <option value="asc">오래된순</option>
          </select>
          <button
            onClick={() => setShowDetailModal(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 text-base"
            title="상세 통계 보기"
          >
            🔍 상세 통계
          </button>
        </div>
      </div>

      {/* 누적 통계 요약 - 카드 스타일 */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl text-center">
          <div className="text-4xl font-bold text-blue-600">{games.length}</div>
          <div className="text-base text-gray-600 mt-1 font-bold">경기 수</div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-xl text-center">
          <div className="text-4xl font-bold text-green-600">{totalStats.hits}</div>
          <div className="text-base text-gray-600 mt-1 font-bold">안타</div>
        </div>
        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-3 rounded-xl text-center">
          <div className="text-4xl font-bold text-yellow-600">{totalStats.runs}</div>
          <div className="text-base text-gray-600 mt-1 font-bold">득점</div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-xl text-center">
          <div className="text-4xl font-bold text-purple-600">{totalStats.goodDefense}</div>
          <div className="text-base text-gray-600 mt-1 font-bold">수비</div>
        </div>
        <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-xl text-center">
          <div className="text-4xl font-bold text-orange-600">{totalStats.bonusCookie}</div>
          <div className="text-base text-gray-600 mt-1 font-bold">쿠키</div>
        </div>
        <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-3 rounded-xl text-center">
          <div className="text-4xl font-bold text-teal-600">{totalStats.badges}</div>
          <div className="text-base text-gray-600 mt-1 font-bold">배지 수</div>
        </div>
      </div>

      {/* 경기 목록 - 테이블 형식 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-100 border-b-2 border-gray-300">
              <th className="px-3 py-2 text-left text-base font-bold">날짜</th>
              <th className="px-3 py-2 text-left text-base font-bold">팀</th>
              <th className="px-3 py-2 text-center text-base font-bold">점수</th>
              <th className="px-3 py-2 text-center text-base font-bold">승패</th>
              <th className="px-3 py-2 text-center text-base font-bold">⚾ 안타</th>
              <th className="px-3 py-2 text-center text-base font-bold">🏃 득점</th>
              <th className="px-3 py-2 text-center text-base font-bold">🛡️ 수비</th>
              <th className="px-3 py-2 text-center text-base font-bold">🍪 쿠키</th>
              <th className="px-3 py-2 text-left text-base font-bold">🏅 배지</th>
            </tr>
          </thead>
          <tbody>
            {sortedGames.map((game) => (
              <GameRow key={game.gameId} game={game} />
            ))}
          </tbody>
        </table>
      </div>

      {/* 상세 통계 모달 */}
      {showDetailModal && (
        <StatsDetailModal
          games={games}
          onClose={() => setShowDetailModal(false)}
        />
      )}
    </div>
  );
}

/**
 * 개별 경기 행 컴포넌트
 */
function GameRow({ game }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const isWin = game.result === 'win';
  const rowBgColor = isWin ? 'bg-blue-50' : 'bg-red-50';
  const resultTextColor = isWin ? 'text-blue-600' : 'text-red-600';
  const resultText = isWin ? '승리' : '패배';
  const resultEmoji = isWin ? '🎉' : '😢';

  return (
    <tr className={`${rowBgColor} border-b border-gray-200 hover:shadow-md transition-shadow`}>
      {/* 날짜 */}
      <td className="px-3 py-3 text-base">
        {formatDate(game.date)}
      </td>

      {/* 팀 */}
      <td className="px-3 py-3 text-base font-semibold">
        {game.team}
      </td>

      {/* 점수 */}
      <td className="px-3 py-3 text-center text-base font-bold">
        {game.score.our}:{game.score.opponent}
      </td>

      {/* 승패 */}
      <td className="px-3 py-3 text-center">
        <span className={`${resultTextColor} font-bold text-base`}>
          {resultEmoji} {resultText}
        </span>
      </td>

      {/* 안타 */}
      <td className="px-3 py-3 text-center text-base font-semibold">
        {game.stats.hits}
      </td>

      {/* 득점 */}
      <td className="px-3 py-3 text-center text-base font-semibold">
        {game.stats.runs}
      </td>

      {/* 수비 */}
      <td className="px-3 py-3 text-center text-base font-semibold">
        {game.stats.goodDefense}
      </td>

      {/* 쿠키 */}
      <td className="px-3 py-3 text-center text-base font-semibold">
        {game.stats.bonusCookie}
      </td>

      {/* 획득 배지 */}
      <td className="px-3 py-3 text-base">
        {game.newBadges && game.newBadges.length > 0 ? (
          <div className="flex gap-1 flex-wrap">
            {game.newBadges.map((badge, index) => (
              <span
                key={badge.id || `badge-${index}`}
                className="inline-block px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-sm font-semibold whitespace-nowrap"
                title={badge.name}
              >
                {badge.icon}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
    </tr>
  );
}

/**
 * 커스텀 툴팁 컴포넌트 (날짜 정보 포함)
 */
function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-300 rounded-lg shadow-lg">
        <p className="font-bold text-gray-800 mb-1">{payload[0].payload.경기}</p>
        <p className="text-sm text-gray-600 mb-2">📅 {payload[0].payload.날짜}</p>
        {payload.map((entry, index) => (
          <p key={index} style={{ color: entry.color }} className="text-sm">
            {entry.name}: <span className="font-bold">{entry.value}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
}

/**
 * 상세 통계 모달
 */
function StatsDetailModal({ games, onClose }) {
  console.log('📊 [StatsDetailModal] 받은 경기 수:', games.length);
  console.log('📊 [StatsDetailModal] 경기 목록:', games);

  // 차트 데이터 준비 (오래된 경기부터 최신 순으로 정렬)
  const sortedByDate = [...games].sort((a, b) => new Date(a.date) - new Date(b.date));

  console.log('📊 [StatsDetailModal] 정렬된 경기 수:', sortedByDate.length);

  const chartData = sortedByDate.map((game, index) => {
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    };

    return {
      경기: `${index + 1}회`,
      날짜: formatDate(game.date),
      안타: game.stats.hits || 0,
      득점: game.stats.runs || 0,
      수비: game.stats.goodDefense || 0,
      쿠키: game.stats.bonusCookie || 0
    };
  });

  console.log('📊 [StatsDetailModal] 차트 데이터 개수:', chartData.length);
  console.log('📊 [StatsDetailModal] 차트 데이터:', chartData);
  chartData.forEach((data, index) => {
    console.log(`  [${index}] 날짜: "${data.날짜}", 안타: ${data.안타}, 득점: ${data.득점}`);
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* 헤더 */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
          <h3 className="text-2xl font-bold">📊 상세 통계 분석</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>

        {/* 내용 */}
        <div className="p-6 space-y-8">
          {chartData.length === 0 ? (
            <p className="text-center text-gray-500 py-12">데이터가 없습니다.</p>
          ) : (
            <>
              {/* 안타 추이 */}
              <div>
                <h4 className="text-lg font-bold mb-4">⚾ 안타 추이</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData} margin={{ top: 20, left: 10, right: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="경기" padding={{ left: 10, right: 10 }} />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="안타"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      dot={{ r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 득점 추이 */}
              <div>
                <h4 className="text-lg font-bold mb-4">🏃 득점 추이</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData} margin={{ top: 20, left: 10, right: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="경기" padding={{ left: 10, right: 10 }} />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="득점"
                      stroke="#10b981"
                      strokeWidth={3}
                      dot={{ r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 수비 추이 */}
              <div>
                <h4 className="text-lg font-bold mb-4">🛡️ 수비 추이</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData} margin={{ top: 20, left: 10, right: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="경기" padding={{ left: 10, right: 10 }} />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="수비"
                      stroke="#f59e0b"
                      strokeWidth={3}
                      dot={{ r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 쿠키 추이 */}
              <div>
                <h4 className="text-lg font-bold mb-4">🍪 쿠키 추이</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={chartData} margin={{ top: 20, left: 10, right: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="경기" padding={{ left: 10, right: 10 }} />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="쿠키"
                      stroke="#8b5cf6"
                      strokeWidth={3}
                      dot={{ r: 5 }}
                      activeDot={{ r: 7 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* 종합 비교 (바 차트) */}
              <div>
                <h4 className="text-lg font-bold mb-4">📈 종합 비교</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData} margin={{ top: 20, left: 10, right: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="경기" padding={{ left: 10, right: 10 }} />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="안타" fill="#3b82f6" />
                    <Bar dataKey="득점" fill="#10b981" />
                    <Bar dataKey="수비" fill="#f59e0b" />
                    <Bar dataKey="쿠키" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="sticky bottom-0 bg-gray-50 border-t px-6 py-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}
