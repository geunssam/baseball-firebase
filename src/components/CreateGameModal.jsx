import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import TeamSelectModal from './TeamSelectModal';
import { useModalKeyboard } from '../hooks/useKeyboardShortcut';

/**
 * CreateGameModal
 *
 * 새 경기 생성 모달 - 이닝 중심 설계
 * - 이닝 수 설정
 * - 이닝별 팀 설정 (공격팀/수비팀)
 * - 카운트 옵션 설정
 */
const CreateGameModal = ({ open, onOpenChange, teams, onCreateGame, defaultInnings = 1 }) => {
  const [innings, setInnings] = useState(defaultInnings);
  const [inningEndRule, setInningEndRule] = useState('allBatters'); // 'allBatters' | 'nOuts' | 'manual'
  const [outsPerInning, setOutsPerInning] = useState(3);
  const [options, setOptions] = useState({
    strikes: true,
    balls: false,
    outs: false,
    bases: true,
  });

  // 이닝별 팀 설정
  const [inningTeams, setInningTeams] = useState({});

  // 팀 선택 모달 상태
  const [showTeamSelectModal, setShowTeamSelectModal] = useState(false);
  const [currentInning, setCurrentInning] = useState(null);

  // 모달이 열릴 때마다 초기화
  useEffect(() => {
    if (open) {
      setInnings(defaultInnings);
      setInningTeams({});
      setInningEndRule('allBatters');
      setOutsPerInning(3);
      setOptions({
        strikes: true,
        balls: false,
        outs: false,
        bases: true,
      });
    }
  }, [open, defaultInnings]);

  // 1회 설정 복사 여부 자동 감지
  const isCopyFirstApplied = () => {
    const firstInning = inningTeams[1];
    if (!firstInning?.offense || !firstInning?.defense || innings <= 1) return false;

    // 2회 이상 모든 이닝이 1회와 동일한지 확인
    for (let i = 2; i <= innings; i++) {
      const inning = inningTeams[i];
      if (!inning?.offense || !inning?.defense) return false;
      if (inning.offense.teamId !== firstInning.offense.teamId) return false;
      if (inning.defense.teamId !== firstInning.defense.teamId) return false;
    }
    return true;
  };

  // 공수 교대 자동 설정 여부 자동 감지
  const isAutoAlternateApplied = () => {
    const firstInning = inningTeams[1];
    if (!firstInning?.offense || !firstInning?.defense || innings <= 1) return false;

    // 홀수 이닝은 1회와 동일, 짝수 이닝은 공수 교대인지 확인
    for (let i = 2; i <= innings; i++) {
      const inning = inningTeams[i];
      if (!inning?.offense || !inning?.defense) return false;

      if (i % 2 === 1) {
        // 홀수 이닝: 1회와 동일해야 함
        if (inning.offense.teamId !== firstInning.offense.teamId) return false;
        if (inning.defense.teamId !== firstInning.defense.teamId) return false;
      } else {
        // 짝수 이닝: 공수 교대되어야 함
        if (inning.offense.teamId !== firstInning.defense.teamId) return false;
        if (inning.defense.teamId !== firstInning.offense.teamId) return false;
      }
    }
    return true;
  };

  // 이닝 수가 변경되면 inningTeams 초기화
  useEffect(() => {
    const newInningTeams = {};
    for (let i = 1; i <= innings; i++) {
      newInningTeams[i] = inningTeams[i] || { offense: null, defense: null };
    }
    setInningTeams(newInningTeams);
  }, [innings]);

  // 팀 선택 모달 열기
  const handleOpenTeamSelect = (inning) => {
    setCurrentInning(inning);
    setShowTeamSelectModal(true);
  };

  // 팀 선택 완료 (공격팀과 수비팀 동시 선택)
  const handleTeamSelected = ({ offenseId, defenseId }) => {
    const offenseTeam = teams.find(t => t.id === offenseId);
    const defenseTeam = teams.find(t => t.id === defenseId);

    if (!offenseTeam || !defenseTeam) return;

    setInningTeams(prev => ({
      ...prev,
      [currentInning]: {
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
      }
    }));
  };

  // 1회 설정을 모든 이닝에 복사
  const handleCopyFirstInning = () => {
    const firstInning = inningTeams[1];
    if (!firstInning?.offense || !firstInning?.defense) {
      alert('먼저 1회 공격팀과 수비팀을 모두 설정해주세요.');
      return;
    }

    const newInningTeams = {};
    for (let i = 1; i <= innings; i++) {
      newInningTeams[i] = { ...firstInning };
    }
    setInningTeams(newInningTeams);
  };

  // 공수 교대로 자동 채우기
  const handleAutoAlternate = () => {
    const firstInning = inningTeams[1];
    if (!firstInning?.offense || !firstInning?.defense) {
      alert('먼저 1회 공격팀과 수비팀을 모두 설정해주세요.');
      return;
    }

    const newInningTeams = { ...inningTeams }; // 기존 설정 유지
    for (let i = 1; i <= innings; i++) {
      if (i % 2 === 1) {
        // 홀수 이닝: 1회와 동일
        newInningTeams[i] = { ...firstInning };
      } else {
        // 짝수 이닝: 공수 교대
        newInningTeams[i] = {
          offense: { ...firstInning.defense },
          defense: { ...firstInning.offense }
        };
      }
    }
    setInningTeams(newInningTeams);
    console.log('✅ 공수 교대 자동 설정 완료:', newInningTeams);
  };

  // 경기 생성
  const handleCreate = () => {
    // 검증 1: 모든 이닝의 공격팀과 수비팀이 설정되었는지 확인
    for (let i = 1; i <= innings; i++) {
      const inning = inningTeams[i];
      if (!inning?.offense || !inning?.defense) {
        alert(`${i}회의 공격팀과 수비팀을 모두 설정해주세요.`);
        return;
      }
    }

    // 검증 2: 각 이닝에서 공격팀과 수비팀이 같은지 확인
    for (let i = 1; i <= innings; i++) {
      const inning = inningTeams[i];
      if (inning.offense.teamId === inning.defense.teamId) {
        alert(`⚠️ ${i}회에서 같은 팀이 공격과 수비를 동시에 할 수 없습니다.\n\n공격팀: ${inning.offense.teamName}\n수비팀: ${inning.defense.teamName}\n\n다른 팀을 선택해주세요.`);
        return;
      }
    }

    // 1회의 팀 정보로 teamA, teamB 결정
    const firstInning = inningTeams[1];
    const teamA = teams.find(t => t.id === firstInning.offense.teamId);
    const teamB = teams.find(t => t.id === firstInning.defense.teamId);

    if (!teamA || !teamB) {
      alert('선택한 팀을 찾을 수 없습니다.');
      return;
    }

    // 타순/포지션 자동 생성 함수
    const autoGenerateLineup = (team) => {
      return {
        ...team,
        players: team.players.map((player, index) => ({
          ...player,
          battingOrder: player.battingOrder !== null && player.battingOrder !== undefined
            ? player.battingOrder
            : index,
          position: player.position || '선수',
        })),
        savedRunners: null,
      };
    };

    const processedTeamA = autoGenerateLineup(teamA);
    const processedTeamB = autoGenerateLineup(teamB);

    // 이닝별 라인업 설정 변환 (기존 형식에 맞춤)
    const inningLineupsA = {};
    const inningLineupsB = {};

    for (let i = 1; i <= innings; i++) {
      const inning = inningTeams[i];

      // 공격팀이 teamA인 경우
      if (inning.offense.teamId !== firstInning.offense.teamId) {
        // 라인업 교체 필요
        const newTeam = teams.find(t => t.id === inning.offense.teamId);
        inningLineupsA[i] = {
          teamId: newTeam.id,
          teamName: newTeam.name,
          playerCount: newTeam.players?.length || 0
        };
      }

      // 수비팀이 teamB인 경우
      if (inning.defense.teamId !== firstInning.defense.teamId) {
        // 라인업 교체 필요
        const newTeam = teams.find(t => t.id === inning.defense.teamId);
        inningLineupsB[i] = {
          teamId: newTeam.id,
          teamName: newTeam.name,
          playerCount: newTeam.players?.length || 0
        };
      }
    }

    onCreateGame(processedTeamA, processedTeamB, innings, {
      ...options,
      inningEndRule,
      outsPerInning,
    }, {
      teamA: inningLineupsA,
      teamB: inningLineupsB
    });

    onOpenChange(false);
  };

  // 선택 가능한 팀 (선수가 있는 팀만)
  const availableTeams = teams.filter(t => t.players && t.players.length > 0);

  // 키보드 단축키: ESC로 닫기, Enter로 경기 시작
  useModalKeyboard(open, () => onOpenChange(false), handleCreate, [inningTeams, innings]);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🆕 새 경기 만들기</DialogTitle>
            <DialogDescription>
              이닝별로 팀을 설정하고 경기 규칙을 선택하세요.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* 1. 이닝 수 + 이닝 종료 규칙 (한 줄) */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <Label className="whitespace-nowrap">⚾ 이닝 수:</Label>
                <Input
                  type="number"
                  value={innings}
                  onChange={(e) => setInnings(Math.max(1, Math.min(9, parseInt(e.target.value) || 1)))}
                  min="1"
                  max="9"
                  className="w-16 text-center"
                />
              </div>

              <div className="flex items-center gap-3">
                <Label className="whitespace-nowrap">🔄 이닝 종료:</Label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="inningEndRule"
                    value="allBatters"
                    checked={inningEndRule === 'allBatters'}
                    onChange={(e) => setInningEndRule(e.target.value)}
                    className="cursor-pointer"
                  />
                  <span className="text-sm whitespace-nowrap">전원타격</span>
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="inningEndRule"
                    value="nOuts"
                    checked={inningEndRule === 'nOuts'}
                    onChange={(e) => setInningEndRule(e.target.value)}
                    className="cursor-pointer"
                  />
                  <span className="text-sm whitespace-nowrap">N아웃제</span>
                  {inningEndRule === 'nOuts' && (
                    <Input
                      type="number"
                      value={outsPerInning}
                      onChange={(e) => setOutsPerInning(Math.max(1, Math.min(5, parseInt(e.target.value) || 3)))}
                      min="1"
                      max="5"
                      className="w-12 h-6 text-xs text-center"
                      onClick={(e) => e.stopPropagation()}
                    />
                  )}
                </label>
                <label className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="radio"
                    name="inningEndRule"
                    value="manual"
                    checked={inningEndRule === 'manual'}
                    onChange={(e) => setInningEndRule(e.target.value)}
                    className="cursor-pointer"
                  />
                  <span className="text-sm whitespace-nowrap">수동</span>
                </label>
              </div>
            </div>

            {/* 2. 카운트 옵션 (한 줄) */}
            <div className="flex flex-wrap items-center gap-4">
              <Label className="whitespace-nowrap">🎯 카운트:</Label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.strikes}
                  onChange={(e) => setOptions({ ...options, strikes: e.target.checked })}
                  className="cursor-pointer"
                />
                <span className="text-sm whitespace-nowrap">스트라이크</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.balls}
                  onChange={(e) => setOptions({ ...options, balls: e.target.checked })}
                  className="cursor-pointer"
                />
                <span className="text-sm whitespace-nowrap">볼</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.outs}
                  onChange={(e) => setOptions({ ...options, outs: e.target.checked })}
                  className="cursor-pointer"
                />
                <span className="text-sm whitespace-nowrap">아웃</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={options.bases}
                  onChange={(e) => setOptions({ ...options, bases: e.target.checked })}
                  className="cursor-pointer"
                />
                <span className="text-sm whitespace-nowrap">진루상황</span>
              </label>
            </div>

            {/* 3. 이닝별 팀 설정 테이블 */}
            <div>
              <Label className="text-base font-semibold">📊 이닝별 팀 설정</Label>
              <div className="mt-2 border border-gray-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-purple-100">
                      <th className="p-2 text-left font-semibold text-purple-900">
                        이닝
                      </th>
                      {Array.from({ length: innings }, (_, i) => i + 1).map(inning => (
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
                      {Array.from({ length: innings }, (_, i) => i + 1).map(inning => {
                        const offenseConfig = inningTeams[inning]?.offense;
                        const defenseConfig = inningTeams[inning]?.defense;
                        const bothSelected = offenseConfig && defenseConfig;

                        return (
                          <td key={inning} className="p-2 text-center">
                            {bothSelected ? (
                              <div className="space-y-2">
                                {/* 공격팀 */}
                                <div className="text-xs font-medium text-red-600 bg-red-50 rounded px-2 py-1">
                                  🔴 {offenseConfig.teamName}
                                  <span className="text-[10px] text-gray-500 ml-1">
                                    ({offenseConfig.playerCount}명)
                                  </span>
                                </div>
                                {/* VS */}
                                <div className="text-[10px] text-gray-400 font-bold">vs</div>
                                {/* 수비팀 */}
                                <div className="text-xs font-medium text-blue-600 bg-blue-50 rounded px-2 py-1">
                                  🔵 {defenseConfig.teamName}
                                  <span className="text-[10px] text-gray-500 ml-1">
                                    ({defenseConfig.playerCount}명)
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

            {/* 4. 빠른 설정 버튼 (가로 반반) */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                onClick={handleCopyFirstInning}
                className={`text-sm transition-all duration-300 ${
                  isCopyFirstApplied()
                    ? 'bg-green-100 border-green-400 text-green-700 font-semibold'
                    : ''
                }`}
              >
                {isCopyFirstApplied() ? '✅ 복사됨' : '🔄 1회 설정 복사'}
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

            {availableTeams.length === 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ 선수가 있는 팀이 없습니다
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  먼저 팀을 만들고 선수를 추가해주세요.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소 <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 rounded border">ESC</kbd>
            </Button>
            <Button onClick={handleCreate} disabled={availableTeams.length < 1}>
              경기 시작 → <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 rounded border">Enter</kbd>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 팀 선택 모달 */}
      <TeamSelectModal
        open={showTeamSelectModal}
        onOpenChange={setShowTeamSelectModal}
        teams={teams}
        selectedOffenseId={inningTeams[currentInning]?.offense?.teamId || null}
        selectedDefenseId={inningTeams[currentInning]?.defense?.teamId || null}
        inning={currentInning}
        onSelect={handleTeamSelected}
      />
    </>
  );
};

export default CreateGameModal;
