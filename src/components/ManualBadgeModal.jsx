import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Card } from './ui/card';

export default function ManualBadgeModal({
  open,
  onOpenChange,
  student,
  allBadges = [],
  ownedBadges = [],
  onAwardBadge
}) {
  const [selectedBadgeId, setSelectedBadgeId] = useState(null);
  const [note, setNote] = useState('');

  const handleAward = async () => {
    if (!selectedBadgeId) {
      alert('배지를 선택하세요.');
      return;
    }

    await onAwardBadge(student.playerId, selectedBadgeId, note);
    setSelectedBadgeId(null);
    setNote('');
    onOpenChange(false);
  };

  const systemBadges = allBadges.filter(b => b.badgeType === 'system' || !b.badgeType);
  const customBadges = allBadges.filter(b => b.badgeType === 'custom' || b.isCustom);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            🏅 배지 부여: {student?.name} ({student?.className})
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 시스템 배지 */}
          <div>
            <h3 className="font-semibold mb-3 flex items-center gap-2">
              <span>⚾ 시스템 배지</span>
              <span className="text-xs text-muted-foreground font-normal">
                ({systemBadges.length}개)
              </span>
            </h3>
            {systemBadges.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                시스템 배지가 없습니다
              </p>
            ) : (
              <div className="grid grid-cols-4 tablet:grid-cols-5 gap-3 max-w-full">
                {systemBadges.map(badge => {
                  const isOwned = ownedBadges.includes(badge.id);
                  return (
                    <Card
                      key={badge.id}
                      className={`p-3 cursor-pointer transition-all ${
                        isOwned
                          ? 'opacity-50 cursor-not-allowed bg-gray-100'
                          : selectedBadgeId === badge.id
                          ? 'ring-2 ring-primary shadow-md'
                          : 'hover:shadow-lg'
                      }`}
                      onClick={() => !isOwned && setSelectedBadgeId(badge.id)}
                    >
                      <div className="text-3xl text-center mb-1">{badge.icon}</div>
                      <p className="text-xs text-center font-semibold truncate">
                        {badge.name}
                      </p>
                      {isOwned && (
                        <p className="text-xs text-center text-muted-foreground mt-1">
                          ✓ 보유
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* 커스텀 배지 */}
          {customBadges.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <span>✨ 커스텀 배지</span>
                <span className="text-xs text-muted-foreground font-normal">
                  ({customBadges.length}개)
                </span>
              </h3>
              <div className="grid grid-cols-4 tablet:grid-cols-5 gap-3 max-w-full">
                {customBadges.map(badge => {
                  const isOwned = ownedBadges.includes(badge.id);
                  return (
                    <Card
                      key={badge.id}
                      className={`p-3 cursor-pointer transition-all ${
                        isOwned
                          ? 'opacity-50 cursor-not-allowed bg-gray-100'
                          : selectedBadgeId === badge.id
                          ? 'ring-2 ring-primary shadow-md'
                          : 'hover:shadow-lg'
                      }`}
                      onClick={() => !isOwned && setSelectedBadgeId(badge.id)}
                    >
                      <div className="text-3xl text-center mb-1">{badge.icon}</div>
                      <p className="text-xs text-center font-semibold truncate">
                        {badge.name}
                      </p>
                      {isOwned && (
                        <p className="text-xs text-center text-muted-foreground mt-1">
                          ✓ 보유
                        </p>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* 선택된 배지 정보 */}
          {selectedBadgeId && (
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm font-semibold text-blue-900">
                선택된 배지: {allBadges.find(b => b.id === selectedBadgeId)?.name}
              </p>
            </div>
          )}

          {/* 수여 사유 */}
          <div>
            <Label htmlFor="award-note">수여 사유 (선택)</Label>
            <Textarea
              id="award-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="예: 오늘 수업에서 팀워크를 발휘했습니다."
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {note.length}/200자
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedBadgeId(null);
              setNote('');
              onOpenChange(false);
            }}
            type="button"
          >
            취소
          </Button>
          <Button
            onClick={handleAward}
            disabled={!selectedBadgeId}
            type="button"
          >
            부여하기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
