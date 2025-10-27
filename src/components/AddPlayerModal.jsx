import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Input } from './ui/input';

/**
 * AddPlayerModal
 *
 * 팀에 선수를 추가하는 모달
 * - 일괄 입력: 쉼표 또는 줄바꿈으로 구분하여 여러 명 추가
 * - 자동 번호 부여 (기존 선수 수 + 1부터)
 */
const AddPlayerModal = ({ open, onOpenChange, onAddPlayers, currentPlayerCount }) => {
  const [playerInput, setPlayerInput] = useState('');

  const handleAdd = () => {
    if (!playerInput.trim()) {
      alert('선수 이름을 입력해주세요.');
      return;
    }

    // 쉼표 또는 줄바꿈으로 구분
    const names = playerInput
      .split(/[,\n]+/)
      .map(name => name.trim())
      .filter(name => name.length > 0);

    if (names.length === 0) {
      alert('올바른 이름을 입력해주세요.');
      return;
    }

    // 선수 객체 생성 (번호 자동 부여)
    const newPlayers = names.map((name, index) => ({
      name,
      number: currentPlayerCount + index + 1,
    }));

    onAddPlayers(newPlayers);
    setPlayerInput('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>선수 추가</DialogTitle>
          <DialogDescription>
            선수 이름을 입력하세요. 쉼표(,) 또는 줄바꿈으로 구분하여 여러 명을 한 번에 추가할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="player-input">선수 이름</Label>
            <textarea
              id="player-input"
              value={playerInput}
              onChange={(e) => setPlayerInput(e.target.value)}
              placeholder="예: 홍길동, 김철수, 이영희&#10;또는&#10;홍길동&#10;김철수&#10;이영희"
              className="min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              rows={5}
            />
            <p className="text-xs text-muted-foreground">
              💡 입력된 순서대로 {currentPlayerCount + 1}번부터 자동으로 번호가 부여됩니다.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setPlayerInput('');
              onOpenChange(false);
            }}
          >
            취소
          </Button>
          <Button onClick={handleAdd}>추가</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPlayerModal;
