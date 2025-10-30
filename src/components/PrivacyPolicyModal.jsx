import { useState } from 'react';
import {
  PRIVACY_POLICY_VERSION,
  LAST_UPDATED,
  SERVICE_OPERATOR,
  PRIVACY_POLICY_SECTIONS,
  PRIVACY_POLICY_SUMMARY,
  REQUIRED_CONSENTS,
  OPTIONAL_CONSENTS,
} from '../constants/privacyPolicy';

/**
 * 개인정보 처리방침 모달
 *
 * Props:
 * - isOpen: 모달 표시 여부
 * - onClose: 모달 닫기 핸들러 (canClose가 true일 때만 작동)
 * - onAgree: 동의 버튼 클릭 시 핸들러 (동의 데이터를 전달)
 * - canClose: 모달을 닫을 수 있는지 여부 (false면 강제 동의)
 */
export default function PrivacyPolicyModal({ isOpen, onClose, onAgree, canClose = true }) {
  const [expandedSections, setExpandedSections] = useState({});
  const [consents, setConsents] = useState({
    terms: false,
    privacy: false,
    marketing: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 모든 필수 항목에 동의했는지 확인
  const allRequiredAgreed = REQUIRED_CONSENTS.every((item) => consents[item.id]);

  // 섹션 펼치기/접기
  const toggleSection = (sectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  // 전체 펼치기
  const expandAll = () => {
    const allExpanded = {};
    PRIVACY_POLICY_SECTIONS.forEach((section) => {
      allExpanded[section.id] = true;
    });
    setExpandedSections(allExpanded);
  };

  // 전체 접기
  const collapseAll = () => {
    setExpandedSections({});
  };

  // 전체 동의
  const agreeAll = () => {
    const allConsents = {};
    [...REQUIRED_CONSENTS, ...OPTIONAL_CONSENTS].forEach((item) => {
      allConsents[item.id] = true;
    });
    setConsents(allConsents);
  };

  // 개별 동의 체크
  const handleConsentChange = (id) => {
    setConsents((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // 동의 버튼 클릭
  const handleAgree = async () => {
    if (!allRequiredAgreed) {
      alert('필수 항목에 모두 동의해주세요.');
      return;
    }

    setIsSubmitting(true);

    try {
      // 부모 컴포넌트로 동의 정보 전달
      await onAgree({
        version: PRIVACY_POLICY_VERSION,
        termsAgreed: consents.terms,
        dataCollectionAgreed: consents.privacy,
        marketingAgreed: consents.marketing || false,
      });

      // 성공 시 모달 닫기 (canClose가 true인 경우)
      if (canClose && onClose) {
        onClose();
      }
    } catch (error) {
      console.error('동의 처리 실패:', error);
      alert('동의 처리 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 flex flex-col max-h-[90vh]">
        {/* 헤더 */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">개인정보 처리방침</h2>
              <p className="text-sm text-gray-500 mt-1">
                버전 {PRIVACY_POLICY_VERSION} | 최종 업데이트: {LAST_UPDATED}
              </p>
            </div>
            {canClose && onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 text-2xl"
                aria-label="닫기"
              >
                ✕
              </button>
            )}
          </div>

          {/* 필수 동의 안내 */}
          {!canClose && (
            <div className="mt-4 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
              <p className="text-sm text-yellow-800 font-semibold">
                ⚠️ 서비스 이용을 위해서는 개인정보 처리방침에 동의해야 합니다.
              </p>
            </div>
          )}

          {/* 요약 */}
          <div className="mt-4 bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 whitespace-pre-line leading-relaxed">
              {PRIVACY_POLICY_SUMMARY}
            </p>
          </div>
        </div>

        {/* 본문 (스크롤 가능) */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* 컨트롤 버튼 */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={expandAll}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              전체 펼치기
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              전체 접기
            </button>
          </div>

          {/* 섹션별 내용 */}
          <div className="space-y-3">
            {PRIVACY_POLICY_SECTIONS.map((section) => (
              <div
                key={section.id}
                className="border border-gray-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleSection(section.id)}
                  className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 flex items-center justify-between text-left transition-colors"
                >
                  <span className="font-semibold text-gray-800">{section.title}</span>
                  <span className="text-gray-500 text-xl">
                    {expandedSections[section.id] ? '−' : '+'}
                  </span>
                </button>

                {expandedSections[section.id] && (
                  <div className="p-4 bg-white">
                    <p className="text-sm text-gray-700 whitespace-pre-line leading-relaxed">
                      {section.content}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 운영자 정보 */}
          <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <h3 className="font-semibold text-gray-800 mb-2">서비스 운영자</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p>• 서비스명: {SERVICE_OPERATOR.serviceName}</p>
              <p>• 담당자: {SERVICE_OPERATOR.name}</p>
              <p>• 이메일: {SERVICE_OPERATOR.email}</p>
              {SERVICE_OPERATOR.school && <p>• 소속: {SERVICE_OPERATOR.school}</p>}
            </div>
          </div>
        </div>

        {/* 푸터 (동의 체크박스) */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          {/* 전체 동의 버튼 */}
          <button
            onClick={agreeAll}
            className="w-full mb-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition-colors"
          >
            전체 동의
          </button>

          {/* 필수 동의 항목 */}
          <div className="space-y-3 mb-4">
            {REQUIRED_CONSENTS.map((item) => (
              <label
                key={item.id}
                className="flex items-start gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  checked={consents[item.id]}
                  onChange={() => handleConsentChange(item.id)}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">
                  <span className="text-red-500 font-bold">[필수]</span> {item.label}
                </span>
              </label>
            ))}
          </div>

          {/* 선택 동의 항목 */}
          {OPTIONAL_CONSENTS.length > 0 && (
            <div className="space-y-3 mb-4">
              {OPTIONAL_CONSENTS.map((item) => (
                <label
                  key={item.id}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={consents[item.id]}
                    onChange={() => handleConsentChange(item.id)}
                    className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">
                    <span className="text-gray-500">[선택]</span> {item.label}
                  </span>
                </label>
              ))}
            </div>
          )}

          {/* 동의 버튼 */}
          <button
            onClick={handleAgree}
            disabled={!allRequiredAgreed || isSubmitting}
            className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
              allRequiredAgreed && !isSubmitting
                ? 'bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                처리 중...
              </span>
            ) : (
              '동의하고 계속하기'
            )}
          </button>

          {!allRequiredAgreed && (
            <p className="text-xs text-red-500 text-center mt-2">
              ⚠️ 필수 항목에 모두 동의해야 서비스를 이용할 수 있습니다.
            </p>
          )}

          {canClose && onClose && (
            <button
              onClick={onClose}
              className="w-full mt-3 py-2 text-gray-600 hover:text-gray-800 text-sm"
            >
              나중에 하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
