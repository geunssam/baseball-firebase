import { useState, useEffect } from 'react';
import { db, auth } from '../config/firebase';
import { collection, query, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { Button } from './ui/button';

/**
 * SharedItemsSection (Phase 2)
 *
 * 다른 교사로부터 공유받은 학급/팀을 표시하는 섹션
 * - 실시간 리스너로 sharedWithMe 컬렉션 구독
 * - 소유자 이름, 권한 레벨 표시
 * - 공유 탈퇴 기능
 */
const SharedItemsSection = ({ onRefresh }) => {
  const [sharedItems, setSharedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('class'); // 'class' or 'team'

  // 실시간 리스너로 공유받은 항목 구독
  useEffect(() => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    const sharedWithMeRef = collection(db, 'users', auth.currentUser.uid, 'sharedWithMe');
    const q = query(sharedWithMeRef);

    const unsubscribe = onSnapshot(q,
      (snapshot) => {
        const items = [];
        snapshot.forEach((doc) => {
          items.push({
            id: doc.id,
            ...doc.data()
          });
        });
        setSharedItems(items);
        setLoading(false);
      },
      (err) => {
        console.error('❌ Error fetching shared items:', err);
        setError(`데이터 로딩 실패: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth.currentUser]);

  // 공유 탈퇴
  const handleLeaveShare = async (item) => {
    if (!window.confirm(`"${item.ownerName}" 선생님의 공유에서 탈퇴하시겠습니까?`)) {
      return;
    }

    try {
      const sharedDocRef = doc(db, 'users', auth.currentUser.uid, 'sharedWithMe', item.id);
      await deleteDoc(sharedDocRef);

      alert('✅ 공유에서 탈퇴했습니다.');
      onRefresh?.(); // 부모 컴포넌트 새로고침 트리거
    } catch (err) {
      console.error('❌ Error leaving share:', err);
      alert(`공유 탈퇴 실패: ${err.message}`);
    }
  };

  // 권한 레벨 뱃지
  const getPermissionBadge = (permission) => {
    const badges = {
      viewer: {
        label: '조회 전용',
        color: 'bg-gray-100 text-gray-700 border-gray-300'
      },
      editor: {
        label: '경기 진행',
        color: 'bg-blue-100 text-blue-700 border-blue-300'
      },
      owner: {
        label: '전체 관리',
        color: 'bg-purple-100 text-purple-700 border-purple-300'
      }
    };

    const badge = badges[permission] || badges.viewer;
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${badge.color}`}>
        {badge.label}
      </span>
    );
  };

  // 로딩 중
  if (loading) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600">공유 항목 로딩 중...</span>
        </div>
      </div>
    );
  }

  // 에러 발생
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700 text-sm">{error}</p>
      </div>
    );
  }

  // 탭별 항목 필터링 (shares 문서에서 items 배열의 type으로 구분)
  const getFilteredItems = () => {
    return sharedItems.filter(item => {
      // item.items는 공유된 학급/팀 목록 배열
      // 현재 탭에 해당하는 항목이 하나라도 있으면 표시
      if (!item.items || item.items.length === 0) return false;
      return item.items.some(sharedItem => sharedItem.type === activeTab);
    });
  };

  // 현재 탭의 항목 개수
  const getTabCount = (tabType) => {
    return sharedItems.filter(item => {
      if (!item.items || item.items.length === 0) return false;
      return item.items.some(sharedItem => sharedItem.type === tabType);
    }).length;
  };

  const classCount = getTabCount('class');
  const teamCount = getTabCount('team');
  const filteredItems = getFilteredItems();

  // 공유받은 항목이 없을 때
  if (sharedItems.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <div className="text-4xl mb-2">📭</div>
        <p className="text-gray-600 text-sm">
          아직 공유받은 학급이나 팀이 없습니다.
        </p>
        <p className="text-gray-500 text-xs mt-2">
          다른 교사로부터 초대 링크를 받으면 여기에 표시됩니다.
        </p>
      </div>
    );
  }

  // 공유받은 항목 목록
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">
          🤝 공유받은 항목 ({sharedItems.length}개)
        </h3>
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
          📚 학급 ({classCount}개)
        </button>
        <button
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            activeTab === 'team'
              ? 'border-b-2 border-purple-600 text-purple-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
          onClick={() => setActiveTab('team')}
        >
          🏃 팀 ({teamCount}개)
        </button>
      </div>

      {/* 현재 탭에 해당하는 항목이 없을 때 */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
          <p>공유받은 {activeTab === 'class' ? '학급' : '팀'}이 없습니다.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => (
          <div
            key={item.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    {item.ownerName}
                  </span>
                  <span className="text-gray-400">•</span>
                  {getPermissionBadge(item.permission)}
                </div>

                {/* 공유된 항목 목록 (현재 탭에 해당하는 것만) */}
                {item.items && item.items.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {item.items
                      .filter(sharedItem => sharedItem.type === activeTab)
                      .map((sharedItem, idx) => (
                        <div key={idx} className="text-sm text-gray-700 flex items-center">
                          <span className="mr-2">
                            {sharedItem.type === 'class' ? '📚' : '🏃'}
                          </span>
                          <span className="font-medium">{sharedItem.name}</span>
                          <span className="text-gray-500 ml-2">
                            ({sharedItem.count}명)
                          </span>
                        </div>
                      ))}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-2">
                  공유 ID: {item.shareId}
                </div>

                {item.joinedAt && (
                  <div className="text-xs text-gray-400 mt-1">
                    참여일: {new Date(item.joinedAt.toDate()).toLocaleDateString('ko-KR')}
                  </div>
                )}
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleLeaveShare(item)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                탈퇴
              </Button>
            </div>
          </div>
        ))}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
        <div className="flex items-start space-x-2">
          <span className="text-blue-600 mt-0.5">💡</span>
          <div className="text-blue-800">
            <p className="font-medium mb-1">공유된 데이터 이용 안내</p>
            <ul className="space-y-1 text-blue-700">
              <li>• 소유자의 학급/팀 데이터를 권한에 따라 이용할 수 있습니다.</li>
              <li>• 데이터는 원 소유자의 계정에 저장되며, 삭제 시 접근이 불가능합니다.</li>
              <li>• 언제든지 공유에서 탈퇴할 수 있습니다.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SharedItemsSection;
