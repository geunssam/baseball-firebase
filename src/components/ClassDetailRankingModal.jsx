import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * 학급 상세 랭킹 모달
 * - 선택한 학급의 학생별 랭킹 표시
 */
export default function ClassDetailRankingModal({ open, onOpenChange, classData, teacherId }) {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && classData && teacherId) {
      loadStudents();
    }
  }, [open, classData, teacherId]);

  const loadStudents = async () => {
    try {
      setLoading(true);

      // 해당 학급의 모든 학생 조회
      const studentsRef = collection(db, 'users', teacherId, 'students');
      const studentsQuery = query(
        studentsRef,
        where('className', '==', classData.className)
      );
      const studentsSnapshot = await getDocs(studentsQuery);

      const classStudentIds = studentsSnapshot.docs.map(doc => doc.id);

      // 각 학생의 통계를 계산 (playerHistory + 진행중인 경기)
      const rankingData = [];
      for (const studentId of classStudentIds) {
        const studentDoc = studentsSnapshot.docs.find(doc => doc.id === studentId);
        const studentInfo = studentDoc.data();

        const historyDocRef = doc(db, 'users', teacherId, 'playerHistory', studentInfo.playerId || studentId);
        const historySnap = await getDoc(historyDocRef);

        let studentStats = {
          id: studentId,
          name: studentInfo.name,
          totalHits: 0,
          totalRuns: 0,
          totalDefense: 0,
          totalPoints: 0,
          badges: studentInfo.badges || [],
        };

        // playerHistory에서 누적 스탯
        if (historySnap.exists()) {
          const games = historySnap.data().games || [];
          games.forEach(game => {
            studentStats.totalHits += game.stats?.hits || 0;
            studentStats.totalRuns += game.stats?.runs || 0;
            studentStats.totalDefense += game.stats?.goodDefense || 0;
          });
        }

        // 진행 중인 경기 스탯 추가
        try {
          const activeGamesRef = collection(db, 'users', teacherId, 'games');
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
              studentStats.totalHits += currentPlayer.stats.hits || 0;
              studentStats.totalRuns += currentPlayer.stats.runs || 0;
              studentStats.totalDefense += currentPlayer.stats.goodDefense || 0;
            }
          });
        } catch (error) {
          console.warn('⚠️ 진행 중인 경기 조회 실패:', error);
        }

        // 총점 계산
        studentStats.totalPoints =
          studentStats.totalHits +
          studentStats.totalRuns +
          studentStats.totalDefense;

        rankingData.push(studentStats);
      }

      // 총점 기준 내림차순 정렬
      rankingData.sort((a, b) => b.totalPoints - a.totalPoints);
      setStudents(rankingData);

    } catch (error) {
      console.error('학생 데이터 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankBadge = (index) => {
    if (index === 0) return <span className="text-2xl">🥇</span>;
    if (index === 1) return <span className="text-2xl">🥈</span>;
    if (index === 2) return <span className="text-2xl">🥉</span>;
    return <span className="text-lg font-bold text-gray-600">{index + 1}</span>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            🏆 {classData?.className} 랭킹
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12 text-gray-500">
            로딩 중...
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p className="text-4xl mb-4">📋</p>
            <p className="text-lg">학생 데이터가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 학급 통계 요약 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {classData.totalPoints.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600 mt-1">총점</div>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-green-600">
                  {classData.studentCount}
                </div>
                <div className="text-sm text-gray-600 mt-1">학생 수</div>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {classData.avgPoints}
                </div>
                <div className="text-sm text-gray-600 mt-1">평균 점수</div>
              </div>
            </div>

            {/* 학생 랭킹 테이블 */}
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b-2 border-gray-300">
                    <th className="px-4 py-3 text-center text-base font-bold w-20">순위</th>
                    <th className="px-4 py-3 text-left text-base font-bold">이름</th>
                    <th className="px-4 py-3 text-center text-base font-bold">포인트</th>
                    <th className="px-4 py-3 text-center text-base font-bold">⚾ 안타</th>
                    <th className="px-4 py-3 text-center text-base font-bold">🏃 득점</th>
                    <th className="px-4 py-3 text-center text-base font-bold">🛡️ 수비</th>
                    <th className="px-4 py-3 text-center text-base font-bold">🏅 배지</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student, index) => {
                    const isTopThree = index < 3;
                    const rowBg = isTopThree ? 'bg-yellow-50' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50';

                    return (
                      <tr
                        key={student.id}
                        className={`${rowBg} border-b border-gray-200 hover:shadow-md transition-shadow`}
                      >
                        {/* 순위 */}
                        <td className="px-4 py-3 text-center">
                          {getRankBadge(index)}
                        </td>

                        {/* 이름 */}
                        <td className="px-4 py-3 text-base font-semibold">
                          {student.name}
                        </td>

                        {/* 포인트 */}
                        <td className="px-4 py-3 text-center text-base font-bold text-blue-600">
                          {(student.totalPoints || 0).toLocaleString()}
                        </td>

                        {/* 안타 */}
                        <td className="px-4 py-3 text-center text-base">
                          {student.totalHits || 0}
                        </td>

                        {/* 득점 */}
                        <td className="px-4 py-3 text-center text-base">
                          {student.totalRuns || 0}
                        </td>

                        {/* 수비 */}
                        <td className="px-4 py-3 text-center text-base">
                          {student.totalDefense || 0}
                        </td>

                        {/* 배지 */}
                        <td className="px-4 py-3 text-center text-base">
                          {student.badges?.length || 0}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
