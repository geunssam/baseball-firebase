import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { AlertTriangle } from 'lucide-react';

/**
 * InningLineupChangeModal
 *
 * 경기 중 현재 이닝의 라인업을 즉시 다른 팀의 전체 선수로 교체하는 모달
 * - 등록된 팀 목록에서 선택
 * - 선택한 팀의 전체 선수가 라인업으로 교체됨
 * - 교체 시 현재 타석, 주자 상황 등은 초기화되지만 기존 선수들의 누적 스탯은 유지
 */
const InningLineupChangeModal = ({
  open,
  onOpenChange,
  teams,
  teamKey, // 'teamA' | 'teamB'
  teamName, // 표시용 팀 이름
  currentInning,
  currentLineup, // 현재 라인업
  opponentTeamId, // 상대팀 ID
  opponentTeamName, // 상대팀 이름
  onConfirmChange
}) => {
  const [selectedTeamId, setSelectedTeamId] = useState('');

  // 선택 가능한 팀 (선수가 있는 팀만)
  const availableTeams = teams.filter(t => t.players && t.players.length > 0);

  // 선택된 팀 정보
  const selectedTeam = teams.find(t => t.id === selectedTeamId);

  // 교체 확인
  const handleConfirmChange = () => {
    if (!selectedTeamId) {
      alert('교체할 팀을 선택해주세요.');
      return;
    }

    const team = teams.find(t => t.id === selectedTeamId);
    if (!team) {
      alert('선택한 팀을 찾을 수 없습니다.');
      return;
    }

    // 상대팀과 같은 팀 선택 방지
    if (opponentTeamId && selectedTeamId === opponentTeamId) {
      alert(`⚠️ 팀 선택 불가\n\n현재 상대팀이 "${opponentTeamName}"를 사용 중입니다.\n\n같은 팀이 공격과 수비를 동시에 할 수 없습니다.`);
      return;
    }

    // 교체할 라인업 생성 (배지 정보 포함)
    const newLineup = team.players.map((player, index) => ({
      id: player.id || player.playerId,
      playerId: player.id || player.playerId,
      name: player.name,
      position: player.position || '선수',
      battingOrder: index + 1,
      outInInning: null,
      badges: player.badges || [], // 배지 정보 포함
      stats: {
        hits: 0,
        single: 0,
        double: 0,
        triple: 0,
        homerun: 0,
        runs: 0,
        bonusCookie: 0,
        goodDefense: 0,
      },
      hitDetails: []
    }));

    onConfirmChange(teamKey, newLineup, {
      teamId: team.id,
      teamName: team.name,
      changedAt: currentInning
    });

    // 초기화
    setSelectedTeamId('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>🔄 {teamName} 라인업 전체 교체</DialogTitle>
          <DialogDescription>
            {currentInning}회차 라인업을 다른 팀의 전체 선수로 교체합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* 경고 메시지 */}
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold mb-1">⚠️ 주의사항</p>
              <ul className="space-y-1 ml-4 list-disc">
                <li>현재 이닝의 라인업이 완전히 교체됩니다</li>
                <li>교체 후 현재 타석은 1번 타자부터 시작됩니다</li>
                <li>주자 상황은 유지되지 않습니다</li>
                <li>기존 선수들의 누적 기록은 보존됩니다</li>
              </ul>
            </div>
          </div>

          {/* 현재 라인업 정보 */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-semibold text-sm mb-2">현재 라인업</h4>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{currentLineup?.length || 0}명</Badge>
              <span className="text-sm text-gray-600">
                {currentLineup?.slice(0, 3).map(p => p.name).join(', ')}
                {currentLineup?.length > 3 && ` 외 ${currentLineup.length - 3}명`}
              </span>
            </div>
          </div>

          {/* 팀 선택 */}
          <div className="space-y-2">
            <Label>교체할 팀 선택</Label>
            <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="팀을 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map((team) => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name} ({team.players.length}명)
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 선택된 팀 미리보기 */}
          {selectedTeam && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Badge variant="default">새 라인업</Badge>
                {selectedTeam.name}
              </h4>
              <div className="text-sm text-gray-700 space-y-1">
                <p>• {selectedTeam.players.length}명의 선수</p>
                <p className="text-xs text-gray-500">
                  {selectedTeam.players.slice(0, 5).map(p => p.name).join(', ')}
                  {selectedTeam.players.length > 5 && ` 외 ${selectedTeam.players.length - 5}명`}
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleConfirmChange}
            disabled={!selectedTeamId}
            className="bg-green-600 hover:bg-green-700"
          >
            라인업 교체
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InningLineupChangeModal;
