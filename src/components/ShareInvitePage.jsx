import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../config/firebase';
import { getShareData, joinByInvite } from '../services/firestoreService';
import { Button } from './ui/button';

/**
 * ShareInvitePage (Phase 2)
 *
 * 초대 링크를 통해 접속했을 때 표시되는 페이지
 * - URL에서 inviteCode 추출
 * - Firestore에서 공유 정보 조회
 * - 초대 수락/거부 UI
 * - 수락 시 sharedWithMe 컬렉션에 기록
 */
const ShareInvitePage = () => {
  const { inviteCode } = useParams(); // URL에서 초대 코드 추출
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [shareData, setShareData] = useState(null);
  const [error, setError] = useState('');
  const [processing, setProcessing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // 사용자 로그인 상태 확인
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });
    return () => unsubscribe();
  }, []);

  // 초대 코드로 공유 정보 조회
  useEffect(() => {
    const fetchShareData = async () => {
      if (!inviteCode) {
        setError('초대 코드가 올바르지 않습니다.');
        setLoading(false);
        return;
      }

      try {
        // firestoreService의 getShareData 함수 사용
        const data = await getShareData(inviteCode);
        setShareData(data);
        setLoading(false);

      } catch (err) {
        console.error('❌ Error fetching share data:', err);
        setError(err.message || '데이터 로딩 실패');
        setLoading(false);
      }
    };

    fetchShareData();
  }, [inviteCode]);

  // 초대 수락
  const handleAccept = async () => {
    if (!currentUser) {
      alert('로그인이 필요합니다. 로그인 후 다시 시도해주세요.');
      navigate('/');
      return;
    }

    if (!shareData) {
      alert('공유 정보를 찾을 수 없습니다.');
      return;
    }

    setProcessing(true);

    try {
      // firestoreService의 joinByInvite 함수 사용
      await joinByInvite(inviteCode);

      alert('✅ 초대를 수락했습니다! 메인 화면에서 공유된 학급/팀을 확인할 수 있습니다.');
      navigate('/');

    } catch (err) {
      console.error('❌ Error accepting invitation:', err);
      alert(err.message || '초대 수락 실패');
    } finally {
      setProcessing(false);
    }
  };

  // 초대 거부
  const handleDecline = () => {
    if (window.confirm('초대를 거부하시겠습니까?')) {
      navigate('/');
    }
  };

  // 권한 레벨 표시
  const getPermissionLabel = (level) => {
    const labels = {
      viewer: '조회 전용',
      editor: '경기 진행 가능',
      owner: '전체 관리'
    };
    return labels[level] || level;
  };

  // 로딩 중
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">초대 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // 에러 발생
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              오류 발생
            </h1>
            <p className="text-gray-600">{error}</p>
          </div>
          <Button
            onClick={() => navigate('/')}
            className="w-full"
          >
            메인으로 돌아가기
          </Button>
        </div>
      </div>
    );
  }

  // 로그인하지 않은 경우
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="text-6xl mb-4">🔒</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              로그인이 필요합니다
            </h1>
            <p className="text-gray-600 mb-4">
              초대를 수락하려면 먼저 로그인해주세요.
            </p>
          </div>
          <Button
            onClick={() => navigate('/')}
            className="w-full"
          >
            로그인 페이지로 이동
          </Button>
        </div>
      </div>
    );
  }

  // 공유 정보 표시 및 수락/거부
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            학급/팀 공유 초대
          </h1>
          <p className="text-gray-600">
            <strong className="text-blue-600">{shareData.ownerName}</strong> 선생님이
            학급과 팀을 공유하고 싶어합니다.
          </p>
        </div>

        {/* 공유 항목 목록 */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            📋 공유될 항목 ({shareData.items?.length || 0}개)
          </h2>
          <div className="space-y-2 bg-gray-50 p-4 rounded-lg border">
            {shareData.items?.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 bg-white rounded border"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">
                    {item.type === 'class' ? '📚' : '🏃'}
                  </span>
                  <div>
                    <div className="font-medium text-gray-900">{item.name}</div>
                    <div className="text-sm text-gray-500">
                      {item.type === 'class' ? '학급' : '팀'} • {item.count}명
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 권한 안내 */}
        <div className="mb-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">
            🔐 부여될 권한
          </h3>
          <p className="text-blue-800">
            <strong>{getPermissionLabel('editor')}</strong>
          </p>
          <p className="text-sm text-blue-700 mt-2">
            경기를 진행하고 기록을 남길 수 있습니다. 학급/팀 구성은 변경할 수 없습니다.
          </p>
        </div>

        {/* 주의사항 */}
        <div className="mb-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-900 mb-2">
            ⚠️ 주의사항
          </h3>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• 공유된 데이터는 원 소유자의 계정에 저장됩니다.</li>
            <li>• 학생 정보는 보호되며, 권한에 따라 제한적으로 접근됩니다.</li>
            <li>• 언제든지 공유 참여를 취소할 수 있습니다.</li>
          </ul>
        </div>

        {/* 버튼 */}
        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={handleDecline}
            disabled={processing}
            className="flex-1"
          >
            거부
          </Button>
          <Button
            onClick={handleAccept}
            disabled={processing}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {processing ? '처리 중...' : '✓ 수락하기'}
          </Button>
        </div>

        {/* 현재 로그인 정보 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          현재 로그인: <strong>{currentUser.email}</strong>
        </div>
      </div>
    </div>
  );
};

export default ShareInvitePage;
