import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { AlertTriangle } from 'lucide-react';

/**
 * DeleteConfirmModal
 * 삭제 확인 모달 컴포넌트
 *
 * @param {boolean} isOpen - 모달 열림/닫힘 상태
 * @param {Function} onClose - 모달 닫기 함수
 * @param {Function} onConfirm - 삭제 확인 함수
 * @param {string} title - 모달 제목
 * @param {string} itemName - 삭제할 항목 이름
 * @param {Array<string>} deletedItems - 삭제될 항목 목록
 * @param {boolean} isDeleting - 삭제 진행 중 상태
 */
export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  deletedItems = [],
  isDeleting = false
}) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-rose-600">
            <AlertTriangle className="w-5 h-5" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>
            이 작업은 되돌릴 수 없습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg">
            <p className="font-semibold text-rose-900 mb-3">
              "{itemName}"을(를) 완전히 삭제하시겠습니까?
            </p>

            {deletedItems.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-rose-800 font-medium">
                  다음 항목이 모두 삭제됩니다:
                </p>
                <ul className="text-sm text-rose-700 space-y-1">
                  {deletedItems.map((item, index) => (
                    <li key={index} className="flex items-start">
                      <span className="mr-2">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-lg border border-amber-200">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <p className="text-sm font-medium">
              ⚠️ 이 작업은 되돌릴 수 없습니다!
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isDeleting}
          >
            취소
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-rose-600 hover:bg-rose-700 text-white"
          >
            {isDeleting ? '삭제 중...' : '삭제'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
