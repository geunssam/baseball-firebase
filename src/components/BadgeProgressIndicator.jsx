import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { BADGE_CATEGORIES } from '../utils/badgeCategories';

/**
 * 배지 진행도 표시 컴포넌트
 * 선수의 다음 배지 획득까지의 진행 상황을 보여줌
 * @param {Array} progressData - 전체 진행도 데이터 (카테고리별 바로 다음 배지만 포함)
 * @param {Boolean} showEmpty - 진행도가 없을 때도 메시지 표시 여부
 */
const BadgeProgressIndicator = ({ progressData, showEmpty = false }) => {
  const [showAll, setShowAll] = useState(false);

  // 진행도가 없을 때 처리
  if (!progressData || progressData.length === 0) {
    if (showEmpty) {
      return (
        <div className="flex items-center gap-2 text-xs text-gray-400 px-1 py-0.5">
          <span>😅</span>
          <span className="text-gray-500">획득한 배지가 없습니다</span>
        </div>
      );
    }
    return null;
  }

  // 가장 진행도가 높은 배지 1개만 표시
  const topProgress = progressData[0];

  // 모든 카테고리별 진행도 생성 (없는 카테고리는 0%로 표시)
  const allCategoryProgress = Object.values(BADGE_CATEGORIES)
    .filter(cat => cat.id !== 'special') // 특별 카테고리 제외
    .map(category => {
      // 해당 카테고리의 진행도 찾기
      const found = progressData.find(p => p.category === category.id);

      if (found) {
        return found;
      }

      // 진행도가 없으면 카테고리 정보만 표시
      return {
        badge: {
          icon: category.icon,
          name: category.name,
          description: category.description
        },
        progress: 0,
        current: 0,
        target: 1,
        category: category.id
      };
    });

  return (
    <>
      <div
        className="flex items-center gap-1 text-xs cursor-pointer hover:bg-gray-50 rounded px-1 py-0.5 transition-colors"
        onClick={(e) => {
          e.stopPropagation();
          setShowAll(true);
        }}
        title="클릭하여 전체 진행도 보기"
      >
        {/* 배지 아이콘 */}
        <span className="text-sm opacity-50">{topProgress.badge.icon}</span>

        {/* 진행도 바 */}
        <div className="flex-1 min-w-[30px] max-w-[40px]">
          <div className="bg-gray-200 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-yellow-400 to-orange-400 h-full transition-all duration-300"
              style={{ width: `${topProgress.progress}%` }}
            />
          </div>
        </div>

        {/* 진행 상황 텍스트 */}
        <span className="text-gray-500 whitespace-nowrap text-[10px]">
          {topProgress.current}/{topProgress.target}
        </span>
      </div>

      {/* 전체 진행도 팝오버 */}
      {showAll && createPortal(
        <div
          className="fixed inset-0 bg-black/30 flex items-center justify-center z-[9999]"
          onClick={() => setShowAll(false)}
        >
          <div
            className="bg-white rounded-xl shadow-2xl p-4 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-800">다음 배지 진행도</h3>
              <button
                onClick={() => setShowAll(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            <div className="space-y-3">
              {allCategoryProgress.map((progress, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{progress.badge.icon}</span>
                    <div className="flex-1">
                      <div className="font-semibold text-sm text-gray-800">
                        {progress.badge.name}
                      </div>
                      <div className="text-xs text-gray-500">
                        {progress.badge.description}
                      </div>
                    </div>
                  </div>

                  {/* 진행도 바 */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-yellow-400 to-orange-400 h-full transition-all duration-300"
                        style={{ width: `${progress.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-600 font-medium whitespace-nowrap">
                      {progress.current}/{progress.target}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowAll(false)}
              className="w-full mt-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold text-gray-700 transition-colors"
            >
              닫기
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default BadgeProgressIndicator;
