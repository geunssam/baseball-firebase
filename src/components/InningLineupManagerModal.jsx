import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';

/**
 * InningLineupManagerModal
 *
 * 경기 생성 전 각 이닝별로 어떤 팀의 라인업을 사용할지 미리 설정하는 모달
 * - 탭으로 각 이닝 관리
 * - 팀 선택 시 해당 팀의 전체 선수가 라인업으로 적용됨
 * - "전체 동일" 버튼으로 모든 이닝에 같은 팀 적용 가능
 */
const InningLineupManagerModal = ({
  open,
  onOpenChange,
  teams,
  totalInnings,
  teamKey, // 'teamA' | 'teamB'
  teamName, // 표시용 팀 이름
  initialLineups = {}, // 기존 설정된 라인업
  opponentLineups = {}, // 상대편 이닝별 라인업 설정
  onSave
}) => {
  const [inningLineups, setInningLineups] = useState({});
  const [currentTab, setCurrentTab] = useState('1');

  // 초기 데이터 로드
  useEffect(() => {
    if (open) {
      setInningLineups(initialLineups);
      setCurrentTab('1');
    }
  }, [open, initialLineups]);

  // 특정 이닝의 팀 변경
  const handleInningTeamChange = (inning, teamId) => {
    const selectedTeam = teams.find(t => t.id === teamId);
    if (!selectedTeam) return;

    // 상대편이 같은 팀을 사용하는지 검사
    const opponentTeamId = opponentLineups[inning]?.teamId;
    if (opponentTeamId && opponentTeamId === teamId) {
      alert(`⚠️ 팀 선택 불가\n\n${inning}회에서 상대팀도 "${selectedTeam.name}"를 사용 중입니다.\n\n같은 팀이 공격과 수비를 동시에 할 수 없습니다.`);
      return;
    }

    setInningLineups(prev => ({
      ...prev,
      [inning]: {
        teamId: selectedTeam.id,
        teamName: selectedTeam.name,
        playerCount: selectedTeam.players?.length || 0
      }
    }));
  };

  // 모든 이닝에 같은 팀 적용
  const handleApplyToAll = () => {
    const currentInningTeamId = inningLineups[currentTab]?.teamId;
    if (!currentInningTeamId) {
      alert('현재 이닝에 팀을 먼저 선택해주세요.');
      return;
    }

    const selectedTeam = teams.find(t => t.id === currentInningTeamId);
    if (!selectedTeam) return;

    // 상대편 라인업과 충돌 검사
    for (let i = 1; i <= totalInnings; i++) {
      const opponentTeamId = opponentLineups[i]?.teamId;
      if (opponentTeamId && opponentTeamId === selectedTeam.id) {
        alert(`⚠️ 전체 적용 불가\n\n${i}회에서 상대팀도 "${selectedTeam.name}"를 사용 중입니다.\n\n같은 팀이 공격과 수비를 동시에 할 수 없습니다.`);
        return;
      }
    }

    const allInningsLineup = {};
    for (let i = 1; i <= totalInnings; i++) {
      allInningsLineup[i] = {
        teamId: selectedTeam.id,
        teamName: selectedTeam.name,
        playerCount: selectedTeam.players?.length || 0
      };
    }

    setInningLineups(allInningsLineup);
    alert(`모든 이닝에 "${selectedTeam.name}" 팀이 적용되었습니다.`);
  };

  // 모든 설정 초기화
  const handleClearAll = () => {
    if (confirm('모든 이닝 설정을 초기화하시겠습니까?')) {
      setInningLineups({});
    }
  };

  // 저장
  const handleSave = () => {
    onSave(inningLineups);
    onOpenChange(false);
  };

  // 선택 가능한 팀 (선수가 있는 팀만)
  const availableTeams = teams.filter(t => t.players && t.players.length > 0);

  // 설정 완료된 이닝 수 계산
  const configuredInnings = Object.keys(inningLineups).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>⚾ {teamName} - 이닝별 라인업 설정</DialogTitle>
          <DialogDescription>
            각 이닝마다 어떤 팀의 라인업을 사용할지 미리 설정하세요.
            경기 중 이닝이 바뀔 때 자동으로 라인업이 교체됩니다.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* 진행 상황 표시 */}
          <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant={configuredInnings === totalInnings ? "default" : "secondary"}>
                {configuredInnings}/{totalInnings} 이닝 설정 완료
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleApplyToAll}
                disabled={!inningLineups[currentTab]?.teamId}
              >
                전체 동일 적용
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAll}
                className="text-red-600 hover:bg-red-50"
              >
                전체 초기화
              </Button>
            </div>
          </div>

          {/* 이닝별 탭 */}
          <Tabs value={currentTab} onValueChange={setCurrentTab}>
            <TabsList className="grid grid-cols-5 w-full">
              {Array.from({ length: Math.min(totalInnings, 9) }, (_, i) => i + 1).map(inning => (
                <TabsTrigger
                  key={inning}
                  value={String(inning)}
                  className={inningLineups[inning] ? 'bg-green-100' : ''}
                >
                  {inning}회
                  {inningLineups[inning] && ' ✓'}
                </TabsTrigger>
              ))}
            </TabsList>

            {Array.from({ length: totalInnings }, (_, i) => i + 1).map(inning => (
              <TabsContent key={inning} value={String(inning)} className="space-y-4 mt-4">
                <div className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <h3 className="font-semibold text-lg mb-3">
                    {inning}회 라인업
                  </h3>

                  {/* 상대편 팀 정보 표시 */}
                  {opponentLineups[inning] && (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-orange-800">
                          🆚 상대팀 {inning}회:
                        </span>
                        <Badge variant="outline" className="bg-white">
                          {opponentLineups[inning].teamName}
                        </Badge>
                        <span className="text-xs text-orange-600">
                          ({opponentLineups[inning].playerCount}명)
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 팀 선택 */}
                  <div className="space-y-2">
                    <Label>라인업으로 사용할 팀 선택</Label>
                    <Select
                      value={inningLineups[inning]?.teamId || ''}
                      onValueChange={(teamId) => handleInningTeamChange(inning, teamId)}
                    >
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

                  {/* 선택된 팀 정보 */}
                  {inningLineups[inning] && (
                    <div className="mt-4 p-3 bg-white border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="default">선택됨</Badge>
                        <span className="font-semibold">{inningLineups[inning].teamName}</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        {inningLineups[inning].playerCount}명의 선수가 이 이닝에 출전합니다.
                      </p>
                    </div>
                  )}

                  {/* 안내 문구 */}
                  {!inningLineups[inning] && (
                    <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <p className="text-sm text-yellow-800">
                        ℹ️ 이닝 설정을 하지 않으면 이전 이닝의 라인업이 유지됩니다.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* 요약 정보 */}
          <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
            <h4 className="font-semibold mb-2">설정 요약</h4>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {Array.from({ length: totalInnings }, (_, i) => i + 1).map(inning => (
                <div key={inning} className="flex items-center gap-2">
                  <span className="text-gray-600">{inning}회:</span>
                  <span className="font-medium">
                    {inningLineups[inning]?.teamName || '미설정'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default InningLineupManagerModal;
