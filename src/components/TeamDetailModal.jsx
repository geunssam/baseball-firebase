import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import AddPlayerModal from './AddPlayerModal';

/**
 * TeamDetailModal
 *
 * 팀 상세 정보 표시
 * - 선수 목록 (이름, 번호)
 * - 선수 추가 버튼
 * - 선수 삭제 버튼
 * - 라인업 편성 버튼
 */
const TeamDetailModal = ({ open, onOpenChange, team, onUpdateTeam, onOpenLineup }) => {
  const [showAddPlayer, setShowAddPlayer] = useState(false);

  if (!team) return null;

  const players = team.players || [];

  const handleAddPlayers = (newPlayers) => {
    const updatedPlayers = [...players, ...newPlayers];
    onUpdateTeam({ ...team, players: updatedPlayers });
  };

  const handleRemovePlayer = (index) => {
    if (!confirm(`${players[index].name} 선수를 삭제하시겠습니까?`)) return;

    const updatedPlayers = players.filter((_, i) => i !== index);
    onUpdateTeam({ ...team, players: updatedPlayers });
  };

  const hasLineup = players.some(p => p.battingOrder !== undefined);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-3">
              <span className="text-3xl">👥</span>
              {team.name}
            </DialogTitle>
            <DialogDescription>
              팀 정보 및 선수 명단을 관리합니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 선수 수 표시 */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">총 선수</p>
                <p className="text-2xl font-bold text-primary">{players.length}명</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowAddPlayer(true)}>
                  ➕ 선수 추가
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenLineup(team);
                  }}
                  disabled={players.length === 0}
                >
                  ⚾ 라인업 편성
                </Button>
              </div>
            </div>

            {/* 라인업 상태 표시 */}
            {hasLineup && (
              <div className="bg-primary/10 border border-primary rounded-lg p-3">
                <p className="text-sm text-primary font-medium flex items-center gap-2">
                  ✅ 라인업 설정 완료
                  <Badge variant="secondary" className="text-xs">
                    타순 및 포지션 설정됨
                  </Badge>
                </p>
              </div>
            )}

            {/* 선수 목록 */}
            <div>
              <h3 className="font-semibold mb-3">선수 명단</h3>
              {players.length === 0 ? (
                <div className="text-center py-12 bg-muted/30 rounded-lg border-2 border-dashed">
                  <p className="text-6xl mb-3">⚾</p>
                  <p className="text-muted-foreground mb-4">등록된 선수가 없습니다</p>
                  <Button onClick={() => setShowAddPlayer(true)} size="sm">
                    첫 번째 선수 추가하기
                  </Button>
                </div>
              ) : (
                <div className="grid gap-2">
                  {players.map((player, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-card border rounded-lg hover:bg-accent/5 transition"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant="outline" className="font-mono text-xs">
                          #{player.number}
                        </Badge>
                        <span className="font-medium">{player.name}</span>
                        {player.battingOrder && (
                          <div className="flex gap-1 text-xs text-muted-foreground">
                            <Badge variant="secondary" className="text-xs">
                              {player.battingOrder}번 타자
                            </Badge>
                            {player.position && (
                              <Badge variant="outline" className="text-xs">
                                {player.position}
                              </Badge>
                            )}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemovePlayer(index)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        삭제
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 선수 추가 모달 */}
      <AddPlayerModal
        open={showAddPlayer}
        onOpenChange={setShowAddPlayer}
        onAddPlayers={handleAddPlayers}
        currentPlayerCount={players.length}
      />
    </>
  );
};

export default TeamDetailModal;
