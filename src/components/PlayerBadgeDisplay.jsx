import { useMemo } from 'react';
import { BADGES } from '../utils/badgeSystem';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

/**
 * PlayerBadgeDisplay
 *
 * 학생의 배지를 일관되게 표시하는 공통 컴포넌트
 * - 학급 명단, 팀 라인업, 경기 화면 등 앱 전체에서 사용
 * - 배지 아이콘만 표시하고, 호버 시 상세 툴팁 표시
 * - 최대 3개 배지 표시 (사용자가 설정한 순서대로)
 */
const PlayerBadgeDisplay = ({
  player,           // player 객체 (badges 배열 포함) 또는 badges 배열 직접 전달
  maxBadges = 3,    // 최대 표시 개수
  size = 'md',      // 'sm' | 'md' | 'lg'
  showEmpty = true, // 배지 없을 때 "배지 없음" 표시 여부
  showOverflow = true, // 3개 초과 시 "+N" 표시 여부
}) => {
  // 배지 ID 배열 추출
  const badgeIds = useMemo(() => {
    // player 객체에서 badges 추출, 또는 직접 배열로 전달된 경우
    if (Array.isArray(player)) {
      return player;
    }
    return player?.badges || player?.topBadges || [];
  }, [player]);

  // 표시할 배지 목록 (최대 maxBadges개)
  const displayBadges = useMemo(() => {
    return badgeIds.slice(0, maxBadges);
  }, [badgeIds, maxBadges]);

  // 크기별 스타일 클래스
  const sizeClasses = {
    sm: 'text-sm gap-0.5',
    md: 'text-base gap-1',
    lg: 'text-xl gap-1.5'
  };

  // 배지가 없을 때
  if (displayBadges.length === 0) {
    return showEmpty ? (
      <span className="text-xs text-gray-400 italic">배지 없음</span>
    ) : null;
  }

  const totalBadges = badgeIds.length;
  const overflowBadges = useMemo(() => {
    return badgeIds.slice(maxBadges).map(id => Object.values(BADGES).find(b => b.id === id)).filter(Boolean);
  }, [badgeIds, maxBadges]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className={`flex items-center ${sizeClasses[size]}`}>
        {displayBadges.map((badgeId, index) => {
          // GameScreen과 동일한 방식: id 속성으로 검색
          const badge = Object.values(BADGES).find(b => b.id === badgeId);

          if (!badge) {
            console.warn(`⚠️ 배지를 찾을 수 없음: badgeId="${badgeId}"`);
            return null;
          }

          return (
            <Tooltip key={`${badgeId}-${index}`}>
              <TooltipTrigger asChild>
                <span
                  className="cursor-pointer transition-transform hover:scale-125 inline-block"
                  role="img"
                  aria-label={badge.name}
                >
                  {badge.icon}
                </span>
              </TooltipTrigger>
              <TooltipContent className="bg-white border shadow-lg p-3 max-w-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{badge.icon}</span>
                    <div>
                      <p className="font-bold text-sm">{badge.name}</p>
                      <p className="text-xs text-gray-500">{getTierName(badge.tier)}</p>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{badge.description}</p>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* 3개 초과 시 +N 표시 */}
        {showOverflow && totalBadges > maxBadges && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs text-gray-500 font-semibold ml-0.5 cursor-pointer">
                +{totalBadges - maxBadges}
              </span>
            </TooltipTrigger>
            <TooltipContent className="bg-white border shadow-lg p-3 max-w-sm">
              <p className="font-bold text-sm mb-2">추가 배지 ({totalBadges - maxBadges}개)</p>
              <div className="space-y-2">
                {overflowBadges.map((badge, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-lg">{badge.icon}</span>
                    <div className="flex-1">
                      <p className="text-xs font-medium">{badge.name}</p>
                      <p className="text-[10px] text-gray-500">{getTierName(badge.tier)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};

/**
 * 티어 이름 헬퍼 함수
 */
const getTierName = (tier) => {
  const tierNames = {
    1: '🥉 입문',
    2: '🥈 숙련',
    3: '🥇 마스터',
    4: '👑 레전드',
    5: '⭐ 특별'
  };
  return tierNames[tier] || '배지';
};

export default PlayerBadgeDisplay;
