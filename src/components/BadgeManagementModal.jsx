import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './ui/tabs';
import BadgeCreator from './BadgeCreator';
import { Card } from './ui/card';
import { Button } from './ui/button';

export default function BadgeManagementModal({
  open,
  onOpenChange,
  customBadges = [],
  systemBadges = [],
  onSaveBadge,
  onDeleteBadge,
  onHideBadge,
  hiddenBadges = [],
  onRecalculateAllBadges,
  isRecalculating = false,
  recalculateProgress = null
}) {
  const [activeTab, setActiveTab] = useState('create');
  const [editMode, setEditMode] = useState('custom'); // 'system' | 'custom'
  const [editingBadge, setEditingBadge] = useState(null);

  const handleSaveBadge = (badge) => {
    onSaveBadge(badge);
    setEditingBadge(null);
    setActiveTab('edit');
  };

  const handleCancelEdit = () => {
    setEditingBadge(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>⚙️ 배지 편집</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create">➕ 새로 만들기</TabsTrigger>
            <TabsTrigger value="edit">✏️ 수정하기</TabsTrigger>
            <TabsTrigger value="manage">🔧 관리</TabsTrigger>
          </TabsList>

          {/* 새로 만들기 탭 */}
          <TabsContent value="create" className="max-w-full">
            <BadgeCreator
              onSave={handleSaveBadge}
              standalone={false}
            />
          </TabsContent>

          {/* 수정하기 탭 */}
          <TabsContent value="edit" className="max-w-full">
            {editingBadge ? (
              <BadgeCreator
                initialBadge={editingBadge}
                onSave={handleSaveBadge}
                onCancel={handleCancelEdit}
                standalone={false}
              />
            ) : (
              <div className="space-y-6">
                {/* 서브탭 */}
                <Tabs value={editMode} onValueChange={setEditMode}>
                  <TabsList className="w-full">
                    <TabsTrigger value="system" className="flex-1">
                      🎯 기본 배지
                    </TabsTrigger>
                    <TabsTrigger value="custom" className="flex-1">
                      ✨ 커스텀 배지
                    </TabsTrigger>
                  </TabsList>

                  {/* 기본 배지 */}
                  <TabsContent value="system" className="max-w-full">
                    <p className="text-sm text-muted-foreground mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      ⚠️ 기본 배지는 아이콘과 이름만 수정할 수 있습니다.
                    </p>
                    <div className="grid grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-4 gap-4 max-w-full">
                      {systemBadges.map(badge => {
                        const isHidden = hiddenBadges.includes(badge.id);
                        return (
                          <Card
                            key={badge.id}
                            className={`p-4 hover:shadow-lg transition-shadow ${isHidden ? 'opacity-50' : ''}`}
                          >
                            <div className="text-4xl text-center mb-2">{badge.icon}</div>
                            <h3 className="text-sm font-semibold text-center truncate">
                              {badge.name}
                            </h3>
                            <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
                              {badge.description}
                            </p>
                            <div className="mt-3 flex gap-1 justify-center">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setEditingBadge(badge)}
                                type="button"
                              >
                                ✏️
                              </Button>
                              <Button
                                size="sm"
                                variant={isHidden ? "default" : "ghost"}
                                onClick={() => onHideBadge(badge.id)}
                                type="button"
                                title={isHidden ? "표시하기" : "숨기기"}
                              >
                                {isHidden ? '👁️' : '🙈'}
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </TabsContent>

                  {/* 커스텀 배지 */}
                  <TabsContent value="custom" className="max-w-full">
                    {customBadges.length === 0 ? (
                      <div className="text-center py-12 text-muted-foreground">
                        <p className="text-5xl mb-4">📦</p>
                        <p className="text-lg font-semibold mb-2">아직 만든 배지가 없습니다</p>
                        <p className="text-sm">새로 만들기 탭에서 배지를 만들어보세요!</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 tablet:grid-cols-3 desktop:grid-cols-4 gap-4 max-w-full">
                        {customBadges.map(badge => {
                          const isHidden = hiddenBadges.includes(badge.id);
                          return (
                            <Card
                              key={badge.id}
                              className={`p-4 relative hover:shadow-lg transition-shadow ${isHidden ? 'opacity-50' : ''}`}
                            >
                              <div className="text-4xl text-center mb-2">{badge.icon}</div>
                              <h3 className="text-sm font-semibold text-center truncate">
                                {badge.name}
                              </h3>
                              <p className="text-xs text-muted-foreground text-center mt-1 line-clamp-2">
                                {badge.description}
                              </p>
                              <div className="mt-3 flex gap-1 justify-center flex-wrap">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingBadge(badge)}
                                  type="button"
                                >
                                  ✏️
                                </Button>
                                <Button
                                  size="sm"
                                  variant={isHidden ? "default" : "ghost"}
                                  onClick={() => onHideBadge(badge.id)}
                                  type="button"
                                  title={isHidden ? "표시하기" : "숨기기"}
                                >
                                  {isHidden ? '👁️' : '🙈'}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (confirm(`"${badge.name}" 배지를 삭제하시겠습니까?`)) {
                                      onDeleteBadge(badge.id);
                                    }
                                  }}
                                  type="button"
                                >
                                  🗑️
                                </Button>
                              </div>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </TabsContent>

          {/* 관리 탭 */}
          <TabsContent value="manage" className="max-w-full">
            <div className="space-y-6">
              {/* 배지 재계산 섹션 */}
              <Card className="p-6 bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="text-4xl">🔄</div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800 mb-2">
                        전체 배지 재계산
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        모든 학생의 배지를 경기 기록을 기반으로 다시 계산합니다.
                        배지 조건 변경, 데이터 오류 수정, 새 배지 추가 시 사용하세요.
                      </p>

                      {/* 진행 상황 표시 */}
                      {isRecalculating && recalculateProgress && (
                        <div className="space-y-2 mb-4 p-3 bg-white rounded-lg border border-amber-300">
                          <p className="text-amber-800 font-semibold">
                            {recalculateProgress.studentName} ({recalculateProgress.current}/{recalculateProgress.total})
                          </p>
                          <div className="w-full bg-amber-200 rounded-full h-2">
                            <div
                              className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                              style={{
                                width: `${recalculateProgress.total > 0 ? (recalculateProgress.current / recalculateProgress.total) * 100 : 0}%`
                              }}
                            />
                          </div>
                          <p className="text-xs text-amber-600">
                            성공: {recalculateProgress.success}명 | 실패: {recalculateProgress.failed}명
                          </p>
                        </div>
                      )}

                      <Button
                        onClick={onRecalculateAllBadges}
                        disabled={isRecalculating}
                        className="bg-amber-500 hover:bg-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isRecalculating ? '🔄 재계산 중...' : '🔄 배지 재계산 시작'}
                      </Button>
                    </div>
                  </div>

                  {/* 주의사항 */}
                  <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800 font-semibold mb-2">⚠️ 주의사항</p>
                    <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                      <li>학생 수가 많으면 시간이 걸릴 수 있습니다</li>
                      <li>재계산 중에는 다른 작업을 피해주세요</li>
                      <li>재계산 후 자동으로 저장됩니다</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
