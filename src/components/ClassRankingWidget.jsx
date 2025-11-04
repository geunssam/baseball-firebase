import { useState, useEffect } from 'react';
import { collection, getDocs, doc, getDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { Card } from './ui/card';

/**
 * 학급별 랭킹 위젯 컴포넌트
 * - 컴팩트한 1줄 UI
 * - 클릭 시 상세 모달 표시
 */
export default function ClassRankingWidget({ teacherId, onClassClick }) {
  const [rankings, setRankings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (teacherId) {
      loadRankings();
    }
  }, [teacherId]);

  const loadRankings = async () => {
    try {
      setLoading(true);

      // 모든 학생 가져오기
      const studentsRef = collection(db, 'users', teacherId, 'students');
      const studentsSnapshot = await getDocs(studentsRef);

      // 진행 중인 경기 한 번만 조회 (성능 개선)
      let activeGames = [];
      try {
        const activeGamesRef = collection(db, 'users', teacherId, 'games');
        const activeGamesQuery = query(activeGamesRef, where('status', '==', 'playing'));
        const activeGamesSnapshot = await getDocs(activeGamesQuery);
        activeGames = activeGamesSnapshot.docs.map(doc => doc.data());
      } catch (error) {
        console.warn('⚠️ 진행 중인 경기 조회 실패:', error);
      }

      // 학급별로 그룹화
      const classMap = new Map();

      // 병렬 처리로 속도 개선
      const promises = studentsSnapshot.docs.map(async (studentDoc) => {
        const studentData = studentDoc.data();
        const className = studentData.className;

        if (!className) return null;

        // playerHistory에서 포인트 가져오기
        const historyDocRef = doc(db, 'users', teacherId, 'playerHistory', studentData.playerId || studentDoc.id);
        const historySnap = await getDoc(historyDocRef);

        let stats = {
          hits: 0,
          runs: 0,
          defense: 0,
          cookie: 0
        };

        if (historySnap.exists()) {
          const games = historySnap.data().games || [];
          games.forEach(game => {
            stats.hits += game.stats?.hits || 0;
            stats.runs += game.stats?.runs || 0;
            stats.defense += game.stats?.goodDefense || 0;
            stats.cookie += game.stats?.bonusCookie || 0;
          });
        }

        // 진행 중인 경기 스탯 추가 (이미 조회한 데이터 사용)
        activeGames.forEach(game => {
          const allPlayers = [
            ...(game.teamA?.lineup || []),
            ...(game.teamB?.lineup || [])
          ];

          const currentPlayer = allPlayers.find(
            p => (p.id === (studentData.playerId || studentDoc.id) ||
                  p.playerId === (studentData.playerId || studentDoc.id))
          );

          if (currentPlayer?.stats) {
            stats.hits += currentPlayer.stats.hits || 0;
            stats.runs += currentPlayer.stats.runs || 0;
            stats.defense += currentPlayer.stats.goodDefense || 0;
            stats.cookie += currentPlayer.stats.bonusCookie || 0;
          }
        });

        const totalPoints = stats.hits + stats.runs + stats.defense + stats.cookie;

        return { className, totalPoints, stats };
      });

      const results = await Promise.all(promises);

      // 학급별 집계
      results.forEach(result => {
        if (!result) return;

        const { className, totalPoints, stats } = result;

        if (!classMap.has(className)) {
          classMap.set(className, {
            className,
            totalPoints: 0,
            studentCount: 0,
            avgPoints: 0,
            totalHits: 0,
            totalRuns: 0,
            totalDefense: 0,
            totalCookie: 0
          });
        }

        const classData = classMap.get(className);
        classData.totalPoints += totalPoints;
        classData.studentCount += 1;
        classData.totalHits += stats.hits;
        classData.totalRuns += stats.runs;
        classData.totalDefense += stats.defense;
        classData.totalCookie += stats.cookie;
      });

      // 평균 계산 및 배열 변환
      const classRankings = Array.from(classMap.values()).map(classData => ({
        ...classData,
        avgPoints: classData.studentCount > 0
          ? Math.round(classData.totalPoints / classData.studentCount)
          : 0
      }));

      // 총점 기준 내림차순 정렬
      classRankings.sort((a, b) => b.totalPoints - a.totalPoints);

      console.log('🏆 [ClassRankingWidget] 학급별 랭킹 데이터:', classRankings);

      setRankings(classRankings);
    } catch (error) {
      console.error('학급 랭킹 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (index) => {
    if (index === 0) return '🥇';
    if (index === 1) return '🥈';
    if (index === 2) return '🥉';
    return `${index + 1}등`;
  };

  if (loading) {
    return (
      <Card className="p-4">
        <h3 className="text-xl font-bold mb-3">🏆 학급별 랭킹</h3>
        <div className="text-center py-4 text-gray-500">로딩 중...</div>
      </Card>
    );
  }

  if (rankings.length === 0) {
    return (
      <Card className="p-4">
        <h3 className="text-xl font-bold mb-3">🏆 학급별 랭킹</h3>
        <div className="text-center py-4 text-gray-500">
          학급 데이터가 없습니다.
        </div>
      </Card>
    );
  }

  // 상위 3개와 나머지 분리
  const topThree = rankings.slice(0, 3);
  const restOfRankings = rankings.slice(3);

  // 포디움 순서: 2등(왼쪽), 1등(중앙), 3등(오른쪽)
  const podiumOrder = topThree.length >= 3
    ? [topThree[1], topThree[0], topThree[2]]
    : topThree.length === 2
    ? [topThree[1], topThree[0], null]
    : topThree.length === 1
    ? [null, topThree[0], null]
    : [null, null, null];

  const renderPodiumCard = (classData, rank) => {
    if (!classData) return <div className="flex-1"></div>;

    const podiumStyles = {
      1: {
        bg: 'bg-gradient-to-br from-yellow-100 via-yellow-200 to-yellow-300',
        text: 'text-yellow-900',
        height: 'h-96',
        badge: '🥇',
        shadow: 'shadow-2xl',
        border: 'border-4 border-yellow-200',
        scale: 'scale-105',
        marginTop: 'mt-0', // 1등은 여백 없음 (가장 높이 시작)
        padding: 'p-4'
      },
      2: {
        bg: 'bg-gradient-to-br from-gray-100 via-gray-200 to-gray-300',
        text: 'text-gray-900',
        height: 'h-[22rem]', // 88 (h-96보다 작지만 h-80보다 큼)
        badge: '🥈',
        shadow: 'shadow-xl',
        border: 'border-4 border-gray-200',
        scale: 'scale-100',
        marginTop: 'mt-8', // 2등은 1등보다 조금만 낮게 시작
        padding: 'p-4'
      },
      3: {
        bg: 'bg-gradient-to-br from-orange-100 via-orange-200 to-orange-300',
        text: 'text-orange-900',
        height: 'h-80', // 80 (2등보다 작지만 여유 있게)
        badge: '🥉',
        shadow: 'shadow-xl',
        border: 'border-4 border-orange-200',
        scale: 'scale-100',
        marginTop: 'mt-16', // 3등 여백 조정 (2등과 비슷한 높이로)
        padding: 'p-1' // 3등만 패딩을 최소화하여 내용이 카드 안에 들어가도록
      }
    };

    const style = podiumStyles[rank];

    return (
      <button
        key={classData.className}
        onClick={() => onClassClick(classData)}
        className={`flex-1 ${style.bg} ${style.height} ${style.shadow} ${style.border} ${style.scale} ${style.marginTop} ${style.padding} rounded-2xl hover:scale-110 transition-all duration-300 flex flex-col justify-between gap-3`}
      >
        {/* 1열: 메달과 순위 (가로 배치, 가운데 정렬) */}
        <div className="flex items-center justify-center gap-3">
          <div className="text-5xl">{style.badge}</div>
          <div className={`text-4xl font-black ${style.text}`}>{rank}등</div>
        </div>

        {/* 2열: 학급명과 인원 (가로 배치, 가운데 정렬) */}
        <div className={`flex items-center justify-center gap-2 ${style.text}`}>
          <div className="text-2xl font-black">
            {classData.className}
          </div>
          <div className="text-xl font-bold flex items-center gap-1">
            <span>👥</span>
            <span>{classData.studentCount}명</span>
          </div>
        </div>

        {/* 3열: 총점 강조 (가운데 정렬) */}
        <div className="bg-white bg-opacity-50 rounded-xl py-3 px-2 shadow-lg">
          <div className={`text-4xl font-black ${style.text} text-center`}>
            {classData.totalPoints.toLocaleString()}점
          </div>
        </div>

        {/* 4열: 통계 카드 (2x2 그리드, 카드 내부는 가로 배치) */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 py-3 px-4 rounded-lg flex items-center justify-center gap-2">
            <div className="text-3xl">⚾</div>
            <div className="text-base font-semibold text-blue-800">안타</div>
            <div className="text-xl font-bold text-blue-800">{classData.totalHits}</div>
          </div>
          <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 py-3 px-4 rounded-lg flex items-center justify-center gap-2">
            <div className="text-3xl">🏃</div>
            <div className="text-base font-semibold text-yellow-800">득점</div>
            <div className="text-xl font-bold text-yellow-800">{classData.totalRuns}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 py-3 px-4 rounded-lg flex items-center justify-center gap-2">
            <div className="text-3xl">🛡️</div>
            <div className="text-base font-semibold text-purple-800">수비</div>
            <div className="text-xl font-bold text-purple-800">{classData.totalDefense}</div>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 py-3 px-4 rounded-lg flex items-center justify-center gap-2">
            <div className="text-3xl">🍪</div>
            <div className="text-base font-semibold text-orange-800">쿠키</div>
            <div className="text-xl font-bold text-orange-800">{classData.totalCookie}</div>
          </div>
        </div>
      </button>
    );
  };

  return (
    <Card className="p-6">
      {/* 올림픽 포디움 */}
      {topThree.length > 0 && (
        <div className="mb-8">
          <div className="flex items-end justify-center gap-4 mb-8">
            {/* 2등 (왼쪽) */}
            {renderPodiumCard(podiumOrder[0], 2)}

            {/* 1등 (중앙, 가장 높음) */}
            {renderPodiumCard(podiumOrder[1], 1)}

            {/* 3등 (오른쪽) */}
            {renderPodiumCard(podiumOrder[2], 3)}
          </div>
        </div>
      )}

      {/* 나머지 학급 목록 (한 줄로 컴팩트하게) */}
      {restOfRankings.length > 0 && (
        <div>
          <div className="space-y-2">
            {restOfRankings.map((classData, index) => {
              const actualRank = index + 4; // 4등부터 시작
              return (
                <button
                  key={classData.className}
                  onClick={() => onClassClick(classData)}
                  className="w-full p-3 rounded-lg hover:bg-gray-50 transition-all border border-gray-200 hover:border-gray-300 hover:shadow-md flex items-center gap-4"
                >
                  {/* 순위 */}
                  <span className="text-lg font-bold text-gray-700 min-w-[3rem]">
                    {actualRank}등
                  </span>

                  {/* 팀명 + 인원 */}
                  <div className="flex items-center gap-3 min-w-[12rem]">
                    <span className="text-xl font-bold">{classData.className}</span>
                    <span className="text-base text-gray-600 font-semibold flex items-center gap-1">
                      <span className="text-lg">👥</span>
                      <span>{classData.studentCount}명</span>
                    </span>
                  </div>

                  {/* 구분선 */}
                  <div className="h-8 w-px bg-gray-300"></div>

                  {/* 스탯 (안타, 득점, 수비, 쿠키) - 포디움 카드 스타일 */}
                  <div className="flex items-center gap-3 flex-1">
                    <div className="bg-gradient-to-br from-blue-50 to-blue-100 py-4 px-6 rounded-xl flex items-center justify-center gap-2.5 flex-1">
                      <div className="text-3xl">⚾</div>
                      <div className="text-lg font-semibold text-blue-800">안타</div>
                      <div className="text-2xl font-bold text-blue-800">{classData.totalHits || 0}</div>
                    </div>
                    <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 py-4 px-6 rounded-xl flex items-center justify-center gap-2.5 flex-1">
                      <div className="text-3xl">🏃</div>
                      <div className="text-lg font-semibold text-yellow-800">득점</div>
                      <div className="text-2xl font-bold text-yellow-800">{classData.totalRuns || 0}</div>
                    </div>
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 py-4 px-6 rounded-xl flex items-center justify-center gap-2.5 flex-1">
                      <div className="text-3xl">🛡️</div>
                      <div className="text-lg font-semibold text-purple-800">수비</div>
                      <div className="text-2xl font-bold text-purple-800">{classData.totalDefense || 0}</div>
                    </div>
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 py-4 px-6 rounded-xl flex items-center justify-center gap-2.5 flex-1">
                      <div className="text-3xl">🍪</div>
                      <div className="text-lg font-semibold text-orange-800">쿠키</div>
                      <div className="text-2xl font-bold text-orange-800">{classData.totalCookie || 0}</div>
                    </div>
                  </div>

                  {/* 구분선 */}
                  <div className="h-8 w-px bg-gray-300"></div>

                  {/* 총점 (강조) */}
                  <div className="min-w-[8rem] text-right flex items-center justify-end gap-1">
                    <span className="text-2xl font-black text-blue-600">
                      {classData.totalPoints.toLocaleString()}
                    </span>
                    <span className="text-lg font-bold text-gray-600">점</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
}
