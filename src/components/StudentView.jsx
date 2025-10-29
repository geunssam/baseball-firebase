import { useState, useEffect } from 'react';
import { useStudentAuth } from '../contexts/StudentAuthContext';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { BADGES } from '../utils/badgeSystem';

// 🔹 배지 티어 정의
const BADGE_TIERS = {
  BEGINNER: 1,   // 🥉 입문
  SKILLED: 2,    // 🥈 숙련
  MASTER: 3,     // 🥇 마스터
  LEGEND: 4,     // 👑 레전드
  SPECIAL: 5     // ⭐ 특별
};

export default function StudentView() {
  const { studentData, logout } = useStudentAuth();
  const [stats, setStats] = useState(null);
  const [badges, setBadges] = useState([]);
  const [classRanking, setClassRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 🔹 학생 데이터 로드 (1분마다 자동 갱신)
  useEffect(() => {
    if (studentData?.playerId) {
      loadStudentData();

      // 1분(60초)마다 자동 갱신
      const interval = setInterval(() => {
        console.log('🔄 자동 갱신 중...');
        loadStudentData();
      }, 60000);

      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentData?.playerId]);

  const loadStudentData = async () => {
    console.log('🟢 StudentView: Loading data for student:', studentData);

    try {
      setLoading(true);
      setError('');

      // 1️⃣ 개인 통계 조회 (playerHistory에서 집계)
      const historyRef = collection(db, 'users', studentData.teacherId, 'playerHistory');
      const historyDocRef = query(historyRef, where('playerId', '==', studentData.playerId));
      const historySnapshot = await getDocs(historyDocRef);

      let totalStats = {
        total_games: 0,
        total_hits: 0,
        total_runs: 0,
        total_homeruns: 0,
        total_good_defense: 0,
        total_bonus_cookie: 0,
      };

      if (!historySnapshot.empty) {
        const historyData = historySnapshot.docs[0].data();
        const games = historyData.games || [];

        games.forEach(game => {
          totalStats.total_games++;
          totalStats.total_hits += game.stats?.hits || 0;
          totalStats.total_runs += game.stats?.runs || 0;
          totalStats.total_homeruns += game.stats?.homerun || 0;
          totalStats.total_good_defense += game.stats?.goodDefense || 0;
          totalStats.total_bonus_cookie += game.stats?.bonusCookie || 0;
        });
      }

      // 📌 진행 중인 경기에서 현재 스탯 추가 (새로 추가)
      try {
        const gamesRef = collection(db, 'users', studentData.teacherId, 'games');

        // 🔍 디버깅: 모든 경기 먼저 확인
        const allGamesSnapshot = await getDocs(gamesRef);
        console.log('🔍 [DEBUG] 전체 경기 수:', allGamesSnapshot.size);
        allGamesSnapshot.forEach(doc => {
          const game = doc.data();
          console.log('🔍 [DEBUG] 경기 ID:', doc.id, '/ Status:', game.status, '/ 팀:', game.teamA?.name, 'vs', game.teamB?.name);
        });

        const gamesQuery = query(gamesRef, where('status', '==', 'playing'));
        const gamesSnapshot = await getDocs(gamesQuery);

        console.log('🎮 진행 중인 경기 수:', gamesSnapshot.size);

        gamesSnapshot.forEach(gameDoc => {
          const game = gameDoc.data();

          console.log('🔍 [DEBUG] 경기 처리 중:', gameDoc.id);
          console.log('🔍 [DEBUG] 찾는 학생 playerId:', studentData.playerId);

          // teamA와 teamB 라인업에서 해당 학생 찾기
          const allPlayers = [
            ...(game.teamA?.lineup || []),
            ...(game.teamB?.lineup || [])
          ];

          console.log('🔍 [DEBUG] 전체 라인업 선수 수:', allPlayers.length);
          allPlayers.forEach((p, idx) => {
            console.log(`🔍 [DEBUG] 선수 ${idx}: id=${p.id}, playerId=${p.playerId}, name=${p.name}`);
          });

          const currentPlayer = allPlayers.find(
            p => (p.id === studentData.playerId || p.playerId === studentData.playerId)
          );

          if (currentPlayer) {
            console.log('✅ [DEBUG] 학생 찾음!', currentPlayer.name, '스탯:', currentPlayer.stats);
          } else {
            console.log('⚠️ [DEBUG] 학생을 라인업에서 찾지 못함!');
          }

          if (currentPlayer?.stats) {
            // 진행 중인 경기 스탯 추가
            totalStats.total_hits += currentPlayer.stats.hits || 0;
            totalStats.total_runs += currentPlayer.stats.runs || 0;
            totalStats.total_homeruns += currentPlayer.stats.homerun || 0;
            totalStats.total_good_defense += currentPlayer.stats.goodDefense || 0;
            totalStats.total_bonus_cookie += currentPlayer.stats.bonusCookie || 0;

            console.log('✅ 진행 중인 경기 스탯 추가:', {
              player: currentPlayer.name,
              stats: currentPlayer.stats
            });
          }
        });
      } catch (error) {
        console.warn('⚠️ 진행 중인 경기 조회 실패:', error);
        // 에러가 나도 기존 스탯은 표시
      }

      setStats(totalStats);

      // 2️⃣ 배지 조회
      const badgesRef = collection(db, 'users', studentData.teacherId, 'playerBadges');
      const badgesDocRef = query(badgesRef, where('playerId', '==', studentData.playerId));
      const badgesSnapshot = await getDocs(badgesDocRef);

      let earnedBadges = [];
      if (!badgesSnapshot.empty) {
        const badgesData = badgesSnapshot.docs[0].data();
        earnedBadges = badgesData.badges || [];
      }

      // 배지 상세 정보와 결합
      const badgesWithDetails = earnedBadges.map(badgeId => {
        const badge = Object.values(BADGES).find(b => b.id === badgeId);
        return {
          badge_id: badgeId,
          badge: badge || { name: '알 수 없는 배지', icon: '🏅', tier: 1 },
          earned_at: new Date().toISOString(), // 획득 날짜 (추후 추가 가능)
        };
      });

      setBadges(badgesWithDetails);

      // 3️⃣ 반 랭킹 조회 (같은 선생님의 같은 반 학생들만)
      const studentsRef = collection(db, 'users', studentData.teacherId, 'students');
      const studentsQuery = query(
        studentsRef,
        where('className', '==', studentData.className)
      );
      const studentsSnapshot = await getDocs(studentsQuery);

      console.log('🔍 StudentView: 반 학생 수:', studentsSnapshot.size);

      const classStudentIds = studentsSnapshot.docs.map(doc => doc.id);

      // 각 학생의 통계를 계산 (playerHistory에서)
      const rankingData = [];
      for (const studentId of classStudentIds) {
        const studentDoc = studentsSnapshot.docs.find(doc => doc.id === studentId);
        const studentInfo = studentDoc.data();

        const historyQuery = query(
          collection(db, 'users', studentData.teacherId, 'playerHistory'),
          where('playerId', '==', studentInfo.playerId || studentId)
        );
        const historySnap = await getDocs(historyQuery);

        let studentStats = {
          student_id: studentId,
          name: studentInfo.name,
          total_games: 0,
          total_hits: 0,
          total_runs: 0,
          total_good_defense: 0,
          total_bonus_cookie: 0,
          total_points: 0,
        };

        if (!historySnap.empty) {
          const games = historySnap.docs[0].data().games || [];
          games.forEach(game => {
            studentStats.total_games++;
            studentStats.total_hits += game.stats?.hits || 0;
            studentStats.total_runs += game.stats?.runs || 0;
            studentStats.total_good_defense += game.stats?.goodDefense || 0;
            studentStats.total_bonus_cookie += game.stats?.bonusCookie || 0;
          });
        }

        // 📌 진행 중인 경기 스탯도 추가 (우리 반 랭킹용)
        try {
          const activeGamesRef = collection(db, 'users', studentData.teacherId, 'games');
          const activeGamesQuery = query(activeGamesRef, where('status', '==', 'playing'));
          const activeGamesSnapshot = await getDocs(activeGamesQuery);

          activeGamesSnapshot.forEach(gameDoc => {
            const game = gameDoc.data();
            const allPlayers = [
              ...(game.teamA?.lineup || []),
              ...(game.teamB?.lineup || [])
            ];

            const currentPlayer = allPlayers.find(
              p => (p.id === (studentInfo.playerId || studentId) || p.playerId === (studentInfo.playerId || studentId))
            );

            if (currentPlayer?.stats) {
              studentStats.total_hits += currentPlayer.stats.hits || 0;
              studentStats.total_runs += currentPlayer.stats.runs || 0;
              studentStats.total_good_defense += currentPlayer.stats.goodDefense || 0;
              studentStats.total_bonus_cookie += currentPlayer.stats.bonusCookie || 0;
            }
          });
        } catch (error) {
          console.warn('⚠️ 반 랭킹: 진행 중인 경기 조회 실패 (학생:', studentInfo.name, '):', error);
        }

        // 총점 계산 (안타 + 득점 + 수비 + 쿠키)
        studentStats.total_points =
          studentStats.total_hits +
          studentStats.total_runs +
          studentStats.total_good_defense +
          studentStats.total_bonus_cookie;

        rankingData.push(studentStats);
      }

      // 총점 기준 내림차순 정렬
      rankingData.sort((a, b) => b.total_points - a.total_points);
      setClassRanking(rankingData.slice(0, 10)); // 상위 10명만

    } catch (err) {
      console.error('❌ Failed to load student data:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      console.log('✅ StudentView: Data loading complete, setting loading to false');
      setLoading(false);
    }
  };

  // 🔹 배지 등급별 색상
  const getTierColor = (tier) => {
    const tierColors = {
      [BADGE_TIERS.BEGINNER]: 'from-gray-400 to-gray-500',
      [BADGE_TIERS.SKILLED]: 'from-green-400 to-green-500',
      [BADGE_TIERS.MASTER]: 'from-blue-400 to-blue-500',
      [BADGE_TIERS.SPECIAL]: 'from-purple-400 to-purple-500',
      [BADGE_TIERS.LEGEND]: 'from-yellow-400 to-orange-500'
    };
    return tierColors[tier] || 'from-gray-400 to-gray-500';
  };

  const getTierLabel = (tier) => {
    const tierNames = {
      [BADGE_TIERS.BEGINNER]: '🥉 입문',
      [BADGE_TIERS.SKILLED]: '🥈 숙련',
      [BADGE_TIERS.MASTER]: '🥇 마스터',
      [BADGE_TIERS.LEGEND]: '👑 레전드',
      [BADGE_TIERS.SPECIAL]: '⭐ 특별'
    };
    return tierNames[tier] || '🥉 입문';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-100 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-xl font-bold text-gray-700">데이터 로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-100 via-blue-100 to-purple-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-2">
                🎓 {studentData.name}
              </h1>
              <p className="text-lg text-gray-600">
                {studentData.className}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  console.log('🔄 수동 새로고침 시작');
                  loadStudentData();
                }}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg hover:shadow-xl flex items-center gap-2"
                disabled={loading}
              >
                {loading ? '🔄 갱신 중...' : '🔄 새로고침'}
              </button>
              <button
                onClick={() => {
                  if (confirm('로그아웃하시겠습니까?')) {
                    logout();
                  }
                }}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg font-semibold transition shadow-lg hover:shadow-xl"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 text-red-700 px-6 py-4 rounded-xl mb-6">
            ❌ {error}
          </div>
        )}

        {/* 통계 카드 */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            📊 나의 통계
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-3 rounded-xl text-center">
              <div className="text-3xl font-bold text-blue-600">{stats?.total_games || 0}</div>
              <div className="text-sm text-gray-600 mt-1 font-bold">경기 수</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 p-3 rounded-xl text-center">
              <div className="text-3xl font-bold text-green-600">{stats?.total_hits || 0}</div>
              <div className="text-sm text-gray-600 mt-1 font-bold">안타</div>
            </div>
            <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-3 rounded-xl text-center">
              <div className="text-3xl font-bold text-yellow-600">{stats?.total_runs || 0}</div>
              <div className="text-sm text-gray-600 mt-1 font-bold">득점</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-3 rounded-xl text-center">
              <div className="text-3xl font-bold text-purple-600">{stats?.total_good_defense || 0}</div>
              <div className="text-sm text-gray-600 mt-1 font-bold">수비</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-3 rounded-xl text-center">
              <div className="text-3xl font-bold text-orange-600">{stats?.total_bonus_cookie || 0}</div>
              <div className="text-sm text-gray-600 mt-1 font-bold">쿠키</div>
            </div>
            <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-3 rounded-xl text-center">
              <div className="text-3xl font-bold text-teal-600">{badges.length}</div>
              <div className="text-sm text-gray-600 mt-1 font-bold">배지 수</div>
            </div>
          </div>
        </div>

        {/* 배지 컬렉션 */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            🏅 나의 배지
          </h2>
          {badges.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-lg">아직 획득한 배지가 없습니다.</p>
              <p className="text-sm mt-2">열심히 활동해서 배지를 모아보세요!</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {badges.map((badge, index) => (
                <div
                  key={index}
                  className={`bg-gradient-to-br ${getTierColor(badge.badge?.tier)} p-4 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer`}
                >
                  <div className="text-center">
                    <div className="text-5xl mb-2">{badge.badge?.icon || '🏅'}</div>
                    <div className="text-white font-bold text-sm mb-1">
                      {badge.badge?.name || '배지'}
                    </div>
                    <div className="text-white text-xs opacity-90 mb-2">
                      {getTierLabel(badge.badge?.tier)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 반 랭킹 */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            🏆 우리 반 랭킹
          </h2>
          {classRanking.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">👥</div>
              <p className="text-lg">아직 랭킹 데이터가 없습니다.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-3 text-left">순위</th>
                    <th className="p-3 text-left">이름</th>
                    <th className="p-3 text-center">경기 수</th>
                    <th className="p-3 text-center">안타</th>
                    <th className="p-3 text-center">득점</th>
                    <th className="p-3 text-center">수비</th>
                    <th className="p-3 text-center">쿠키</th>
                    <th className="p-3 text-center">총점</th>
                  </tr>
                </thead>
                <tbody>
                  {classRanking.map((player, index) => {
                    const isMe = player.student_id === studentData.id;
                    return (
                      <tr
                        key={index}
                        className={`border-t ${isMe ? 'bg-blue-50 font-bold' : 'hover:bg-gray-50'}`}
                      >
                        <td className="p-3">
                          {index === 0 && '🥇'}
                          {index === 1 && '🥈'}
                          {index === 2 && '🥉'}
                          {index > 2 && `${index + 1}위`}
                        </td>
                        <td className="p-3">
                          {player.name || '알 수 없음'}
                          {isMe && ' (나)'}
                        </td>
                        <td className="p-3 text-center">{player.total_games || 0}</td>
                        <td className="p-3 text-center">{player.total_hits || 0}</td>
                        <td className="p-3 text-center">{player.total_runs || 0}</td>
                        <td className="p-3 text-center">{player.total_good_defense || 0}</td>
                        <td className="p-3 text-center">{player.total_bonus_cookie || 0}</td>
                        <td className="p-3 text-center">{player.total_points || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
