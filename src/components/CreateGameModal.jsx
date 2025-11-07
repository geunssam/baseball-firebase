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
 * - 경기 기본 설정 저장 (설정 모드)
 */
const CreateGameModal = ({
  open,
  onOpenChange,
  teams,
  onCreateGame = null,
  isSettingsMode = false,
  onSaveSettings = null,
  defaultValues = null,
  defaultInnings = 1
}) => {
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

  // 모달이 열릴 때마다 초기화 (저장된 기본값 또는 디폴트 값)
  useEffect(() => {
    if (open) {
      // 저장된 기본값이 있으면 적용, 없으면 기본값 사용
      if (defaultValues) {
        setInnings(defaultValues.innings || defaultInnings);
        setInningEndRule(defaultValues.inningEndRule || 'allBatters');
        setOutsPerInning(defaultValues.outsPerInning || 3);
        setOptions({
          strikes: defaultValues.options?.strikes !== undefined ? defaultValues.options.strikes : true,
          balls: defaultValues.options?.balls !== undefined ? defaultValues.options.balls : false,
          outs: defaultValues.options?.outs !== undefined ? defaultValues.options.outs : false,
          bases: defaultValues.options?.bases !== undefined ? defaultValues.options.bases : true,
        });
        console.log('📥 저장된 경기 설정 적용:', defaultValues);
      } else {
        // 기본값으로 초기화
        setInnings(defaultInnings);
        setInningEndRule('allBatters');
        setOutsPerInning(3);
        setOptions({
          strikes: true,
          balls: false,
          outs: false,
          bases: true,
        });
      }
      setInningTeams({});
    }
  }, [open, defaultInnings, defaultValues]);

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

  // 설정 저장 핸들러
  const handleSaveSettings = () => {
    const settings = {
      innings,
      inningEndRule,
      outsPerInning,
      options,
    };

    onSaveSettings(settings);
    onOpenChange(false);
  };

  // 설정 초기화 핸들러 (기본값으로 되돌리기)
  const handleResetSettings = () => {
    setInnings(defaultInnings);
    setInningEndRule('allBatters');
    setOutsPerInning(3);
    setOptions({
      strikes: true,
      balls: false,
      outs: false,
      bases: true,
    });
    console.log('🔄 경기 설정 초기화 완료');
  };

  // 선택 가능한 팀 (선수가 있는 팀만)
  const availableTeams = teams.filter(t => t.players && t.players.length > 0);

  // 키보드 단축키: ESC로 닫기, Enter로 경기 시작 (일반 모드만)
  useModalKeyboard(
    open && !isSettingsMode,
    () => onOpenChange(false),
    handleCreate,
    [inningTeams, innings, isSettingsMode]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isSettingsMode ? '⚙️ 경기 기본 설정' : '🆕 새 경기 만들기'}
            </DialogTitle>
            <DialogDescription>
              {isSettingsMode
                ? '경기 생성 시 자동으로 적용될 기본값을 설정하세요.'
                : '이닝별로 팀을 설정하고 경기 규칙을 선택하세요.'}
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
                  onChange={(e) => {
                    const value = e.target.value;
                    // 빈 값이면 그대로 유지 (입력 중)
                    if (value === '') {
                      setInnings('');
                      return;
                    }
                    // 숫자로 변환
                    const num = parseInt(value);
                    // 유효한 숫자면 범위 검증 (1-9)
                    if (!isNaN(num)) {
                      setInnings(Math.max(1, Math.min(9, num)));
                    }
                  }}
                  onBlur={(e) => {
                    // 포커스를 잃을 때 빈 값이면 1로 설정
                    if (e.target.value === '' || isNaN(parseInt(e.target.value))) {
                      setInnings(1);
                    }
                  }}
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

            {/* 3. 이닝별 팀 설정 테이블 (일반 모드에서만 표시) */}
            {!isSettingsMode && (
              <>
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
              </>
            )}
          </div>

          {/* 설정 모드 안내 메시지 */}
          {isSettingsMode && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
              <p className="text-sm text-blue-800 font-medium flex items-center gap-2">
                ℹ️ 새 경기를 만들 때 이 설정이 자동으로 적용됩니다
              </p>
              <p className="text-xs text-blue-600 mt-1">
                저장 후 새 경기 생성 시 이닝 수와 규칙이 자동으로 설정되어 팀 선택만 하면 바로 시작할 수 있습니다.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소 <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 rounded border">ESC</kbd>
            </Button>
            {isSettingsMode ? (
              <>
                <Button variant="outline" onClick={handleResetSettings} className="text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                  🔄 초기화
                </Button>
                <Button onClick={handleSaveSettings} className="bg-green-600 hover:bg-green-700">
                  💾 기본 설정 저장
                </Button>
              </>
            ) : (
              <Button onClick={handleCreate} disabled={availableTeams.length < 1}>
                경기 시작 → <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 rounded border">Enter</kbd>
              </Button>
            )}
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
