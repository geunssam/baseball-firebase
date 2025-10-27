import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from './ui/dialog';
import { Button } from './ui/button';
import { BADGE_TIERS } from '../utils/badgeSystem';

/**
 * BadgePopup 컴포넌트
 * 선수가 새 배지를 획득했을 때 축하 메시지를 표시하는 팝업
 */
const BadgePopup = ({ isOpen, onClose, badges = [] }) => {
  if (!badges || badges.length === 0) return null;

  // 학생별로 배지 그룹화
  const studentBadges = badges.reduce((acc, badge) => {
    const playerName = badge.playerName || '알 수 없음';
    if (!acc[playerName]) {
      acc[playerName] = [];
    }
    acc[playerName].push(badge);
    return acc;
  }, {});

  const studentNames = Object.keys(studentBadges);
  const badgeCount = badges.length;

  // 배지 등급명
  const getTierName = (tier) => {
    switch (tier) {
      case BADGE_TIERS.BEGINNER:
        return '🥉 입문';
      case BADGE_TIERS.SKILLED:
        return '🥈 숙련';
      case BADGE_TIERS.MASTER:
        return '🥇 마스터';
      case BADGE_TIERS.LEGEND:
        return '👑 레전드';
      case BADGE_TIERS.SPECIAL:
        return '⭐ 특별';
      default:
        return '배지';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col p-0">
        {/* 헤더 - 그라데이션 배경 */}
        <div className="bg-gradient-to-r from-yellow-400 via-orange-400 to-red-500 p-6">
          <div className="text-center text-white">
            {/* 애니메이션 아이콘 */}
            <div className="text-8xl mb-4 animate-pulse">🎉</div>

            {/* 제목 */}
            <div className="text-4xl font-black mb-3 drop-shadow-lg">
              축하합니다!
            </div>

            {/* 여러 학생 표시 */}
            {studentNames.length === 1 ? (
              <div className="text-2xl font-bold bg-white/20 rounded-lg py-2 px-4 inline-block">
                {studentNames[0]} 선수
              </div>
            ) : (
              <div className="text-xl font-bold bg-white/20 rounded-lg py-2 px-4 inline-block">
                {studentNames.length}명의 선수가 배지를 획득했습니다!
              </div>
            )}
          </div>
        </div>

        {/* 학생별 배지 목록 (스크롤 가능) */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
            {studentNames.map((playerName, playerIdx) => (
              <div key={playerIdx} className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-gray-200">
                {/* 학생 이름 (여러 명일 때만 표시) */}
                {studentNames.length > 1 && (
                  <div className="text-xl font-bold mb-3 flex items-center gap-2">
                    <span className="bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm">
                      {playerIdx + 1}
                    </span>
                    {playerName}
                  </div>
                )}

                {/* 배지 개수 표시 */}
                {studentBadges[playerName].length > 1 && (
                  <div className="text-sm font-bold mb-3 bg-gradient-to-r from-yellow-400 to-orange-400 text-white rounded-lg py-1 px-3 inline-block">
                    총 {studentBadges[playerName].length}개 획득!
                  </div>
                )}

                {/* 배지 리스트 */}
                <div className="space-y-3">
                  {studentBadges[playerName].map((badge, badgeIdx) => (
                    <div
                      key={badgeIdx}
                      className="bg-white rounded-xl p-3 shadow-md border-2 border-gray-100 transform hover:scale-105 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-5xl">{badge.icon}</div>
                        <div className="flex-1 text-left">
                          <div className="text-xl font-bold text-gray-800">{badge.name}</div>
                          <div className="text-sm mt-1 text-gray-600">{badge.description}</div>
                          {/* 등급 표시 */}
                          <div className="text-xs mt-2 bg-gray-100 rounded-full px-2 py-0.5 inline-block text-gray-700 font-semibold">
                            {getTierName(badge.tier)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 푸터 */}
        <div className="p-6 border-t bg-gray-50">
          <div className="text-center">
            <Button
              onClick={onClose}
              className="bg-white text-orange-600 border-2 border-orange-400 px-8 py-3 rounded-full font-bold text-lg hover:bg-orange-50 transition shadow-lg"
            >
              확인
            </Button>

            {/* 자동 닫힘 안내 */}
            <div className="text-xs mt-3 text-gray-500">
              5초 후 자동으로 닫힙니다
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BadgePopup;
