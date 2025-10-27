import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';

/**
 * 잔루 확인 모달
 * 공수교대 또는 이닝 종료 시 베이스에 남은 주자를 저장할지 확인
 */
const RunnersLeftOnBaseModal = ({ isOpen, onClose, runners, teamName, onConfirm }) => {
  // 주자 목록 생성
  const runnersList = [];
  if (runners?.first) runnersList.push({ base: '1루', ...runners.first });
  if (runners?.second) runnersList.push({ base: '2루', ...runners.second });
  if (runners?.third) runnersList.push({ base: '3루', ...runners.third });

  const hasRunners = runnersList.length > 0;

  const handleSaveRunners = () => {
    onConfirm(true); // 잔루 허용
  };

  const handleClearRunners = () => {
    onConfirm(false); // 주자 초기화
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            📦 잔루 확인
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {hasRunners ? (
            <>
              <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                <p className="text-lg font-bold text-blue-900 mb-3 text-center">
                  {teamName}의 주자 현황
                </p>
                <div className="space-y-2">
                  {runnersList.map((runner, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-white rounded px-4 py-2 border border-blue-200"
                    >
                      <span className="font-bold text-blue-700">{runner.base}</span>
                      <span className="font-semibold text-gray-800">{runner.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-center text-gray-700">
                <p className="font-semibold mb-2">
                  베이스에 주자가 남아있습니다.
                </p>
                <p className="text-sm text-gray-600">
                  잔루를 허용하면 다음 공격 시 주자가 복원됩니다.
                </p>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-6xl mb-3">⚾</p>
              <p className="text-lg text-gray-600">베이스에 주자가 없습니다</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-3">
          <Button
            variant="outline"
            onClick={handleClearRunners}
            className="flex-1 text-lg font-bold"
          >
            {hasRunners ? '주자 초기화' : '확인'}
          </Button>
          {hasRunners && (
            <Button
              onClick={handleSaveRunners}
              className="flex-1 text-lg font-bold bg-blue-600 hover:bg-blue-700"
            >
              잔루 허용
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default RunnersLeftOnBaseModal;
