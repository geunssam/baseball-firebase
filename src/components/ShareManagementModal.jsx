import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Trash2, UserX, Settings } from 'lucide-react';
import { auth, db } from '../config/firebase';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { updateSharePermission, removeUserFromShare } from '../services/firestoreService';

/**
 * ShareManagementModal (Phase 6)
 *
 * 기존 공유를 관리하는 모달
 * - 공유 중인 사용자 목록 표시
 * - 권한 변경 기능
 * - 접근 권한 취소 기능
 */
const ShareManagementModal = ({
  open,
  onOpenChange,
  classId,
  teamId,
  itemType, // 'class' or 'team'
  itemName
}) => {
  const [loading, setLoading] = useState(true);
  const [shares, setShares] = useState([]); // 이 항목과 관련된 모든 공유 목록
  const [updating, setUpdating] = useState(null); // 현재 업데이트 중인 사용자 ID
  const [error, setError] = useState('');

  // 공유 정보 로드
  useEffect(() => {
    if (open && (classId || teamId || itemType === 'all')) {
      loadShareInfo();
    }
  }, [open, classId, teamId, itemType]);

  const loadShareInfo = async () => {
    try {
      setLoading(true);
      setError('');

      const userId = auth.currentUser.uid;

      // 1. 내가 소유한 shares 중에서 해당 항목이 포함된 것들 찾기
      const sharesRef = collection(db, 'shares');
      const q = query(sharesRef, where('ownerId', '==', userId));
      const snapshot = await getDocs(q);

      const relevantShares = [];

      for (const shareDoc of snapshot.docs) {
        const shareData = shareDoc.data();

        // items 배열에서 현재 항목(classId 또는 teamId)이 포함되어 있는지 확인
        // itemType이 'all'이면 모든 공유를 표시
        const hasItem = itemType === 'all' || shareData.items?.some(item => {
          if (itemType === 'class') {
            return item.type === 'class' && item.id === classId;
          } else {
            return item.type === 'team' && item.id === teamId;
          }
        });

        if (hasItem) {
          // 각 권한 레벨의 사용자 정보 가져오기
          const sharedUsers = [];

          // viewers
          for (const uid of (shareData.permissions?.viewers || [])) {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              sharedUsers.push({
                uid,
                email: userDoc.data().email,
                permission: 'viewer',
                shareId: shareDoc.id
              });
            }
          }

          // editors
          for (const uid of (shareData.permissions?.editors || [])) {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              sharedUsers.push({
                uid,
                email: userDoc.data().email,
                permission: 'editor',
                shareId: shareDoc.id
              });
            }
          }

          // owners
          for (const uid of (shareData.permissions?.owners || [])) {
            const userDoc = await getDoc(doc(db, 'users', uid));
            if (userDoc.exists()) {
              sharedUsers.push({
                uid,
                email: userDoc.data().email,
                permission: 'owner',
                shareId: shareDoc.id
              });
            }
          }

          if (sharedUsers.length > 0) {
            relevantShares.push({
              shareId: shareDoc.id,
              inviteCode: shareData.inviteCode,
              users: sharedUsers,
              createdAt: shareData.createdAt,
              items: shareData.items
            });
          }
        }
      }

      setShares(relevantShares);
      console.log('📋 공유 정보 로드 완료:', relevantShares);

    } catch (err) {
      console.error('❌ 공유 정보 로드 실패:', err);
      setError('공유 정보를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 권한 변경
  const handleChangePermission = async (shareId, userId, newPermission) => {
    if (!confirm(`이 사용자의 권한을 "${getPermissionLabel(newPermission)}"로 변경하시겠습니까?`)) {
      return;
    }

    try {
      setUpdating(userId);
      await updateSharePermission(shareId, userId, newPermission);

      // 목록 새로고침
      await loadShareInfo();

      alert('✅ 권한이 변경되었습니다.');
    } catch (err) {
      console.error('❌ 권한 변경 실패:', err);
      alert(`권한 변경 실패: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  };

  // 접근 권한 취소
  const handleRevokeAccess = async (shareId, userId, userEmail) => {
    if (!confirm(`${userEmail} 사용자의 접근 권한을 취소하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      setUpdating(userId);
      await removeUserFromShare(shareId, userId);

      // 목록 새로고침
      await loadShareInfo();

      alert('✅ 접근 권한이 취소되었습니다.');
    } catch (err) {
      console.error('❌ 권한 취소 실패:', err);
      alert(`권한 취소 실패: ${err.message}`);
    } finally {
      setUpdating(null);
    }
  };

  // 권한 레벨 라벨
  const getPermissionLabel = (permission) => {
    const labels = {
      viewer: '조회 전용',
      editor: '경기 진행',
      owner: '전체 관리'
    };
    return labels[permission] || permission;
  };

  // 권한 레벨 색상
  const getPermissionColor = (permission) => {
    const colors = {
      viewer: 'bg-gray-100 text-gray-700 border-gray-300',
      editor: 'bg-blue-100 text-blue-700 border-blue-300',
      owner: 'bg-purple-100 text-purple-700 border-purple-300'
    };
    return colors[permission] || 'bg-gray-100 text-gray-700';
  };

  // 전체 공유 사용자 수
  const totalUsers = shares.reduce((sum, share) => sum + share.users.length, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            공유 관리
          </DialogTitle>
          <DialogDescription>
            <strong>{itemName}</strong>에 대한 공유 권한을 관리합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">로딩 중...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          ) : totalUsers === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <UserX className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-sm">아직 공유 중인 사용자가 없습니다.</p>
              <p className="text-xs mt-2">
                학급/팀 관리 화면에서 "공유하기" 버튼을 눌러 다른 교사를 초대하세요.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 공유 요약 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-blue-900">
                      공유 중인 사용자
                    </div>
                    <div className="text-2xl font-bold text-blue-700 mt-1">
                      {totalUsers}명
                    </div>
                  </div>
                  <div className="text-blue-400">
                    👥
                  </div>
                </div>
              </div>

              {/* 공유별 사용자 목록 */}
              {shares.map((share) => (
                <div key={share.shareId} className="border rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-2 border-b">
                    <div className="text-xs text-gray-500">
                      초대 코드: <span className="font-mono">{share.inviteCode}</span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {share.items.length}개 항목 공유 중
                    </div>
                  </div>

                  <div className="divide-y">
                    {share.users.map((user) => (
                      <div
                        key={user.uid}
                        className="px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {user.email}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-xs px-2 py-0.5 rounded-full border ${getPermissionColor(user.permission)}`}>
                                {getPermissionLabel(user.permission)}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* 권한 변경 */}
                            <Select
                              value={user.permission}
                              onValueChange={(newPermission) =>
                                handleChangePermission(share.shareId, user.uid, newPermission)
                              }
                              disabled={updating === user.uid}
                            >
                              <SelectTrigger className="w-[140px] h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="viewer">조회 전용</SelectItem>
                                <SelectItem value="editor">경기 진행</SelectItem>
                                <SelectItem value="owner">전체 관리</SelectItem>
                              </SelectContent>
                            </Select>

                            {/* 권한 취소 */}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleRevokeAccess(share.shareId, user.uid, user.email)}
                              disabled={updating === user.uid}
                            >
                              {updating === user.uid ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* 안내 메시지 */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm">
                <div className="flex items-start space-x-2">
                  <span className="text-yellow-600 mt-0.5">⚠️</span>
                  <div className="text-yellow-800">
                    <div className="font-semibold mb-1">주의사항</div>
                    <ul className="space-y-1 text-xs">
                      <li>• 권한을 변경하면 즉시 적용됩니다.</li>
                      <li>• 접근 권한을 취소하면 해당 사용자는 더 이상 이 항목을 볼 수 없습니다.</li>
                      <li>• 취소된 권한은 새로운 초대 링크를 통해서만 다시 부여할 수 있습니다.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ShareManagementModal;
