import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PrivacyPolicyModal from './PrivacyPolicyModal';
import firestoreService from '../services/firestoreService';
import { PRIVACY_POLICY_VERSION } from '../constants/privacyPolicy';

/**
 * 개인정보 동의 가드 컴포넌트
 *
 * 로그인한 사용자(교사)가 개인정보 처리방침에 동의했는지 확인하고,
 * 동의하지 않았다면 강제로 모달을 띄워 동의를 받습니다.
 *
 * Props:
 * - children: 동의 후 보여질 컴포넌트
 */
export default function PrivacyConsentGuard({ children }) {
  const { user, loading } = useAuth();
  const [hasConsent, setHasConsent] = useState(null); // null: 확인 중, true: 동의함, false: 동의 안함
  const [showModal, setShowModal] = useState(false);
  const [isCheckingConsent, setIsCheckingConsent] = useState(true);

  // 동의 여부 확인
  useEffect(() => {
    const checkConsent = async () => {
      // 로그인하지 않았거나 로딩 중이면 체크하지 않음
      if (!user || loading) {
        setIsCheckingConsent(false);
        setHasConsent(true); // 로그인 전에는 가드를 통과
        return;
      }

      console.log('🔍 [PrivacyConsentGuard] 동의 여부 확인 시작...');
      setIsCheckingConsent(true);

      try {
        const consent = await firestoreService.checkPrivacyConsent(
          user.uid,
          PRIVACY_POLICY_VERSION
        );

        if (consent) {
          console.log('✅ [PrivacyConsentGuard] 동의 이력 있음:', consent);
          setHasConsent(true);
          setShowModal(false);
        } else {
          console.log('⚠️ [PrivacyConsentGuard] 동의 이력 없음 - 모달 표시');
          setHasConsent(false);
          setShowModal(true);
        }
      } catch (error) {
        console.error('❌ [PrivacyConsentGuard] 동의 확인 실패:', error);
        // 에러 발생 시 일단 모달 띄우기 (안전한 쪽으로)
        setHasConsent(false);
        setShowModal(true);
      } finally {
        setIsCheckingConsent(false);
      }
    };

    checkConsent();
  }, [user?.uid, loading]);

  // 동의 처리
  const handleAgree = async (consentData) => {
    if (!user) {
      console.error('❌ [PrivacyConsentGuard] user 없음');
      throw new Error('로그인 정보가 없습니다.');
    }

    console.log('📝 [PrivacyConsentGuard] 동의 처리 시작:', consentData);

    try {
      // Firestore에 동의 기록 저장
      await firestoreService.savePrivacyConsent({
        teacherId: user.uid,
        teacherEmail: user.email,
        consentType: 'teacher',
        version: consentData.version,
        termsAgreed: consentData.termsAgreed,
        dataCollectionAgreed: consentData.dataCollectionAgreed,
        marketingAgreed: consentData.marketingAgreed,
      });

      console.log('✅ [PrivacyConsentGuard] 동의 저장 완료');

      // 동의 완료 - 모달 닫기
      setHasConsent(true);
      setShowModal(false);
    } catch (error) {
      console.error('❌ [PrivacyConsentGuard] 동의 저장 실패:', error);
      throw error; // 모달에서 에러 처리하도록 전파
    }
  };

  // 로딩 중
  if (isCheckingConsent) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-700 font-semibold">동의 이력 확인 중...</p>
        </div>
      </div>
    );
  }

  // 동의하지 않았으면 강제 모달 표시 (닫기 불가)
  if (!hasConsent && user && !loading) {
    return (
      <>
        {/* 배경 블러 처리 */}
        <div className="min-h-screen bg-gray-200 blur-sm pointer-events-none">
          {children}
        </div>

        {/* 강제 모달 (닫기 불가) */}
        <PrivacyPolicyModal
          isOpen={showModal}
          onClose={null} // 닫기 불가
          onAgree={handleAgree}
          canClose={false} // 강제 동의
        />
      </>
    );
  }

  // 동의했거나 로그인하지 않았으면 정상 렌더링
  return <>{children}</>;
}
