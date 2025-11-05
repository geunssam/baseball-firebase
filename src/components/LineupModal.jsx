import { useState, useEffect } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import PlayerBadgeDisplay from './PlayerBadgeDisplay';

const POSITION_OPTIONS = ['포수', '1루수', '2루수', '3루수', '자유수비', '외야수', '직접입력'];

/**
 * SortableRow
 * 드래그 가능한 선수 행
 */
const SortableRow = ({ player, index, onPositionChange }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: player.id || `player-${index}`,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className="border-b hover:bg-accent/5">
      <td className="p-3 text-center font-bold text-lg bg-muted/30">
        {index + 1}
      </td>
      <td className="p-3">
        <PlayerBadgeDisplay
          player={player}
          maxBadges={3}
          size="sm"
          showEmpty={false}
          showOverflow={true}
        />
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <span
            {...attributes}
            {...listeners}
            className="cursor-move text-muted-foreground hover:text-foreground text-xl select-none"
            title="드래그하여 타순 변경"
          >
            ⠿
          </span>
          <span className="font-medium">{player.name}</span>
        </div>
      </td>
      <td className="p-3">
        <Select
          value={player.position || ''}
          onValueChange={(value) => onPositionChange(index, value)}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="포지션 선택" />
          </SelectTrigger>
          <SelectContent>
            {POSITION_OPTIONS.map((pos) => (
              <SelectItem key={pos} value={pos}>
                {pos}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </td>
    </tr>
  );
};

/**
 * LineupModal
 *
 * 라인업 편성 모달
 * - 드래그앤드롭으로 타순 변경
 * - 포지션 선택
 * - 저장 시 battingOrder와 position 업데이트
 */
const LineupModal = ({ open, onOpenChange, team, onSaveLineup }) => {
  const [lineup, setLineup] = useState([]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (!team || !team.players) return;

    // 기존 라인업이 있으면 사용, 없으면 선수 목록으로 초기화
    const initialLineup = team.players.map((player, idx) => ({
      ...player,
      id: player.id || `temp-${idx}`,
      battingOrder: player.battingOrder ?? (idx + 1),
      position: player.position || '',
    }));

    setLineup(initialLineup);
  }, [team]);

  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) return;

    setLineup((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      return arrayMove(items, oldIndex, newIndex);
    });
  };

  const handlePositionChange = (index, position) => {
    const newLineup = [...lineup];
    newLineup[index] = { ...newLineup[index], position };
    setLineup(newLineup);
  };

  const handleSave = () => {
    // 현재 순서대로 battingOrder 재설정
    const sortedLineup = lineup.map((player, idx) => ({
      ...player,
      battingOrder: idx + 1,
    }));

    onSaveLineup(sortedLineup);
    onOpenChange(false);
  };

  if (!team) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            ⚾ {team.name} - 라인업 편성
          </DialogTitle>
          <DialogDescription>
            ⠿ 아이콘을 드래그하여 타순을 변경하고, 각 선수의 포지션을 선택하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <div className="overflow-x-auto">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <table className="w-full border-collapse">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-3 text-sm font-semibold border w-20">타순</th>
                    <th className="p-3 text-sm font-semibold border w-32">배지</th>
                    <th className="p-3 text-sm font-semibold border">선수명</th>
                    <th className="p-3 text-sm font-semibold border">수비 포지션</th>
                  </tr>
                </thead>
                <SortableContext
                  items={lineup.map((p) => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <tbody>
                    {lineup.map((player, idx) => (
                      <SortableRow
                        key={player.id}
                        player={player}
                        index={idx}
                        onPositionChange={handlePositionChange}
                      />
                    ))}
                  </tbody>
                </SortableContext>
              </table>
            </DndContext>
          </div>

          <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-sm text-primary font-medium">
              💡 라인업 편성 팁
            </p>
            <ul className="text-xs text-muted-foreground mt-2 space-y-1">
              <li>• 왼쪽 ⠿ 아이콘을 드래그하여 타순을 변경할 수 있습니다</li>
              <li>• 각 선수의 포지션을 선택하세요 (선택사항)</li>
              <li>• 저장하면 팀 정보에 라인업이 저장됩니다</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button onClick={handleSave}>
            ✅ 저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LineupModal;
