import { useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, horizontalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { BADGE_CATEGORIES } from '../utils/badgeCategories';
import { getBadgeProgress } from '../utils/badgeProgress';

// 상위 배지 미니 카드 컴포넌트 (가로형)
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
        className="flex items-center justify-center h-10 border-2 border-dashed border-gray-300 rounded-lg text-gray-400 bg-gray-50"
      >
        <span className="text-sm">+ 배지 추가</span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-2 bg-gradient-to-r from-yellow-100 to-orange-100 border-2 border-yellow-300 rounded-lg group"
    >
      {/* 드래그 핸들 */}
      <span
        {...attributes}
        {...listeners}
        className="cursor-move text-gray-400 hover:text-gray-600"
      >
        ⠿
      </span>

      {/* 배지 아이콘 */}
      <span className="text-xl">{badge.icon}</span>

      {/* 배지 이름 */}
      <span className="font-bold text-sm flex-1 truncate">{badge.name}</span>

      {/* 티어 */}
      <span className="text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded-full whitespace-nowrap">
        {getTierName(badge.tier)}
      </span>

      {/* 제거 버튼 */}
      <button
        onClick={() => onRemove(badge.id)}
        className="text-red-500 hover:text-red-700 font-bold text-lg transition-all opacity-70 group-hover:opacity-100"
        title="상위 배지에서 제거"
      >
        ×
      </button>
    </div>
  );
};

// 나머지 배지 미니 카드 컴포넌트 (초소형)
const RestBadgeItem = ({ badge, getTierName }) => {
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
      className="flex items-center gap-1 p-2 bg-white border border-gray-200 rounded-lg hover:border-gray-400 cursor-move transition-all"
      title={badge.description}
    >
      {/* 드래그 핸들 */}
      <span
        {...attributes}
        {...listeners}
        className="cursor-move text-gray-400 text-xs"
      >
        ⠿
      </span>

      {/* 배지 아이콘 */}
      <span className="text-lg">{badge.icon}</span>

      {/* 배지 정보 */}
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold truncate">{badge.name}</div>
        <div className="text-[10px] text-gray-500">{getTierName(badge.tier)}</div>
      </div>
    </div>
  );
};

