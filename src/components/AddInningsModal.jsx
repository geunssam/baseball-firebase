import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import TeamSelectModal from './TeamSelectModal';

/**
 * AddInningsModal
 *
 * 경기 중 이닝을 추가하고 각 이닝의 공격팀/수비팀을 설정하는 모달
 * CreateGameModal과 동일한 UI/UX 사용
 */
const AddInningsModal = ({
  open,
  onOpenChange,
  teams,
  currentInnings,
  initialCount = 1,
  onConfirm
}) => {
  const [addCount, setAddCount] = useState(initialCount); // 추가할 이닝 수
  const [inningTeams, setInningTeams] = useState({}); // { [inning]: { offense: {teamId, teamName, playerCount}, defense: {...} } }

  // TeamSelectModal 상태
  const [showTeamSelectModal, setShowTeamSelectModal] = useState(false);
  const [currentInning, setCurrentInning] = useState(null);

  // 모달이 열릴 때 초기화
  useEffect(() => {
    if (open) {
      setAddCount(initialCount);
      setInningTeams({});
    }
  }, [open, initialCount]);

  // 선수가 있는 팀만 선택 가능
  const availableTeams = teams.filter(t => t.players && t.players.length > 0);

  // 팀 선택 모달 열기
  const handleOpenTeamSelect = (inning) => {
    setCurrentInning(inning);
    setShowTeamSelectModal(true);
  };

  // 팀 선택 확인
  const handleTeamSelect = (offense, defense) => {
    if (currentInning) {
      setInningTeams(prev => ({
        ...prev,
        [currentInning]: {
          offense: {
            teamId: offense.id,
            teamName: offense.name,
            playerCount: offense.players?.length || 0
          },
          defense: {
            teamId: defense.id,
            teamName: defense.name,
            playerCount: defense.players?.length || 0
          }
        }
      }));
    }
    setShowTeamSelectModal(false);
  };

  // 이전 이닝 설정 복사 (가장 최근 이닝의 설정을 모든 추가 이닝에 복사)
  const handleCopyLastInning = () => {
    // 현재 게임의 마지막 이닝 설정을 가져와야 함
    // 하지만 게임 정보에 접근할 수 없으므로, 첫 번째 추가 이닝 설정을 복사
    const firstNewInning = currentInnings + 1;
    const firstConfig = inningTeams[firstNewInning];

    if (!firstConfig) {
      alert('먼저 첫 번째 추가 이닝의 팀을 설정해주세요.');
      return;
    }

    const newInningTeams = {};
    for (let i = 1; i <= addCount; i++) {
      const inning = currentInnings + i;
      newInningTeams[inning] = { ...firstConfig };
    }
    setInningTeams(newInningTeams);
  };

  // 공수 교대 자동 (홀수회/짝수회로 공수 바꾸기)
  const handleAutoAlternate = () => {
    const firstNewInning = currentInnings + 1;
    const firstConfig = inningTeams[firstNewInning];

    if (!firstConfig) {
      alert('먼저 첫 번째 추가 이닝의 팀을 설정해주세요.');
      return;
    }

    const newInningTeams = {};
    for (let i = 1; i <= addCount; i++) {
      const inning = currentInnings + i;
      const isEven = (inning % 2) === 0;
      const isFirstEven = (firstNewInning % 2) === 0;

      // 첫 이닝 기준으로 홀짝에 따라 공수 교대
      if (isEven === isFirstEven) {
        // 같은 홀짝 → 그대로
        newInningTeams[inning] = { ...firstConfig };
      } else {
        // 다른 홀짝 → 공수 교대
        newInningTeams[inning] = {
          offense: { ...firstConfig.defense },
          defense: { ...firstConfig.offense }
        };
      }
    }
    setInningTeams(newInningTeams);
  };

  // 이전 이닝 설정 복사 적용 여부
  const isCopyLastApplied = () => {
    const firstNewInning = currentInnings + 1;
    const firstConfig = inningTeams[firstNewInning];
    if (!firstConfig) return false;

    for (let i = 2; i <= addCount; i++) {
      const inning = currentInnings + i;
      const config = inningTeams[inning];
      if (!config) return false;
      if (config.offense.teamId !== firstConfig.offense.teamId) return false;
      if (config.defense.teamId !== firstConfig.defense.teamId) return false;
    }
    return true;
  };

  // 공수 교대 자동 적용 여부
  const isAutoAlternateApplied = () => {
    const firstNewInning = currentInnings + 1;
    const firstConfig = inningTeams[firstNewInning];
    if (!firstConfig) return false;

    const isFirstEven = (firstNewInning % 2) === 0;

    for (let i = 2; i <= addCount; i++) {
      const inning = currentInnings + i;
      const config = inningTeams[inning];
      if (!config) return false;

      const isEven = (inning % 2) === 0;

      if (isEven === isFirstEven) {
        // 같은 홀짝 → 그대로여야 함
        if (config.offense.teamId !== firstConfig.offense.teamId) return false;
        if (config.defense.teamId !== firstConfig.defense.teamId) return false;
      } else {
        // 다른 홀짝 → 공수 교대되어야 함
        if (config.offense.teamId !== firstConfig.defense.teamId) return false;
        if (config.defense.teamId !== firstConfig.offense.teamId) return false;
      }
    }
    return true;
  };

  // 유효성 검사
  const isValid = () => {
    for (let i = 1; i <= addCount; i++) {
      const inningNum = currentInnings + i;
      const config = inningTeams[inningNum];

      if (!config || !config.offense || !config.defense) {
        alert(`${inningNum}회의 공격팀과 수비팀을 모두 선택해주세요.`);
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
      const config = inningTeams[inningNum];

      inningLineups[inningNum] = {
        offense: config.offense,
        defense: config.defense
      };
    }

    onConfirm(addCount, inningLineups);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
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
                  <SelectItem value="4">4회</SelectItem>
                  <SelectItem value="5">5회</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* 2. 이닝별 팀 설정 테이블 */}
            <div>
              <Label className="text-base font-semibold">📊 이닝별 팀 설정</Label>
              <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-purple-100">
                      <th className="p-2 text-left font-semibold text-purple-900">
                        이닝
                      </th>
                      {Array.from({ length: addCount }, (_, i) => currentInnings + i + 1).map(inning => (
                        <th key={inning} className="p-2 text-center font-semibold text-purple-900">
                          {inning}회
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 font-medium text-purple-700 bg-purple-50">
                        공격 vs 수비
                      </td>
                      {Array.from({ length: addCount }, (_, i) => currentInnings + i + 1).map(inning => {
                        const config = inningTeams[inning];
                        const bothSelected = config?.offense && config?.defense;

                        return (
                          <td key={inning} className="p-2 text-center">
                            {bothSelected ? (
                              <div className="space-y-2">
                                {/* 공격팀 */}
                                <div className="text-xs font-medium text-red-600 bg-red-50 rounded px-2 py-1">
                                  🔴 {config.offense.teamName}
                                  <span className="text-[10px] text-gray-500 ml-1">
                                    ({config.offense.playerCount}명)
                                  </span>
                                </div>
                                {/* VS */}
                                <div className="text-[10px] text-gray-400 font-bold">vs</div>
                                {/* 수비팀 */}
                                <div className="text-xs font-medium text-blue-600 bg-blue-50 rounded px-2 py-1">
                                  🔵 {config.defense.teamName}
                                  <span className="text-[10px] text-gray-500 ml-1">
                                    ({config.defense.playerCount}명)
                                  </span>
                                </div>
                                {/* 변경 버튼 */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 text-[10px] w-full"
                                  onClick={() => handleOpenTeamSelect(inning)}
                                >
                                  변경
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-28 text-xs w-full border-dashed"
                                onClick={() => handleOpenTeamSelect(inning)}
                              >
                                팀 선택 +
                              </Button>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. 빠른 설정 버튼 */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleCopyLastInning}
                className={`text-sm transition-all duration-300 ${
                  isCopyLastApplied()
                    ? 'bg-green-100 border-green-400 text-green-700 font-semibold'
                    : ''
                }`}
              >
                {isCopyLastApplied() ? '✅ 복사됨' : '🔄 첫 이닝 설정 복사'}
              </Button>
              <Button
                variant="outline"
                onClick={handleAutoAlternate}
                className={`text-sm transition-all duration-300 ${
                  isAutoAlternateApplied()
                    ? 'bg-blue-100 border-blue-400 text-blue-700 font-semibold'
                    : ''
                }`}
              >
                {isAutoAlternateApplied() ? '✅ 교대됨' : '⚡ 공수 교대 자동'}
              </Button>
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

      {/* 팀 선택 모달 */}
      <TeamSelectModal
        open={showTeamSelectModal}
        onOpenChange={setShowTeamSelectModal}
        teams={availableTeams}
        onConfirm={handleTeamSelect}
      />
    </>
  );
};

export default AddInningsModal;
