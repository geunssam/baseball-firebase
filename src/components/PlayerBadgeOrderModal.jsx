import { useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { groupBadgesByCategory, getNextBadgeInCategory, BADGE_CATEGORIES } from '../utils/badgeCategories';
import { getBadgeProgress } from '../utils/badgeProgress';

// 상위 배지 슬롯 컴포넌트 (드롭 영역)
const TopBadgeSlot = ({ badge, index, getTierName, onRemove }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: badge ? badge.id : `empty-slot-${index}`
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!badge) {
    // 빈 슬롯
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="flex-1 min-w-[140px] h-32 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 bg-gray-50"
      >
        <span className="text-3xl mb-1">+</span>
        <span className="text-xs">배지 드래그</span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex-1 min-w-[140px] bg-gradient-to-br from-yellow-100 to-orange-100 rounded-lg p-3 border-2 border-yellow-300 relative group shadow-md"
    >
      {/* 드래그 핸들 */}
      <span
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 cursor-move text-gray-400 hover:text-gray-600 text-lg"
      >
        ⠿
      </span>

      {/* 제거 버튼 */}
      <button
        onClick={() => onRemove(badge.id)}
        className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold transition-all opacity-0 group-hover:opacity-100"
        title="상위 배지에서 제거"
      >
        ×
      </button>

      {/* 배지 내용 */}
      <div className="flex flex-col items-center justify-center mt-2">
        <span className="text-4xl mb-1">{badge.icon}</span>
        <div className="text-center">
          <div className="font-bold text-sm text-gray-800">{badge.name}</div>
          <div className="text-xs bg-yellow-200 text-yellow-800 rounded-full px-2 py-0.5 inline-block mt-1">
            {getTierName(badge.tier)}
          </div>
        </div>
      </div>
    </div>
  );
};

