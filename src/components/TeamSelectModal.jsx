import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Check } from 'lucide-react';

/**
 * 한글 초성 추출 함수
 */
const getInitialConsonant = (char) => {
  const CHOSUNG = ['ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ', 'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
  const code = char.charCodeAt(0) - 0xAC00;
  if (code > -1 && code < 11172) {
    return CHOSUNG[Math.floor(code / 588)];
  }
  // 영어는 대문자로
  if (/[a-zA-Z]/.test(char)) {
    return char.toUpperCase();
  }
  // 숫자는 #
  if (/[0-9]/.test(char)) {
    return '#';
  }
  return '기타';
};

/**
 * TeamSelectModal
 *
 * 공격팀과 수비팀을 동시에 선택할 수 있는 모달
 * - 좌우 분할 레이아웃
 * - 알파벳 인덱스 바
 * - 축소된 카드 크기
 */
const TeamSelectModal = ({
  open,
  onOpenChange,
  teams,
  selectedOffenseId,
  selectedDefenseId,
  inning,
  onSelect
}) => {
  const [tempOffenseId, setTempOffenseId] = useState(selectedOffenseId);
  const [tempDefenseId, setTempDefenseId] = useState(selectedDefenseId);
  const [activeIndex, setActiveIndex] = useState(null);

  const offenseScrollRef = useRef(null);
  const defenseScrollRef = useRef(null);

  // 모달이 열릴 때마다 초기화
  useEffect(() => {
    if (open) {
      setTempOffenseId(selectedOffenseId);
      setTempDefenseId(selectedDefenseId);
      setActiveIndex(null);
    }
  }, [open, selectedOffenseId, selectedDefenseId]);

  // 선택 가능한 팀 (선수가 있는 팀만)
  const availableTeams = teams.filter(t => t.players && t.players.length > 0);

  // 팀을 인덱스별로 그룹화
  const teamsByIndex = availableTeams.reduce((acc, team) => {
    const firstChar = team.name[0];
    const index = getInitialConsonant(firstChar);
    if (!acc[index]) {
      acc[index] = [];
    }
    acc[index].push(team);
    return acc;
  }, {});

  // 인덱스 목록 (한글 ㄱ-ㅎ, 영어 A-Z, #)
  const indexes = Object.keys(teamsByIndex).sort((a, b) => {
    const order = ['ㄱ', 'ㄴ', 'ㄷ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅅ', 'ㅇ', 'ㅈ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'];
    const aIdx = order.indexOf(a);
    const bIdx = order.indexOf(b);

    if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
    if (aIdx !== -1) return -1;
    if (bIdx !== -1) return 1;

    if (a === '#') return 1;
    if (b === '#') return -1;

    return a.localeCompare(b);
  });

  const handleIndexClick = (index) => {
    setActiveIndex(index);
    // 스크롤 처리는 간단하게 처리
    const element = document.getElementById(`team-index-${index}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleConfirm = () => {
    if (!tempOffenseId || !tempDefenseId) {
      alert('공격팀과 수비팀을 모두 선택해주세요.');
      return;
    }
    onSelect({
      offenseId: tempOffenseId,
      defenseId: tempDefenseId
    });
    onOpenChange(false);
  };

  // 팀 카드 렌더링 함수
  const renderTeamCard = (team, selectedId, onSelectTeam, side) => {
    const isSelected = selectedId === team.id;

    return (
      <div
        key={`${side}-${team.id}`}
        onClick={() => onSelectTeam(team.id)}
        className={`
          relative px-1.5 py-1 border-2 rounded cursor-pointer transition-all
          ${isSelected
            ? 'border-primary bg-primary/10 shadow-md'
            : 'border-gray-200 hover:border-primary/50 hover:bg-gray-50'
          }
        `}
      >
        <div className="flex items-center justify-center gap-1 text-xs">
          <span className="font-semibold truncate">{team.name}</span>
          {isSelected && <Check className="w-3 h-3 text-primary flex-shrink-0" />}
          <span className="text-[10px] text-muted-foreground whitespace-nowrap">👥{team.players.length}</span>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{inning}회 공격팀/수비팀 선택</DialogTitle>
          <DialogDescription>
            좌측에서 공격팀, 우측에서 수비팀을 선택하세요.
          </DialogDescription>
        </DialogHeader>

        {/* 인덱스 바 */}
        {indexes.length > 0 && (
          <div className="flex gap-1 overflow-x-auto pb-2 border-b">
            {indexes.map((index) => (
              <button
                key={index}
                onClick={() => handleIndexClick(index)}
                className={`
                  px-3 py-1 rounded text-xs font-semibold transition-colors flex-shrink-0
                  ${activeIndex === index
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                  }
                `}
              >
                {index}
              </button>
            ))}
          </div>
        )}

        {availableTeams.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">선수가 있는 팀이 없습니다.</p>
            <p className="text-xs mt-2">먼저 팀을 만들고 선수를 추가해주세요.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 overflow-y-auto flex-1">
            {/* 공격팀 선택 (좌측) */}
            <div className="flex flex-col">
              <div className="text-center py-2 bg-red-50 rounded-t-lg border-2 border-red-200 font-semibold text-red-700">
                🔴 공격팀
              </div>
              <div ref={offenseScrollRef} className="overflow-y-auto p-2 border-2 border-t-0 border-red-200 rounded-b-lg">
                {indexes.map((index) => (
                  <div key={`offense-${index}`} id={`team-index-${index}`} className="mb-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                      {index}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {teamsByIndex[index].map((team) =>
                        renderTeamCard(team, tempOffenseId, setTempOffenseId, 'offense')
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 수비팀 선택 (우측) */}
            <div className="flex flex-col">
              <div className="text-center py-2 bg-blue-50 rounded-t-lg border-2 border-blue-200 font-semibold text-blue-700">
                🔵 수비팀
              </div>
              <div ref={defenseScrollRef} className="overflow-y-auto p-2 border-2 border-t-0 border-blue-200 rounded-b-lg">
                {indexes.map((index) => (
                  <div key={`defense-${index}`} className="mb-3">
                    <div className="text-xs font-semibold text-muted-foreground mb-2 sticky top-0 bg-background py-1">
                      {index}
                    </div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {teamsByIndex[index].map((team) =>
                        renderTeamCard(team, tempDefenseId, setTempDefenseId, 'defense')
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {tempOffenseId && tempDefenseId ? (
              <span className="text-primary font-semibold">✓ 양쪽 모두 선택됨</span>
            ) : tempOffenseId ? (
              <span>공격팀만 선택됨 - 수비팀을 선택하세요</span>
            ) : tempDefenseId ? (
              <span>수비팀만 선택됨 - 공격팀을 선택하세요</span>
            ) : (
              <span>공격팀과 수비팀을 선택하세요</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              취소
            </Button>
            <Button onClick={handleConfirm} disabled={!tempOffenseId || !tempDefenseId}>
              선택 완료
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TeamSelectModal;
