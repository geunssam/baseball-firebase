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

  return (
    <Card className="p-4">
      <h3 className="text-xl font-bold mb-3">🏆 학급별 랭킹</h3>

      <div className="space-y-4">
        {rankings.map((classData, index) => (
          <button
            key={classData.className}
            onClick={() => onClassClick(classData)}
            className="w-full text-left p-4 rounded-lg hover:bg-gray-50 transition-all border border-gray-200 hover:border-gray-300 hover:shadow-md"
          >
            {/* 상단: 순위 + 학급명 + 총점 */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-xl font-bold flex-shrink-0">
                  {getRankBadge(index)}
                </span>
                <span className="text-lg font-bold truncate">
                  {classData.className}
                </span>
              </div>

              <div className="flex items-center gap-4 flex-shrink-0">
                <span className="text-lg font-bold text-blue-600">
                  {classData.totalPoints.toLocaleString()}점
                </span>
                <span className="text-base text-gray-600 flex items-center gap-1">
                  <span>👥</span>
                  <span>{classData.studentCount}명</span>
                </span>
              </div>
            </div>

            {/* 하단: 상세 통계 카드 */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 py-2 px-2 rounded-lg text-center">
                <div className="text-lg font-bold text-blue-800">안타 {classData.totalHits || 0}개</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 py-2 px-2 rounded-lg text-center">
                <div className="text-lg font-bold text-yellow-800">득점 {classData.totalRuns || 0}점</div>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 py-2 px-2 rounded-lg text-center">
                <div className="text-lg font-bold text-purple-800">수비 {classData.totalDefense || 0}개</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 py-2 px-2 rounded-lg text-center">
                <div className="text-lg font-bold text-orange-800">쿠키 {classData.totalCookie || 0}개</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </Card>
  );
}