// 나머지 배지 아이템 컴포넌트
const RestBadgeItem = ({ badge, getTierName, nextBadge, nextProgress }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: badge.id
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="bg-white rounded-lg p-3 border-2 border-gray-200 hover:border-gray-400 transition-all cursor-move"
    >
      <div className="flex items-center gap-3">
        {/* 드래그 핸들 */}
        <span
          {...attributes}
          {...listeners}
          className="cursor-move text-gray-400 hover:text-gray-600 text-xl"
        >
          ⠿
        </span>

        {/* 배지 아이콘 */}
        <span className="text-3xl">{badge.icon}</span>

        {/* 배지 정보 */}
        <div className="flex-1">
          <div className="font-bold text-gray-800">{badge.name}</div>
          <div className="text-xs text-gray-600 mt-1">{badge.description}</div>
          <div className="text-xs mt-2 bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 inline-block">
            {getTierName(badge.tier)}
          </div>

          {/* 다음 단계 진행도 */}
          {nextBadge && nextProgress && (
            <div className="mt-2 pt-2 border-t border-gray-200">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500">→</span>
                <span className="text-lg">{nextBadge.icon}</span>
                <div className="flex-1">
                  <div className="font-semibold text-gray-700">{nextBadge.name}</div>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-400 to-purple-400 h-full transition-all duration-300"
                        style={{ width: `${nextProgress.progress}%` }}
                      />
                    </div>
                    <span className="text-gray-600 text-xs whitespace-nowrap">
                      {nextProgress.current}/{nextProgress.target}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PlayerBadgeOrderModal = ({ player, allBadges, onClose, onSave, playerStats }) => {
  // 디버깅 로그
  console.log('🏅 PlayerBadgeOrderModal 열림:', {
    playerName: player.name,
    playerId: player.id || player.playerId,
    badges: player.badges,
    badgeCount: player.badges?.length || 0
  });

  // firebase 프로젝트에서는 player.badges만 사용 (Context 없음)
  const allBadgeIds = player.badges || [];

  // ✨ BADGES 객체는 UPPERCASE 키를 사용하지만, 각 배지 객체의 id는 lowercase
  // 따라서 lowercase id로 찾을 수 있도록 lookup 맵 생성
  const badgeLookup = Object.values(allBadges).reduce((acc, badge) => {
    acc[badge.id] = badge;
    return acc;
  }, {});

  // 선수의 배지 ID 배열을 배지 객체 배열로 변환
  const initialBadges = allBadgeIds
    .map(badgeId => badgeLookup[badgeId])
    .filter(badge => badge);

  console.log('✅ 최종 변환된 배지 객체들:', initialBadges);

  // ✨ 상위 3개와 나머지로 분리
  const [topBadges, setTopBadges] = useState(initialBadges.slice(0, 3));
  const [restBadges, setRestBadges] = useState(initialBadges.slice(3));

  // 나머지 배지를 카테고리별로 그룹화
  const groupedRestBadges = groupBadgesByCategory(restBadges.map(b => b.id), badgeLookup);

  // 빈 카테고리 추가
  Object.values(BADGE_CATEGORIES).forEach(category => {
    if (!groupedRestBadges[category.id]) {
      groupedRestBadges[category.id] = {
        ...category,
        badges: []
      };
    }
  });

  // ✨ 티어별 배지 통계 계산
  const calculateTierStats = () => {
    const tiers = {
      1: { name: '🥉 입문', owned: 0, total: 0 },
      2: { name: '🥈 숙련', owned: 0, total: 0 },
      3: { name: '🥇 마스터', owned: 0, total: 0 },
      4: { name: '👑 레전드', owned: 0, total: 0 },
      5: { name: '⭐ 특별', owned: 0, total: 0 }
    };

    Object.values(badgeLookup).forEach(badge => {
      const tier = badge.tier;
      if (tiers[tier]) {
        tiers[tier].total++;
        if (allBadgeIds.includes(badge.id)) {
          tiers[tier].owned++;
        }
      }
    });

    return tiers;
  };

  const tierStats = calculateTierStats();

  // ✨ 진행도 탭 (영역별 vs 티어별)
  const [progressTab, setProgressTab] = useState('category'); // 'category' or 'tier'

  // ✨ 티어별 배지 분류 (획득/미획득)
  const getTierBadges = (tier) => {
    const owned = [];
    const notOwned = [];

    Object.values(badgeLookup).forEach(badge => {
      if (badge.tier === tier) {
        if (allBadgeIds.includes(badge.id)) {
          owned.push(badge);
        } else {
          // 미획득 배지의 진행도 계산
          const progress = playerStats ? getBadgeProgress(badge, playerStats) : null;
          notOwned.push({ badge, progress });
        }
      }
    });

    return { owned, notOwned };
  };

  // ✨ 카테고리별 배지 분류 (획득/미획득)
  const getCategoryBadges = (categoryId) => {
    const category = BADGE_CATEGORIES[categoryId.toUpperCase()];
    if (!category) return { owned: [], notOwned: [], total: 0 };

    const owned = [];
    const notOwned = [];

    category.badgeIds.forEach(badgeId => {
      const badge = badgeLookup[badgeId];
      if (!badge) return;

      if (allBadgeIds.includes(badgeId)) {
        owned.push(badge);
      } else {
        const progress = playerStats ? getBadgeProgress(badge, playerStats) : null;
        notOwned.push({ badge, progress });
      }
    });

    return { owned, notOwned, total: category.badgeIds.length };
  };

  // ✨ 카테고리별 통계 계산
  const calculateCategoryStats = () => {
    const stats = {};
    Object.keys(BADGE_CATEGORIES).forEach(key => {
      const categoryId = key.toLowerCase();
      const { owned, total } = getCategoryBadges(categoryId);
      const category = BADGE_CATEGORIES[key];
      stats[categoryId] = {
        name: `${category.icon} ${category.name}`,
        owned: owned.length,
        total
      };
    });
    return stats;
  };

  const categoryStats = calculateCategoryStats();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const [activeId, setActiveId] = useState(null);

  // 배지 등급 이름 가져오기
  const getTierName = (tier) => {
    switch(tier) {
      case 5: return '특별';
      case 4: return '레전드';
      case 3: return '마스터';
      case 2: return '숙련';
      case 1: return '입문';
      default: return '';
    }
  };

  // 드래그 시작
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  // 드래그 종료 핸들러
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const activeBadge = topBadges.find(b => b && b.id === active.id) ||
                        restBadges.find(b => b.id === active.id);

    if (!activeBadge) return;

    const isActiveInTop = topBadges.some(b => b && b.id === active.id);
    const isOverInTop = topBadges.some(b => b && b.id === over.id) ||
                         over.id.startsWith('empty-slot-');

    // Case 1: 상위 영역 내에서 순서 변경
    if (isActiveInTop && isOverInTop) {
      const oldIndex = topBadges.findIndex(b => b && b.id === active.id);
      const newIndex = over.id.startsWith('empty-slot-')
        ? parseInt(over.id.split('-')[2])
        : topBadges.findIndex(b => b && b.id === over.id);

      if (oldIndex !== newIndex) {
        setTopBadges(arrayMove(topBadges.filter(Boolean), oldIndex, newIndex));
      }
    }
    // Case 2: 나머지 → 상위 영역
    else if (!isActiveInTop && isOverInTop) {
      if (topBadges.filter(Boolean).length < 3) {
        setRestBadges(restBadges.filter(b => b.id !== active.id));
        setTopBadges([...topBadges.filter(Boolean), activeBadge]);
      }
    }
    // Case 3: 상위 영역 → 나머지
    else if (isActiveInTop && !isOverInTop) {
      setTopBadges(topBadges.filter(b => b && b.id !== active.id));
      setRestBadges([...restBadges, activeBadge]);
    }
    // Case 4: 나머지 영역 내에서 순서 변경
    else if (!isActiveInTop && !isOverInTop) {
      const oldIndex = restBadges.findIndex(b => b.id === active.id);
      const newIndex = restBadges.findIndex(b => b.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        setRestBadges(arrayMove(restBadges, oldIndex, newIndex));
      }
    }
  };

  // 상위 배지에서 제거
  const handleRemoveFromTop = (badgeId) => {
    const badge = topBadges.find(b => b && b.id === badgeId);
    if (badge) {
      setTopBadges(topBadges.filter(b => b && b.id !== badgeId));
      setRestBadges([...restBadges, badge]);
    }
  };

  // 저장 버튼 클릭
  const handleSave = () => {
    // 상위 배지 + 나머지 배지를 합쳐서 ID 배열로 변환
    const allBadges = [
      ...topBadges.filter(Boolean).map(badge => badge.id),
      ...restBadges.map(badge => badge.id)
    ];
    onSave(allBadges);
    onClose();
  };

  // 전체 sortable items (상위 + 나머지)
  const topBadgeIds = topBadges.filter(Boolean).map(b => b.id);
  const emptySlotIds = Array.from({ length: 3 - topBadges.filter(Boolean).length }, (_, i) => `empty-slot-${topBadges.filter(Boolean).length + i}`);
  const restBadgeIds = restBadges.map(b => b.id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden m-4">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            🏅 {player.name}의 배지 관리
          </h2>
          <p className="text-white/90 text-sm mt-2">
            배지를 드래그하여 라인업에 표시될 순서를 정하세요
          </p>
        </div>

        {/* 배지 목록 */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-200px)]">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            {/* 상위 배지 영역 */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl p-4 border-2 border-yellow-300 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">📌</span>
                <h3 className="text-lg font-bold text-gray-800">라인업에 표시될 배지 (최대 3개)</h3>
              </div>

              <SortableContext items={[...topBadgeIds, ...emptySlotIds]} strategy={horizontalListSortingStrategy}>
                <div className="flex gap-3">
                  {topBadges.filter(Boolean).map((badge, index) => (
                    <TopBadgeSlot
                      key={badge.id}
                      badge={badge}
                      index={index}
                      getTierName={getTierName}
                      onRemove={handleRemoveFromTop}
                    />
                  ))}
                  {emptySlotIds.map((id, index) => (
                    <TopBadgeSlot
                      key={id}
                      badge={null}
                      index={topBadges.filter(Boolean).length + index}
                      getTierName={getTierName}
                      onRemove={handleRemoveFromTop}
                    />
                  ))}
                </div>
              </SortableContext>

              <p className="text-xs text-gray-600 mt-3 flex items-center gap-1">
                <span>💡</span>
                <span>드래그하여 순서 변경 | 아래 영역에서 드래그하여 추가</span>
              </p>
            </div>

            <div className="h-px bg-gray-300 my-6"></div>

            {/* 나머지 배지 영역 */}
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">📊</span>
                <h3 className="text-lg font-bold text-gray-800">나머지 배지</h3>
                <span className="text-sm text-gray-500">(드래그하여 위 영역으로 이동)</span>
              </div>

              {restBadges.length === 0 && Object.values(groupedRestBadges).every(cat => cat.badges.length === 0) ? (
                <div className="text-center py-8 text-gray-400">
                  <div className="text-5xl mb-3">✨</div>
                  <p>모든 배지가 상위 영역에 있습니다</p>
                </div>
              ) : (
                <SortableContext items={restBadgeIds} strategy={verticalListSortingStrategy}>
                  {Object.values(groupedRestBadges).map((category) => (
                    <div key={category.id} className="space-y-2">
                      {/* 카테고리 헤더 */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-xl">{category.icon}</span>
                        <h4 className="text-base font-bold text-gray-700">{category.name}</h4>
                        <div className="flex-1 h-px bg-gray-200"></div>
                      </div>

                      {/* 카테고리 내 배지들 */}
                      <div className="space-y-2">
                        {category.badges.length === 0 ? (
                          // 빈 카테고리: "획득한 배지가 없습니다" + 첫 배지 진행도
                          <div className="bg-gray-50 rounded-lg p-4 border-2 border-dashed border-gray-200">
                            <div className="flex items-center gap-2 text-gray-400 mb-2">
                              <span className="text-xl">😅</span>
                              <span className="text-sm">획득한 배지가 없습니다</span>
                            </div>

                            {/* 첫 배지 진행도 표시 */}
                            {(() => {
                              const firstBadgeId = category.badgeIds && category.badgeIds[0];
                              const firstBadge = firstBadgeId ? badgeLookup[firstBadgeId] : null;

                              if (firstBadge && playerStats) {
                                const progress = getBadgeProgress(firstBadge, playerStats);

                                if (!progress) return null;

                                return (
                                  <div className="pt-2 border-t border-gray-200">
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-gray-500">다음 목표:</span>
                                      <span className="text-lg">{firstBadge.icon}</span>
                                      <div className="flex-1">
                                        <div className="font-semibold text-gray-700">{firstBadge.name}</div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <div className="flex-1 bg-gray-200 rounded-full h-1.5 overflow-hidden">
                                            <div
                                              className="bg-gradient-to-r from-blue-400 to-purple-400 h-full transition-all duration-300"
                                              style={{ width: `${progress.progress}%` }}
                                            />
                                          </div>
                                          <span className="text-gray-600 text-xs whitespace-nowrap">
                                            {progress.current}/{progress.target}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}
                          </div>
                        ) : (
                          category.badges.map((badge) => {
                            const nextBadge = getNextBadgeInCategory(badge, badgeLookup, player.badges || []);
                            const nextProgress = nextBadge && playerStats ? getBadgeProgress(nextBadge, playerStats) : null;

                            return (
                              <RestBadgeItem
                                key={badge.id}
                                badge={badge}
                                getTierName={getTierName}
                                nextBadge={nextBadge}
                                nextProgress={nextProgress}
                              />
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}
                </SortableContext>
              )}
            </div>
          </DndContext>

          {/* ✨ 배지 진행도 - 탭으로 분리 */}
          <div className="mt-6">
            {/* 탭 버튼 */}
            <div className="flex gap-2 mb-4 border-b border-gray-200">
              <button
                onClick={() => setProgressTab('category')}
                className={`px-4 py-2 font-semibold transition-all ${
                  progressTab === 'category'
                    ? 'text-green-600 border-b-2 border-green-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🎯 영역별 진행도
              </button>
              <button
                onClick={() => setProgressTab('tier')}
                className={`px-4 py-2 font-semibold transition-all ${
                  progressTab === 'tier'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🎖️ 티어별 진행도
              </button>
            </div>

            {/* 영역별 배지 카드 */}
            {progressTab === 'category' && (
              <div className="space-y-6">
                {Object.entries(BADGE_CATEGORIES).map(([key, category]) => {
                  const categoryId = key.toLowerCase();

                  // 카테고리 내 배지들을 티어 순서로 정렬
                  const categoryBadges = category.badgeIds
                    .map(badgeId => badgeLookup[badgeId])
                    .filter(badge => badge)
                    .sort((a, b) => a.tier - b.tier);

                  return (
                    <div key={categoryId} className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4 border border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{category.icon}</span>
                        <h3 className="text-lg font-bold text-gray-800">{category.name}</h3>
                        <span className="text-sm text-gray-600">
                          ({categoryStats[categoryId]?.owned || 0}/{categoryBadges.length})
                        </span>
                      </div>

                      {/* 배지 카드 그리드 */}
                      <div className="grid grid-cols-4 gap-3">
                        {categoryBadges.map(badge => {
                          const isOwned = allBadgeIds.includes(badge.id);
                          const progress = !isOwned && playerStats ? getBadgeProgress(badge, playerStats) : null;

                          return (
                            <div
                              key={badge.id}
                              className={`rounded-lg p-3 border-2 transition-all ${
                                isOwned
                                  ? 'bg-gradient-to-br from-green-100 to-teal-100 border-green-400 shadow-md'
                                  : 'bg-gray-50 border-gray-300'
                              }`}
                            >
                              <div className="flex flex-col items-center text-center">
                                <span className={`text-3xl mb-1 ${!isOwned && 'opacity-40'}`}>
                                  {badge.icon}
                                </span>
                                <div className="text-sm font-semibold text-gray-800 mb-1">
                                  {badge.name}
                                </div>
                                <div className="text-xs bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 mb-2">
                                  {tierStats[badge.tier]?.name}
                                </div>

                                {/* 획득 상태 */}
                                {isOwned ? (
                                  <div className="text-xs font-bold text-green-700 bg-green-200 rounded-full px-2 py-1">
                                    ✅ 획득
                                  </div>
                                ) : (
                                  <>
                                    {progress ? (
                                      <div className="w-full">
                                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                                          <span>{progress.current}/{progress.target}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                          <div
                                            className="bg-gradient-to-r from-yellow-400 to-orange-400 h-full transition-all"
                                            style={{ width: `${progress.progress}%` }}
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-500">
                                        미획득
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* 티어별 배지 카드 */}
            {progressTab === 'tier' && (
              <div className="space-y-6">
                {Object.entries(tierStats).map(([tier, stats]) => {
                  const tierNum = parseInt(tier);

                  // 티어 내 배지들을 카테고리 순서로 정렬
                  const tierBadges = Object.values(badgeLookup)
                    .filter(badge => badge.tier === tierNum)
                    .sort((a, b) => {
                      // 카테고리 순서: games, hits, runs, defense, cookies, special
                      const categoryOrder = ['games', 'hits', 'runs', 'defense', 'cookies', 'special'];
                      const getCategoryIndex = (badge) => {
                        for (let i = 0; i < categoryOrder.length; i++) {
                          const catKey = categoryOrder[i].toUpperCase();
                          if (BADGE_CATEGORIES[catKey]?.badgeIds.includes(badge.id)) {
                            return i;
                          }
                        }
                        return 999;
                      };
                      return getCategoryIndex(a) - getCategoryIndex(b);
                    });

                  return (
                    <div key={tier} className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">{stats.name.split(' ')[0]}</span>
                        <h3 className="text-lg font-bold text-gray-800">{stats.name}</h3>
                        <span className="text-sm text-gray-600">
                          ({stats.owned}/{stats.total})
                        </span>
                      </div>

                      {/* 배지 카드 그리드 */}
                      <div className="grid grid-cols-4 gap-3">
                        {tierBadges.map(badge => {
                          const isOwned = allBadgeIds.includes(badge.id);
                          const progress = !isOwned && playerStats ? getBadgeProgress(badge, playerStats) : null;

                          // 배지의 카테고리 찾기
                          let categoryName = '';
                          for (const [key, category] of Object.entries(BADGE_CATEGORIES)) {
                            if (category.badgeIds.includes(badge.id)) {
                              categoryName = `${category.icon} ${category.name}`;
                              break;
                            }
                          }

                          return (
                            <div
                              key={badge.id}
                              className={`rounded-lg p-3 border-2 transition-all ${
                                isOwned
                                  ? 'bg-gradient-to-br from-purple-100 to-blue-100 border-purple-400 shadow-md'
                                  : 'bg-gray-50 border-gray-300'
                              }`}
                            >
                              <div className="flex flex-col items-center text-center">
                                <span className={`text-3xl mb-1 ${!isOwned && 'opacity-40'}`}>
                                  {badge.icon}
                                </span>
                                <div className="text-sm font-semibold text-gray-800 mb-1">
                                  {badge.name}
                                </div>
                                <div className="text-xs bg-gray-200 text-gray-700 rounded-full px-2 py-0.5 mb-2">
                                  {categoryName}
                                </div>

                                {/* 획득 상태 */}
                                {isOwned ? (
                                  <div className="text-xs font-bold text-purple-700 bg-purple-200 rounded-full px-2 py-1">
                                    ✅ 획득
                                  </div>
                                ) : (
                                  <>
                                    {progress ? (
                                      <div className="w-full">
                                        <div className="flex items-center gap-1 text-xs text-gray-600 mb-1">
                                          <span>{progress.current}/{progress.target}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                          <div
                                            className="bg-gradient-to-r from-yellow-400 to-orange-400 h-full transition-all"
                                            style={{ width: `${progress.progress}%` }}
                                          />
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="text-xs text-gray-500">
                                        미획득
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* 푸터 버튼 */}
        <div className="border-t border-gray-200 p-4 flex gap-3 justify-end bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white font-semibold transition-all shadow-md hover:shadow-lg"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerBadgeOrderModal;
