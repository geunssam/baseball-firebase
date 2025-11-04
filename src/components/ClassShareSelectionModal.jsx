import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Label } from './ui/label';

/**
 * ClassShareSelectionModal (Phase 1)
 *
 * 공유할 학급/팀을 선택하는 첫 번째 모달
 * - 내 학급 목록과 팀 목록을 표시
 * - 체크박스로 여러 항목 선택 가능
 * - 선택한 항목을 다음 모달(ClassShareSettingsModal)로 전달
 */
const ClassShareSelectionModal = ({
  open,
  onOpenChange,
  classes = [],      // 학급 목록
  teams = [],        // 팀 목록
  onNext             // 다음 단계 콜백 (선택된 항목 전달)
}) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [activeTab, setActiveTab] = useState('class'); // 'class' or 'team'

  // 모달이 닫힐 때 선택 초기화
  useEffect(() => {
    if (!open) {
      setSelectedItems([]);
      setActiveTab('class');
    }
  }, [open]);

  // 항목 선택/해제 토글
  const toggleItem = (item) => {
    setSelectedItems(prev => {
      const exists = prev.find(i => i.id === item.id && i.type === item.type);
      if (exists) {
        return prev.filter(i => !(i.id === item.id && i.type === item.type));
      } else {
        return [...prev, item];
      }
    });
  };

  // 항목이 선택되었는지 확인
  const isSelected = (item) => {
    return selectedItems.some(i => i.id === item.id && i.type === item.type);
  };

  // 현재 탭의 모든 항목 선택
  const selectAllInTab = () => {
    const currentTabItems = activeTab === 'class'
      ? classes.map(c => ({ type: 'class', id: c.id, name: c.name, count: c.studentCount }))
      : teams.map(t => ({ type: 'team', id: t.id, name: t.name, count: t.playerCount }));

    // 현재 탭의 항목들을 추가 (중복 제거)
    setSelectedItems(prev => {
      const filtered = prev.filter(item => item.type !== activeTab);
      return [...filtered, ...currentTabItems];
    });
  };

  // 현재 탭의 선택 해제
  const clearSelectionInTab = () => {
    setSelectedItems(prev => prev.filter(item => item.type !== activeTab));
  };

  // 현재 탭에서 선택된 항목 개수
  const getSelectedCountInTab = () => {
    return selectedItems.filter(item => item.type === activeTab).length;
  };

  // 다음 단계로 진행
  const handleNext = () => {
    if (selectedItems.length === 0) {
      alert('공유할 학급 또는 팀을 최소 1개 선택해주세요.');
      return;
    }
    onNext(selectedItems);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>공유할 학급/팀 선택</DialogTitle>
          <DialogDescription>
            다른 교사와 공유할 학급이나 팀을 선택하세요. (복수 선택 가능)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 전체 선택 요약 */}
          <div className="flex items-center justify-between text-sm bg-blue-50 border border-blue-200 rounded-lg p-3">
            <span className="text-gray-700">
              총 선택됨: <strong className="text-blue-600">{selectedItems.length}개</strong>
              <span className="text-gray-500 ml-2">
                (학급 {selectedItems.filter(i => i.type === 'class').length}개,
                팀 {selectedItems.filter(i => i.type === 'team').length}개)
              </span>
            </span>
          </div>

          {/* 탭 버튼 */}
          <div className="flex border-b border-gray-200">
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'class'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('class')}
            >
              📚 학급 ({classes.length}개)
            </button>
            <button
              className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
                activeTab === 'team'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('team')}
            >
              🏃 팀 ({teams.length}개)
            </button>
          </div>

          {/* 현재 탭 선택 컨트롤 */}
          <div className="flex items-center justify-between text-sm px-1">
            <span className="text-gray-600">
              현재 탭 선택: <strong className="text-blue-600">{getSelectedCountInTab()}개</strong>
            </span>
            <div className="space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllInTab}
                disabled={activeTab === 'class' ? classes.length === 0 : teams.length === 0}
              >
                전체 선택
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearSelectionInTab}
                disabled={getSelectedCountInTab() === 0}
              >
                선택 해제
              </Button>
            </div>
          </div>

          {/* 탭 컨텐츠 */}
          <div className="min-h-[300px] max-h-[400px] overflow-y-auto">
            {/* 학급 탭 */}
            {activeTab === 'class' && (
              <div className="space-y-2">
                {classes.length > 0 ? (
                  classes.map(classItem => {
                    const item = {
                      type: 'class',
                      id: classItem.id,
                      name: classItem.name,
                      count: classItem.studentCount || 0
                    };
                    return (
                      <div
                        key={classItem.id}
                        className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => toggleItem(item)}
                      >
                        <Checkbox
                          checked={isSelected(item)}
                          onCheckedChange={() => toggleItem(item)}
                        />
                        <Label
                          htmlFor={`class-${classItem.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{classItem.name}</span>
                            <span className="text-sm text-gray-500">
                              학생 {classItem.studentCount || 0}명
                            </span>
                          </div>
                        </Label>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>생성된 학급이 없습니다.</p>
                    <p className="text-sm mt-2">먼저 학급을 생성해주세요.</p>
                  </div>
                )}
              </div>
            )}

            {/* 팀 탭 */}
            {activeTab === 'team' && (
              <div className="space-y-2">
                {teams.length > 0 ? (
                  teams.map(team => {
                    const item = {
                      type: 'team',
                      id: team.id,
                      name: team.name,
                      count: team.playerCount || 0
                    };
                    return (
                      <div
                        key={team.id}
                        className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => toggleItem(item)}
                      >
                        <Checkbox
                          checked={isSelected(item)}
                          onCheckedChange={() => toggleItem(item)}
                        />
                        <Label
                          htmlFor={`team-${team.id}`}
                          className="flex-1 cursor-pointer"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{team.name}</span>
                            <span className="text-sm text-gray-500">
                              선수 {team.playerCount || 0}명
                            </span>
                          </div>
                        </Label>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    <p>생성된 팀이 없습니다.</p>
                    <p className="text-sm mt-2">먼저 팀을 생성해주세요.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button
            onClick={handleNext}
            disabled={selectedItems.length === 0}
          >
            다음 단계
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClassShareSelectionModal;
