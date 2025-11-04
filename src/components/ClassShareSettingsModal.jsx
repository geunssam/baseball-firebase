import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { auth } from '../config/firebase';
import { createShareLink } from '../services/firestoreService';

/**
 * ClassShareSettingsModal (Phase 2)
 *
 * 공유 권한을 설정하고 초대 링크를 생성하는 두 번째 모달
 * - 권한 레벨 선택 (viewer, editor, owner)
 * - UUID 기반 초대 코드 생성
 * - Firestore shares 컬렉션에 문서 생성
 * - 공유 URL 표시 및 클립보드 복사
 */
const ClassShareSettingsModal = ({
  open,
  onOpenChange,
  selectedItems = [],  // ClassShareSelectionModal에서 전달된 선택 항목들
  onBack,              // 이전 단계로 돌아가기
  onComplete           // 완료 후 콜백
}) => {
  const [permissionLevel, setPermissionLevel] = useState('editor'); // 기본값: editor
  const [isGenerating, setIsGenerating] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareId, setShareId] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // 모달이 열릴 때마다 초기화
  useEffect(() => {
    if (open) {
      setPermissionLevel('editor');
      setShareUrl('');
      setShareId('');
      setInviteCode('');
      setCopied(false);
      setError('');
    }
  }, [open]);

  // 공유 링크 생성
  const generateShareLink = async () => {
    if (!auth.currentUser) {
      setError('로그인이 필요합니다.');
      return;
    }

    if (selectedItems.length === 0) {
      setError('공유할 항목을 선택해주세요.');
      return;
    }

    setIsGenerating(true);
    setError('');

    try {
      // firestoreService의 createShareLink 함수 사용
      const result = await createShareLink(selectedItems, permissionLevel);

      setShareId(result.shareId);
      setInviteCode(result.inviteCode);
      setShareUrl(result.shareUrl);

      console.log('✅ Share link created:', result);

    } catch (err) {
      console.error('❌ Error generating share link:', err);
      setError(`공유 링크 생성 실패: ${err.message}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // 클립보드 복사
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('❌ Copy failed:', err);
      alert('복사 실패. 수동으로 복사해주세요.');
    }
  };

  // 권한 레벨 옵션
  const permissionOptions = [
    {
      value: 'viewer',
      label: '조회만 가능 (Viewer)',
      description: '학급/팀 정보와 경기 기록을 볼 수만 있습니다.'
    },
    {
      value: 'editor',
      label: '경기 진행 가능 (Editor)',
      description: '경기를 진행하고 기록을 남길 수 있습니다. (추천)'
    },
    {
      value: 'owner',
      label: '전체 관리 (Owner)',
      description: '학급/팀 구성까지 변경할 수 있습니다. (신중히 선택)'
    }
  ];

  // 완료 처리
  const handleComplete = () => {
    onComplete?.({
      shareId,
      inviteCode,
      shareUrl,
      permissionLevel
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>공유 권한 설정</DialogTitle>
          <DialogDescription>
            다른 교사에게 부여할 권한을 선택하고 초대 링크를 생성하세요.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* 선택된 항목 요약 */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              공유할 항목 ({selectedItems.length}개)
            </h3>
            <div className="space-y-1">
              {selectedItems.map((item, idx) => (
                <div key={idx} className="text-sm text-gray-600">
                  {item.type === 'class' ? '📚' : '🏃'} {item.name}
                  <span className="text-gray-400 ml-2">
                    ({item.count}명)
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 권한 레벨 선택 */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">
              공유 권한 레벨 선택 *
            </Label>
            <div className="space-y-2">
              {permissionOptions.map(option => (
                <div
                  key={option.value}
                  className={`flex items-start space-x-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    permissionLevel === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setPermissionLevel(option.value)}
                >
                  <input
                    type="radio"
                    name="permission"
                    value={option.value}
                    checked={permissionLevel === option.value}
                    onChange={(e) => setPermissionLevel(e.target.value)}
                    className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {option.label}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      {option.description}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* 공유 링크 생성 결과 */}
          {shareUrl && (
            <div className="space-y-3 bg-green-50 border border-green-200 p-4 rounded-lg">
              <div className="flex items-center space-x-2 text-green-700">
                <span className="text-lg">✅</span>
                <span className="font-semibold">공유 링크가 생성되었습니다!</span>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  초대 코드
                </Label>
                <div className="font-mono text-sm bg-white p-2 rounded border break-all">
                  {inviteCode}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">
                  공유 URL
                </Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 text-sm bg-white p-2 rounded border font-mono"
                  />
                  <Button
                    size="sm"
                    onClick={copyToClipboard}
                    className={copied ? 'bg-green-600 hover:bg-green-700' : ''}
                  >
                    {copied ? '✓ 복사됨' : '📋 복사'}
                  </Button>
                </div>
              </div>

              <div className="text-sm text-gray-600 mt-3">
                💡 이 링크를 다른 교사에게 전달하면, 해당 교사가 링크를 통해
                공유된 학급/팀에 접근할 수 있습니다.
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onBack}
            disabled={isGenerating}
          >
            ← 이전
          </Button>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isGenerating}
            >
              취소
            </Button>
            {!shareUrl ? (
              <Button
                onClick={generateShareLink}
                disabled={isGenerating || selectedItems.length === 0}
              >
                {isGenerating ? '생성 중...' : '초대 링크 생성'}
              </Button>
            ) : (
              <Button onClick={handleComplete}>
                완료
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ClassShareSettingsModal;