const PlayerBadgeOrderModal = ({ open, onOpenChange, player, allBadges, onClose, onSave, playerStats }) => {
  // open이 false면 렌더링하지 않음
  if (!open) return null;

  // onOpenChange가 있으면 사용, 없으면 onClose 사용 (하위 호환성)
  const handleClose = onOpenChange || onClose;

  // 디버깅 로그
  console.log('🏅 PlayerBadgeOrderModal 열림:', {
    playerName: player.name,
    playerId: player.id || player.playerId,
    badges: player.badges,
    badgeCount: player.badges?.length || 0
  });

  // 저장 상태
  const [isSaving, setIsSaving] = useState(false);

  // firebase 프로젝트에서는 player.badges만 사용 (Context 없음)
  const allBadgeIds = player.badges || [];

  // BADGES 객체의 lowercase id로 찾을 수 있도록 lookup 맵 생성
  const badgeLookup = Object.values(allBadges || {}).reduce((acc, badge) => {
    acc[badge.id] = badge;
    return acc;
  }, {});

  // 선수의 배지 ID 배열을 배지 객체 배열로 변환
  const initialBadges = allBadgeIds
    .map(badgeId => badgeLookup[badgeId])
    .filter(badge => badge);

  console.log('✅ 최종 변환된 배지 객체들:', initialBadges);

  // 상위 3개와 나머지로 분리
  const [topBadges, setTopBadges] = useState(initialBadges.slice(0, 3));
  const [restBadges, setRestBadges] = useState(initialBadges.slice(3));

  // 티어별 배지 통계 계산
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

  // 진행도 탭 (영역별 vs 티어별)
  const [viewMode, setViewMode] = useState('category'); // 'category' or 'tier'

  // 카테고리별 통계 계산
  const calculateCategoryStats = () => {
    const stats = {};
    Object.keys(BADGE_CATEGORIES).forEach(key => {
      const category = BADGE_CATEGORIES[key];
      const owned = category.badgeIds.filter(id => allBadgeIds.includes(id)).length;
      const total = category.badgeIds.length;
      stats[key.toLowerCase()] = {
        name: `${category.icon} ${category.name}`,
        owned,
        total,
        icon: category.icon
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

  // 섹션으로 스크롤
  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
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
  const handleSave = async () => {
    setIsSaving(true);
    console.log('💾 [배지순서] 저장 시작');

    try {
      // 상위 배지 + 나머지 배지를 합쳐서 ID 배열로 변환
      const allBadges = [
        ...topBadges.filter(Boolean).map(badge => badge.id),
        ...restBadges.map(badge => badge.id)
      ];

      console.log('💾 [배지순서] 변경된 배지 순서:', allBadges);

      // ✅ await 추가 - 저장 완료까지 대기
      await onSave(allBadges);

      console.log('✅ [배지순서] 저장 완료, 모달 닫기');
      handleClose(false);
    } catch (error) {
      console.error('❌ [배지순서] 저장 실패:', error);
      alert('배지 순서 저장에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  // 전체 sortable items (상위 + 나머지)
  const topBadgeIds = topBadges.filter(Boolean).map(b => b.id);
  const emptySlotIds = Array.from({ length: 3 - topBadges.filter(Boolean).length }, (_, i) => `empty-slot-${topBadges.filter(Boolean).length + i}`);
  const restBadgeIds = restBadges.map(b => b.id);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000]">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden m-4 flex flex-col">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 p-4">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            🏅 {player.name}의 배지 관리
          </h2>
          <p className="text-white/90 text-sm mt-1">
            배지를 드래그하여 라인업에 표시될 순서를 정하세요
          </p>
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          {/* 상단 Sticky 영역 - 5:5 레이아웃 */}
          <div className="sticky top-0 bg-white z-20 border-b-2 border-gray-300 p-4">
            <div className="grid grid-cols-2 gap-4">
              {/* 왼쪽: 라인업 표시 배지 (50%) */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📌</span>
                  <h3 className="font-bold text-gray-800">라인업 표시 (최대 3개)</h3>
                </div>

                <SortableContext items={[...topBadgeIds, ...emptySlotIds]} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
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
              </div>

              {/* 오른쪽: 나머지 배지 (50%) */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">📊</span>
                  <h3 className="font-bold text-gray-800">나머지 배지</h3>
                  <span className="text-xs text-gray-500">(드래그하여 위로 이동)</span>
                </div>

                {restBadges.length === 0 ? (
                  <div className="text-center py-8 text-gray-400">
                    <div className="text-3xl mb-2">✨</div>
                    <p className="text-sm">모든 배지가 라인업에 표시중입니다</p>
                  </div>
                ) : (
                  <SortableContext items={restBadgeIds} strategy={verticalListSortingStrategy}>
                    <div className="grid grid-cols-3 gap-2">
                      {restBadges.map((badge) => (
                        <RestBadgeItem
                          key={badge.id}
                          badge={badge}
                          getTierName={getTierName}
                        />
                      ))}
                    </div>
                  </SortableContext>
                )}
              </div>
            </div>
          </div>

          {/* 스크롤 가능 영역 */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* 탭 전환 */}
            <div className="flex gap-2 border-b border-gray-200 mb-4">
              <button
                onClick={() => setViewMode('category')}
                className={`px-4 py-2 font-semibold transition-all ${
                  viewMode === 'category'
                    ? 'text-green-600 border-b-2 border-green-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🎯 영역별
              </button>
              <button
                onClick={() => setViewMode('tier')}
                className={`px-4 py-2 font-semibold transition-all ${
                  viewMode === 'tier'
                    ? 'text-purple-600 border-b-2 border-purple-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                🎖️ 티어별
              </button>
            </div>

            {/* 태그형 버튼 - 영역별 선택 시 */}
            {viewMode === 'category' && (
              <div className="flex gap-2 mb-6 flex-wrap">
                {Object.entries(BADGE_CATEGORIES).map(([key, category]) => {
                  const stats = categoryStats[key.toLowerCase()];
                  return (
                    <button
                      key={key}
                      onClick={() => scrollTo(`category-${key.toLowerCase()}`)}
                      className="px-3 py-1.5 bg-green-100 hover:bg-green-200 rounded-full text-sm font-semibold text-green-800 transition-all flex items-center gap-1"
                    >
                      <span>{category.icon}</span>
                      <span>{category.name}</span>
                      <span className="text-xs">({stats?.owned}/{stats?.total})</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* 태그형 버튼 - 티어별 선택 시 */}
            {viewMode === 'tier' && (
              <div className="flex gap-2 mb-6 flex-wrap">
                {Object.entries(tierStats).map(([tier, stats]) => (
                  <button
                    key={tier}
                    onClick={() => scrollTo(`tier-${tier}`)}
                    className="px-3 py-1.5 bg-purple-100 hover:bg-purple-200 rounded-full text-sm font-semibold text-purple-800 transition-all flex items-center gap-1"
                  >
                    <span>{stats.name.split(' ')[0]}</span>
                    <span>{stats.name.split(' ')[1]}</span>
                    <span className="text-xs">({stats.owned}/{stats.total})</span>
                  </button>
                ))}
              </div>
            )}

            {/* 영역별 배지 현황 */}
            {viewMode === 'category' && (
              <div className="space-y-6">
                {Object.entries(BADGE_CATEGORIES).map(([key, category]) => {
                  const categoryId = key.toLowerCase();

                  // 카테고리 내 배지들을 티어 순서로 정렬
                  const categoryBadges = category.badgeIds
                    .map(badgeId => badgeLookup[badgeId])
                    .filter(badge => badge)
                    .sort((a, b) => a.tier - b.tier);

                  return (
                    <div key={categoryId} id={`category-${categoryId}`} className="bg-gradient-to-r from-green-50 to-teal-50 rounded-lg p-4 border border-green-200">
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

            {/* 티어별 배지 현황 */}
            {viewMode === 'tier' && (
              <div className="space-y-6">
                {Object.entries(tierStats).map(([tier, stats]) => {
                  const tierNum = parseInt(tier);

                  // 티어 내 배지들을 카테고리 순서로 정렬
                  const tierBadges = Object.values(badgeLookup)
                    .filter(badge => badge.tier === tierNum)
                    .sort((a, b) => {
                      // 카테고리 순서: games, hits, runs, defense, cookies, special
                      const categoryOrder = ['GAMES', 'HITS', 'RUNS', 'DEFENSE', 'COOKIES', 'SPECIAL'];
                      const getCategoryIndex = (badge) => {
                        for (let i = 0; i < categoryOrder.length; i++) {
                          const catKey = categoryOrder[i];
                          if (BADGE_CATEGORIES[catKey]?.badgeIds.includes(badge.id)) {
                            return i;
                          }
                        }
                        return 999;
                      };
                      return getCategoryIndex(a) - getCategoryIndex(b);
                    });

                  return (
                    <div key={tier} id={`tier-${tier}`} className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
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
        </DndContext>

        {/* 푸터 버튼 */}
        <div className="border-t border-gray-200 p-4 flex gap-3 justify-end bg-gray-50">
          <button
            onClick={() => handleClose(false)}
            className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold transition-colors"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 rounded-lg bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white font-semibold transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerBadgeOrderModal;
