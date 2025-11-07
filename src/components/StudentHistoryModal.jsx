/**
 * StudentHistoryModal.jsx
 * 학생의 최근 경기 기록을 모달로 표시하는 컴포넌트
 */

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { getPlayerDetailedHistory } from '../services/firestoreService';
import { useNavigate } from 'react-router-dom';
import { BADGES } from '../utils/badgeSystem';

export default function StudentHistoryModal({ isOpen, onClose, student, teacherId, maxGames = 3 }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && student && teacherId) {
      loadGames();
    }
  }, [isOpen, student, teacherId]);

  const loadGames = async () => {
    setLoading(true);
    try {
      const playerId = student.playerId || student.id;
      const history = await getPlayerDetailedHistory(teacherId, playerId);

      // 최근 N경기만 필터링 (날짜 기준 내림차순)
      const sortedHistory = [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
      const recentGames = sortedHistory.slice(0, maxGames);

      console.log(`📊 [StudentHistoryModal] ${student.name} 최근 ${maxGames}경기 로드:`, recentGames);
      setGames(recentGames);
    } catch (error) {
      console.error('❌ [StudentHistoryModal] 경기 기록 불러오기 실패:', error);
      setGames([]);
    } finally {
      setLoading(false);
    }
  };

  // 누적 통계 계산
  const totalStats = games.reduce((acc, game) => ({
    hits: acc.hits + (game.stats.hits || 0),
    runs: acc.runs + (game.stats.runs || 0),
    goodDefense: acc.goodDefense + (game.stats.goodDefense || 0),
    bonusCookie: acc.bonusCookie + (game.stats.bonusCookie || 0),
    wins: acc.wins + (game.result === 'win' ? 1 : 0)
  }), { hits: 0, runs: 0, goodDefense: 0, bonusCookie: 0, wins: 0 });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}월 ${date.getDate()}일`;
  };

  const handleViewFullHistory = () => {
    onClose();
    navigate('/student');
  };

  if (!student) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {student.name}의 최근 경기 기록
          </DialogTitle>
          <DialogDescription>
            최근 {maxGames}경기 성적을 확인할 수 있습니다
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground">
            로딩 중...
          </div>
        ) : games.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <p className="text-4xl mb-4">⚾</p>
            <p className="text-lg">아직 출전한 경기가 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 누적 통계 요약 */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-lg mb-3 text-blue-900">📊 누적 통계</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⚾</span>
                  <span className="text-sm text-muted-foreground">안타:</span>
                  <span className="font-bold text-lg">{totalStats.hits}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🏃‍♂️</span>
                  <span className="text-sm text-muted-foreground">득점:</span>
                  <span className="font-bold text-lg">{totalStats.runs}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🛡️</span>
                  <span className="text-sm text-muted-foreground">수비:</span>
                  <span className="font-bold text-lg">{totalStats.goodDefense}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🍪</span>
                  <span className="text-sm text-muted-foreground">쿠키:</span>
                  <span className="font-bold text-lg">{totalStats.bonusCookie}</span>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-300">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">승리:</span>
                  <span className="font-bold text-lg text-blue-600">
                    {totalStats.wins}승 {games.length - totalStats.wins}패
                  </span>
                  <span className="text-sm text-muted-foreground ml-auto">
                    승률 {games.length > 0 ? Math.round((totalStats.wins / games.length) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* 최근 경기 목록 */}
            <div>
              <h3 className="font-bold text-lg mb-3">📅 최근 {maxGames}경기</h3>
              <div className="space-y-2">
                {games.map((game, index) => {
                  const isDeleted = game.isDeleted || false;
                  const isWin = game.result === 'win';
                  const bgColor = isDeleted ? 'bg-gray-50' : (isWin ? 'bg-blue-50' : 'bg-red-50');
                  const borderColor = isDeleted ? 'border-gray-300' : (isWin ? 'border-blue-200' : 'border-red-200');
                  const resultColor = isDeleted ? 'text-gray-500' : (isWin ? 'text-blue-600' : 'text-red-600');
                  const resultEmoji = isDeleted ? '🗑️' : (isWin ? '✅' : '❌');
                  const resultText = isDeleted ? '삭제된 경기' : (isWin ? '승리' : '패배');

                  return (
                    <div
                      key={game.gameId || index}
                      className={`${bgColor} border-2 ${borderColor} rounded-lg p-3 ${isDeleted ? 'opacity-75' : ''}`}
                    >
                      {/* 첫 번째 줄: 날짜, 팀명, 점수, 승패 */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-sm font-medium text-muted-foreground">
                          {formatDate(game.date)}
                        </span>
                        <span className={`text-sm font-semibold ${isDeleted ? 'text-gray-500' : ''}`}>
                          {game.team}
                        </span>
                        {!isDeleted && (
                          <span className="text-sm font-bold">
                            {game.score.our}:{game.score.opponent}
                          </span>
                        )}
                        <span className={`${resultColor} font-bold text-sm ml-auto`}>
                          {resultEmoji} {resultText}
                        </span>
                      </div>

                      {/* 두 번째 줄: 스탯 */}
                      <div className="flex items-center gap-4 text-sm">
                        <span className="flex items-center gap-1">
                          <span>⚾</span>
                          <span className="font-semibold">{game.stats.hits}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span>🏃‍♂️</span>
                          <span className="font-semibold">{game.stats.runs}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span>🛡️</span>
                          <span className="font-semibold">{game.stats.goodDefense}</span>
                        </span>
                        <span className="flex items-center gap-1">
                          <span>🍪</span>
                          <span className="font-semibold">{game.stats.bonusCookie}</span>
                        </span>
                      </div>

                      {/* 세 번째 줄: 획득 배지 (있을 경우만) */}
                      {game.newBadges && game.newBadges.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-opacity-50">
                          <div className="flex gap-1 flex-wrap">
                            {game.newBadges.map((badgeId, badgeIndex) => {
                              // BADGES 객체에서 배지 찾기
                              const badge = Object.values(BADGES).find(b => b.id === badgeId);
                              return badge ? (
                                <span
                                  key={badge.id || `badge-${badgeIndex}`}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs font-semibold"
                                  title={badge.name}
                                >
                                  <span>{badge.icon}</span>
                                  <span>{badge.name}</span>
                                </span>
                              ) : null;
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleViewFullHistory}
            disabled={games.length === 0}
          >
            전체 기록 보기
          </Button>
          <Button onClick={onClose}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
