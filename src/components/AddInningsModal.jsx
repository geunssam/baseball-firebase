import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';

/**
 * AddInningsModal
 *
 * 경기 중 이닝을 추가하고 각 이닝의 공격팀/수비팀을 설정하는 모달
 */
const AddInningsModal = ({
  open,
  onOpenChange,
  teams,
  currentInnings,
  onConfirm
}) => {
  const [addCount, setAddCount] = useState(1); // 추가할 이닝 수
  const [inningTeams, setInningTeams] = useState({}); // { [inning]: { offense: teamId, defense: teamId } }

  // 모달이 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setAddCount(1);
      setInningTeams({});
    }
  }, [open]);

  // 추가할 이닝 수가 변경되면 inningTeams 초기화
  useEffect(() => {
    const newInningTeams = {};
    for (let i = 1; i <= addCount; i++) {
      const inningNum = currentInnings + i;
      newInningTeams[inningNum] = inningTeams[inningNum] || { offense: '', defense: '' };
    }
    setInningTeams(newInningTeams);
  }, [addCount]);

  // 선수가 있는 팀만 선택 가능
  const availableTeams = teams.filter(t => t.players && t.players.length > 0);

  // 특정 이닝의 팀 변경
  const handleTeamChange = (inning, role, teamId) => {
    setInningTeams(prev => ({
      ...prev,
      [inning]: {
        ...prev[inning],
        [role]: teamId
      }
    }));
  };

  // 유효성 검사
  const isValid = () => {
    for (let i = 1; i <= addCount; i++) {
      const inningNum = currentInnings + i;
      const teams = inningTeams[inningNum];

      if (!teams || !teams.offense || !teams.defense) {
        alert(`${inningNum}회의 공격팀과 수비팀을 모두 선택해주세요.`);
        return false;
      }

      if (teams.offense === teams.defense) {
        alert(`${inningNum}회: 공격팀과 수비팀이 같을 수 없습니다.`);
        return false;
      }
    }
    return true;
  };

  // 확인 버튼
  const handleConfirm = () => {
    if (!isValid()) return;

    // inningLineups 형식으로 변환
    const inningLineups = {};
    for (let i = 1; i <= addCount; i++) {
      const inningNum = currentInnings + i;
      const teams = inningTeams[inningNum];

      const offenseTeam = availableTeams.find(t => t.id === teams.offense);
      const defenseTeam = availableTeams.find(t => t.id === teams.defense);

      inningLineups[inningNum] = {
        offense: {
          teamId: offenseTeam.id,
          teamName: offenseTeam.name,
          playerCount: offenseTeam.players?.length || 0
        },
        defense: {
          teamId: defenseTeam.id,
          teamName: defenseTeam.name,
          playerCount: defenseTeam.players?.length || 0
        }
      };
    }

    onConfirm(addCount, inningLineups);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>➕ 이닝 추가</DialogTitle>
          <DialogDescription>
            추가할 이닝 수를 선택하고, 각 이닝의 공격팀과 수비팀을 설정하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 1. 추가할 이닝 수 선택 */}
          <div className="space-y-2">
            <Label>추가할 이닝 수</Label>
            <Select value={addCount.toString()} onValueChange={(v) => setAddCount(parseInt(v))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1회</SelectItem>
                <SelectItem value="2">2회</SelectItem>
                <SelectItem value="3">3회</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 2. 각 이닝의 팀 설정 */}
          <div className="space-y-4">
            {Array.from({ length: addCount }, (_, i) => {
              const inningNum = currentInnings + i + 1;
              const teams = inningTeams[inningNum] || { offense: '', defense: '' };

              return (
                <div key={inningNum} className="p-4 border rounded-lg space-y-3 bg-blue-50">
                  <div className="font-bold text-lg text-blue-900">
                    {inningNum}회
                  </div>

                  {/* 공격팀 선택 */}
                  <div className="space-y-2">
                    <Label className="text-sm">⚔️ 공격팀 (팀 A 슬롯)</Label>
                    <Select
                      value={teams.offense}
                      onValueChange={(v) => handleTeamChange(inningNum, 'offense', v)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="공격팀 선택..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTeams.map(team => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name} ({team.players?.length || 0}명)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* 수비팀 선택 */}
                  <div className="space-y-2">
                    <Label className="text-sm">🛡️ 수비팀 (팀 B 슬롯)</Label>
                    <Select
                      value={teams.defense}
                      onValueChange={(v) => handleTeamChange(inningNum, 'defense', v)}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="수비팀 선택..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableTeams.map(team => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name} ({team.players?.length || 0}명)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 안내 메시지 */}
          {availableTeams.length === 0 && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded text-sm">
              ⚠️ 선수가 등록된 팀이 없습니다. 먼저 팀을 생성하고 선수를 추가해주세요.
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleConfirm} disabled={availableTeams.length === 0}>
            ✅ 추가
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddInningsModal;
