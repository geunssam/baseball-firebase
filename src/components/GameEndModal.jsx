import React, { useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';

/**
 * GameEndModal
 * 경기 종료 시 표시되는 요약 모달
 * - 경기 결과
 * - MVP
 */
export default function GameEndModal({
  open,
  onClose,
  gameData
}) {
  // 경기 결과 계산
  const gameResult = useMemo(() => {
    if (!gameData) return null;

    const teamAScore = gameData.scoreBoard?.teamATotal || 0;
    const teamBScore = gameData.scoreBoard?.teamBTotal || 0;

    let result = '무승부';
    let winnerTeam = null;

    if (teamAScore > teamBScore) {
      result = `${gameData.teamA.name} 승리`;
      winnerTeam = 'A';
    } else if (teamBScore > teamAScore) {
      result = `${gameData.teamB.name} 승리`;
      winnerTeam = 'B';
    }

    return {
      teamA: gameData.teamA.name,
      teamB: gameData.teamB.name,
      teamAScore,
      teamBScore,
      result,
      winnerTeam
    };
  }, [gameData]);

  // MVP 계산 (가장 높은 점수)
  const mvp = useMemo(() => {
    if (!gameData) return null;

    const allPlayers = [
      ...gameData.teamA.lineup.map(p => ({ ...p, team: gameData.teamA.name })),
      ...gameData.teamB.lineup.map(p => ({ ...p, team: gameData.teamB.name }))
    ];

    let maxPoints = -1;
    let mvpPlayer = null;

    allPlayers.forEach(player => {
      const stats = player.stats || {};
      const points = (stats.hits || 0) * 2 +
                     (stats.runs || 0) * 3 +
                     (stats.goodDefense || 0) * 1 +
                     (stats.bonusCookie || 0) * 1;

      if (points > maxPoints) {
        maxPoints = points;
        mvpPlayer = { ...player, points };
      }
    });

    return mvpPlayer;
  }, [gameData]);


  if (!gameData || !gameResult) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-3xl font-bold text-center">
            🎉 경기 종료 🎉
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* 경기 결과 */}
          <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50">
            <h2 className="text-2xl font-bold text-center mb-4">경기 결과</h2>
            <div className="flex items-center justify-center gap-8">
              {/* 팀 A */}
              <div className={`text-center w-40 ${gameResult.winnerTeam === 'A' ? 'ring-4 ring-yellow-400 rounded-xl p-3 bg-yellow-50' : ''}`}>
                <div className="flex items-center justify-center gap-2 mb-2 h-8">
                  {gameResult.winnerTeam === 'A' && (
                    <span className="text-3xl">🏆</span>
                  )}
                  <div className="text-xl font-bold">{gameResult.teamA}</div>
                </div>
                <div className="text-5xl font-extrabold text-blue-600 h-16 flex items-center justify-center">
                  {gameResult.teamAScore}
                </div>
              </div>

              <div className="text-4xl font-bold text-gray-400">:</div>

              {/* 팀 B */}
              <div className={`text-center w-40 ${gameResult.winnerTeam === 'B' ? 'ring-4 ring-yellow-400 rounded-xl p-3 bg-yellow-50' : ''}`}>
                <div className="flex items-center justify-center gap-2 mb-2 h-8">
                  {gameResult.winnerTeam === 'B' && (
                    <span className="text-3xl">🏆</span>
                  )}
                  <div className="text-xl font-bold">{gameResult.teamB}</div>
                </div>
                <div className="text-5xl font-extrabold text-red-600 h-16 flex items-center justify-center">
                  {gameResult.teamBScore}
                </div>
              </div>
            </div>
            <div className="text-center mt-4 text-2xl font-bold text-purple-700">
              {gameResult.result}
            </div>
          </Card>

          {/* MVP */}
          {mvp && (
            <Card className="p-6 bg-gradient-to-br from-yellow-50 to-amber-50">
              <h2 className="text-2xl font-bold text-center mb-4">
                ⭐ MVP ⭐
              </h2>
              <div className="text-center">
                <div className="text-3xl font-extrabold text-amber-700 mb-2">
                  {mvp.name}
                </div>
                <div className="text-sm text-gray-600 mb-3">
                  {mvp.team}
                </div>
                <div className="flex justify-center gap-4 text-sm">
                  <span>안타: {mvp.stats?.hits || 0}</span>
                  <span>득점: {mvp.stats?.runs || 0}</span>
                  <span>수비: {mvp.stats?.goodDefense || 0}</span>
                  <span>쿠키: {mvp.stats?.bonusCookie || 0}</span>
                  <span className="font-bold text-amber-600">
                    총 {mvp.points}점
                  </span>
                </div>
              </div>
            </Card>
          )}


          {/* 닫기 버튼 */}
          <div className="flex justify-center">
            <Button
              onClick={onClose}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 text-lg"
            >
              확인
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
