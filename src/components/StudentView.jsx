import { useState, useEffect } from 'react';
import { useStudentAuth } from '../contexts/StudentAuthContext';
import { collection, query, where, getDocs, doc, getDoc, orderBy, limit } from 'firebase/firestore';
import { db } from '../config/firebase';
import { BADGES } from '../utils/badgeSystem';
import StudentGameHistory from './StudentGameHistory';
import { getPlayerDetailedHistory, updatePlayerBadgeOrder } from '../services/firestoreService';
import PlayerBadgeOrderModal from './PlayerBadgeOrderModal';
import { getNextBadgesProgress } from '../utils/badgeProgress';
import { BADGE_CATEGORIES } from '../utils/badgeCategories';

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
  const [isBadgeOrderModalOpen, setIsBadgeOrderModalOpen] = useState(false);
  const [showProgressModal, setShowProgressModal] = useState(false);

  // 🔹 학생 데이터 로드 (최초 1회만)
  useEffect(() => {
    if (studentData?.playerId) {
      loadStudentData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentData?.playerId]);

  const loadStudentData = async () => {
    console.log('🟢 StudentView: Loading data for student:', studentData);

    try {
      setLoading(true);
      setError('');

      // 1️⃣ 개인 통계 조회 (playerHistory에서 집계)
      const historyDocRef = doc(db, 'users', studentData.teacherId, 'playerHistory', studentData.playerId);
      const historySnapshot = await getDoc(historyDocRef);

      let totalStats = {
        gamesPlayed: 0,
        totalHits: 0,
        totalRuns: 0,
        totalHomeruns: 0,
        totalGoodDefense: 0,
        totalBonusCookie: 0,
        mvpCount: 0,
        totalPoints: 0,
        totalBadges: 0
      };

      if (historySnapshot.exists()) {
        const historyData = historySnapshot.data();
        const games = historyData.games || [];

        games.forEach(game => {
          totalStats.gamesPlayed++;
          totalStats.totalHits += game.stats?.hits || 0;
          totalStats.totalRuns += game.stats?.runs || 0;
          totalStats.totalHomeruns += game.stats?.homerun || 0;
          totalStats.totalGoodDefense += game.stats?.goodDefense || 0;
          totalStats.totalBonusCookie += game.stats?.bonusCookie || 0;
          if (game.isMVP) totalStats.mvpCount++;
        });

        // 총점 계산
        totalStats.totalPoints = totalStats.totalHits + totalStats.totalRuns +
                                  totalStats.totalGoodDefense + totalStats.totalBonusCookie;
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
            totalStats.totalHits += currentPlayer.stats.hits || 0;
            totalStats.totalRuns += currentPlayer.stats.runs || 0;
            totalStats.totalHomeruns += currentPlayer.stats.homerun || 0;
            totalStats.totalGoodDefense += currentPlayer.stats.goodDefense || 0;
            totalStats.totalBonusCookie += currentPlayer.stats.bonusCookie || 0;

            // 총점 재계산
            totalStats.totalPoints = totalStats.totalHits + totalStats.totalRuns +
                                      totalStats.totalGoodDefense + totalStats.totalBonusCookie;

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

      // 2️⃣ 배지 조회 (수여일 포함)
      const badgesDocRef = doc(db, 'users', studentData.teacherId, 'playerBadges', studentData.playerId);
      const badgesSnapshot = await getDoc(badgesDocRef);

      let earnedBadges = [];
      if (badgesSnapshot.exists()) {
        const badgesData = badgesSnapshot.data();
        earnedBadges = badgesData.badges || [];
      }

      // totalStats에 배지 개수 추가 (완전체 배지 진행도 계산용)
      totalStats.totalBadges = earnedBadges.length;

      // 배지별 수여일 찾기 (getPlayerDetailedHistory 사용)
      const detailedHistory = await getPlayerDetailedHistory(studentData.teacherId, studentData.playerId);

      console.log('🔍 [배지 날짜 디버깅] 상세 경기 기록 개수:', detailedHistory.length);

      const badgeAwardDates = {};

      // 오래된 순서로 정렬하여 처음 수여된 날짜 찾기
      const sortedHistory = [...detailedHistory].sort((a, b) =>
        new Date(a.date) - new Date(b.date)
      );

      sortedHistory.forEach((game, idx) => {
        console.log(`🔍 [경기 ${idx}] date:`, game.date, '/ newBadges:', game.newBadges);

        if (game.newBadges && Array.isArray(game.newBadges) && game.newBadges.length > 0) {
          game.newBadges.forEach(badge => {
            const badgeId = typeof badge === 'string' ? badge : badge.id;
            console.log(`  ✅ 배지 발견: ${badgeId} / 날짜: ${game.date}`);
            if (!badgeAwardDates[badgeId]) {
              badgeAwardDates[badgeId] = game.date;
            }
          });
        }
      });

      console.log('🔍 [최종] badgeAwardDates 객체:', badgeAwardDates);

      // 배지 상세 정보와 결합
      const badgesWithDetails = earnedBadges.map(badgeId => {
        const badge = Object.values(BADGES).find(b => b.id === badgeId);
        return {
          badge_id: badgeId,
          badge: badge || { name: '알 수 없는 배지', icon: '🏅', tier: 1 },
          earned_at: badgeAwardDates[badgeId] || null,
        };
      });

      // 수여일 기준 내림차순 정렬 (최신 배지가 앞에)
      badgesWithDetails.sort((a, b) => {
        if (!a.earned_at) return 1;
        if (!b.earned_at) return -1;
        return new Date(b.earned_at) - new Date(a.earned_at);
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

        const historyDocRef = doc(db, 'users', studentData.teacherId, 'playerHistory', studentInfo.playerId || studentId);
        const historySnap = await getDoc(historyDocRef);

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

        if (historySnap.exists()) {
          const games = historySnap.data().games || [];
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
      setClassRanking(rankingData); // 전체 학생 표시

    } catch (err) {
      console.error('❌ Failed to load student data:', err);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
    } finally {
      console.log('✅ StudentView: Data loading complete, setting loading to false');
      setLoading(false);
    }
  };

  // 🔹 배지 순서 저장 핸들러
  const handleSaveBadgeOrder = async (newBadgeOrder) => {
    try {
      await updatePlayerBadgeOrder(
        studentData.teacherId,
        studentData.playerId,
        newBadgeOrder
      );

      // 배지 순서 업데이트
      const updatedBadges = newBadgeOrder.map(badgeId => {
        return badges.find(b => b.badge_id === badgeId);
      }).filter(Boolean);

      setBadges(updatedBadges);
      setIsBadgeOrderModalOpen(false);
    } catch (error) {
      console.error('배지 순서 저장 실패:', error);
      setError('배지 순서를 저장하는 중 오류가 발생했습니다.');
    }
  };

  // 🔹 배지 등급별 색상 (옅은 파스텔톤)
  const getTierColor = (tier) => {
    const tierColors = {
      [BADGE_TIERS.BEGINNER]: 'from-gray-200 to-gray-300',      // 옅은 회색
      [BADGE_TIERS.SKILLED]: 'from-green-200 to-green-300',     // 옅은 그린
      [BADGE_TIERS.MASTER]: 'from-blue-200 to-blue-300',        // 옅은 블루
      [BADGE_TIERS.SPECIAL]: 'from-purple-200 to-purple-300',   // 옅은 퍼플
      [BADGE_TIERS.LEGEND]: 'from-yellow-200 to-amber-300'      // 옅은 골드
    };
    return tierColors[tier] || 'from-gray-200 to-gray-300';
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
          <div className="flex items-center justify-between">
            {/* 왼쪽: 대시보드 버튼 */}
            <button
              onClick={() => {
                logout();
              }}
              className="bg-sky-100 hover:bg-sky-200 text-gray-800 px-6 py-3 rounded-lg font-bold transition shadow-lg hover:shadow-xl text-lg flex-shrink-0"
            >
              ← 대시보드
            </button>

            {/* 가운데: 이름 (배경색) */}
            <div className="absolute left-1/2 transform -translate-x-1/2">
              <div className="bg-gradient-to-r from-purple-100 to-pink-100 px-6 py-3 rounded-xl shadow-lg">
                <h1 className="text-3xl font-bold text-black whitespace-nowrap">
                  🎓 {studentData.name} <span className="text-xl text-gray-700">({studentData.className})</span>
                </h1>
              </div>
            </div>

            {/* 우측: 빈 공간 (레이아웃 균형) */}
            <div className="w-[140px] flex-shrink-0"></div>
          </div>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border-2 border-red-300 text-red-700 px-6 py-4 rounded-xl mb-6">
            ❌ {error}
          </div>
        )}

        {/* 배지 컬렉션 */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gradient-to-r from-yellow-100 to-orange-100 px-4 py-2 rounded-lg">
              <h2 className="text-3xl font-bold text-black flex items-center gap-2">
                🏅 나의 배지
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowProgressModal(true)}
                className="px-4 py-2 bg-green-100 hover:bg-green-200 text-black rounded-lg transition-colors font-bold"
              >
                📊 진행상황 보기
              </button>
              {badges.length > 0 && (
                <button
                  onClick={() => setIsBadgeOrderModalOpen(true)}
                  className="px-4 py-2 bg-sky-100 hover:bg-sky-200 text-black rounded-lg transition-colors font-bold"
                >
                  🔀 배지 순서 변경
                </button>
              )}
            </div>
          </div>
          {badges.length === 0 ? (
            <div className="text-center py-12 text-black">
              <div className="text-6xl mb-4">🎯</div>
              <p className="text-lg font-bold">아직 획득한 배지가 없습니다.</p>
              <p className="text-sm mt-2 font-bold">열심히 활동해서 배지를 모아보세요!</p>
            </div>
          ) : (
            <div className={`grid ${
              badges.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' :
              badges.length === 2 ? 'grid-cols-2 max-w-2xl mx-auto' :
              badges.length === 3 ? 'grid-cols-3 max-w-4xl mx-auto' :
              badges.length === 4 ? 'grid-cols-4 max-w-5xl mx-auto' :
              'grid-cols-5'
            } gap-4`}>
              {badges.map((badge, index) => {
                const formatDate = (dateString) => {
                  if (!dateString) return '날짜 미상';
                  const date = new Date(dateString);
                  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`;
                };

                return (
                  <div
                    key={index}
                    className={`bg-gradient-to-br ${getTierColor(badge.badge?.tier)} p-5 rounded-xl shadow-lg hover:shadow-xl transition-all cursor-pointer`}
                  >
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-3 mb-2">
                        <span className="text-5xl">{badge.badge?.icon || '🏅'}</span>
                        <div className="text-left">
                          <div className="text-black font-bold text-base">
                            {badge.badge?.name || '배지'} <span className="text-black font-bold text-sm">({getTierLabel(badge.badge?.tier)})</span>
                          </div>
                          <div className="text-black font-bold text-sm mt-1">
                            📅 {formatDate(badge.earned_at)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 경기 기록 */}
        <div className="mb-6">
          <StudentGameHistory
            playerId={studentData?.playerId}
            teacherId={studentData?.teacherId}
          />
        </div>

        {/* 반 랭킹 */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="bg-gradient-to-r from-green-100 to-teal-100 px-4 py-2 rounded-lg inline-block mb-4">
            <h2 className="text-3xl font-bold text-black flex items-center gap-2">
              🏆 우리 반 랭킹
            </h2>
          </div>
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
                    <th className="p-3 text-left text-base">순위</th>
                    <th className="p-3 text-left text-base">이름</th>
                    <th className="p-3 text-center text-base">경기 수</th>
                    <th className="p-3 text-center text-base">안타</th>
                    <th className="p-3 text-center text-base">득점</th>
                    <th className="p-3 text-center text-base">수비</th>
                    <th className="p-3 text-center text-base">쿠키</th>
                    <th className="p-3 text-center text-base">총점</th>
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
                        <td className="p-3 text-base">
                          {index === 0 && '🥇'}
                          {index === 1 && '🥈'}
                          {index === 2 && '🥉'}
                          {index > 2 && `${index + 1}위`}
                        </td>
                        <td className="p-3 text-base">
                          {player.name || '알 수 없음'}
                          {isMe && ' (나)'}
                        </td>
                        <td className="p-3 text-center text-base">{player.total_games || 0}</td>
                        <td className="p-3 text-center text-base">{player.total_hits || 0}</td>
                        <td className="p-3 text-center text-base">{player.total_runs || 0}</td>
                        <td className="p-3 text-center text-base">{player.total_good_defense || 0}</td>
                        <td className="p-3 text-center text-base">{player.total_bonus_cookie || 0}</td>
                        <td className="p-3 text-center text-base">{player.total_points || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 배지 진행상황 모달 */}
        {showProgressModal && (
          <div
            className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]"
            onClick={() => setShowProgressModal(false)}
          >
            <div
              className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="bg-gradient-to-r from-purple-100 to-indigo-100 px-4 py-2 rounded-lg">
                  <h3 className="text-2xl font-bold text-black">📊 다음 배지 진행도</h3>
                </div>
                <button
                  onClick={() => setShowProgressModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                {(() => {
                  // 현재 배지 ID 목록
                  const currentBadgeIds = badges.map(b => b.badge_id);

                  // 진행상황 계산
                  const progressData = getNextBadgesProgress(
                    stats || {},
                    currentBadgeIds,
                    BADGES,
                    true
                  );

                  // 모든 카테고리별 진행도 생성
                  const allCategoryProgress = Object.values(BADGE_CATEGORIES)
                    .filter(cat => cat.id !== 'special')
                    .map(category => {
                      const found = progressData.find(p => p.category === category.id);
                      if (found) return found;

                      return {
                        badge: {
                          icon: category.icon,
                          name: category.name,
                          description: category.description
                        },
                        progress: 0,
                        current: 0,
                        target: 1,
                        category: category.id
                      };
                    });

                  if (allCategoryProgress.length === 0) {
                    return (
                      <div className="text-center py-8 text-gray-500">
                        <div className="text-5xl mb-3">🎉</div>
                        <p className="text-lg font-semibold">모든 배지를 획득했습니다!</p>
                      </div>
                    );
                  }

                  return allCategoryProgress.map((progress, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-3xl">{progress.badge.icon}</span>
                        <div className="flex-1">
                          <div className="font-semibold text-base text-gray-800">
                            {progress.badge.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {progress.badge.description}
                          </div>
                        </div>
                      </div>

                      {/* 진행도 바 */}
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 rounded-full h-4 overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-yellow-400 to-orange-400 h-full transition-all duration-300"
                            style={{ width: `${progress.progress}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 font-semibold whitespace-nowrap min-w-[60px] text-right">
                          {progress.current}/{progress.target} ({Math.round(progress.progress)}%)
                        </span>
                      </div>
                    </div>
                  ));
                })()}
              </div>

              <button
                onClick={() => setShowProgressModal(false)}
                className="w-full mt-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold text-gray-700 transition-colors"
              >
                닫기
              </button>
            </div>
          </div>
        )}

        {/* 배지 순서 변경 모달 */}
        <PlayerBadgeOrderModal
          open={isBadgeOrderModalOpen}
          onOpenChange={setIsBadgeOrderModalOpen}
          player={{
            name: studentData?.playerName || '학생',
            badges: badges.map(b => b.badge_id)
          }}
          allBadges={BADGES}
          onSave={handleSaveBadgeOrder}
        />
      </div>
    </div>
  );
}
