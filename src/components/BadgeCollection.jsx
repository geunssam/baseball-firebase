import { useState, useEffect } from 'react';
import { useGame } from '../contexts/GameContext';
import { BADGES, BADGE_TIERS } from '../utils/badgeSystem';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ChevronLeft, Users, Trash2 } from 'lucide-react';
import firestoreService from '../services/firestoreService';

/**
 * BadgeCollection
 *
 * 배지 도감 - 모든 배지를 등급별로 보여주고 획득 현황 표시
 */
const BadgeCollection = ({ onBack, customBadges = [], hiddenBadges = [] }) => {
  const { students, playerBadges } = useGame();
  const [selectedTier, setSelectedTier] = useState('ALL');
  const [playerStats, setPlayerStats] = useState({});
  const [selectedBadge, setSelectedBadge] = useState(null);
  const [showStudentListModal, setShowStudentListModal] = useState(false);

  // 데이터 로드 확인 (간략하게)
  // console.log('🎯 [BadgeCollection] students:', students.length);
  // console.log('🏆 [BadgeCollection] playerBadges:', playerBadges.length);

  // 등급별 배지 분류
  const tierNames = {
    [BADGE_TIERS.BEGINNER]: '입문',
    [BADGE_TIERS.SKILLED]: '숙련',
    [BADGE_TIERS.MASTER]: '마스터',
    [BADGE_TIERS.LEGEND]: '레전드',
    [BADGE_TIERS.SPECIAL]: '특별'
  };

  // 전체 학생들의 배지 획득 현황 계산
  useEffect(() => {
    const stats = {};

    // playerBadges에서 배지 정보 가져오기
    playerBadges.forEach((playerBadge) => {
      const playerId = playerBadge.playerId || playerBadge.id;

      // 새 구조 (badgeDetails) 우선, 없으면 구 구조 (badges) 사용
      if (playerBadge.badgeDetails && playerBadge.badgeDetails.length > 0) {
        stats[playerId] = {
          badgeDetails: playerBadge.badgeDetails
        };
      } else if (playerBadge.badges && playerBadge.badges.length > 0) {
        // 구 구조 호환성 유지
        stats[playerId] = {
          badgeDetails: playerBadge.badges.map(badgeId => ({
            badgeId,
            awardedAt: null,
            awardType: 'unknown'
          }))
        };
      }
    });

    // 매칭 결과 로그
    const matchedCount = Object.keys(stats).filter(playerId =>
      students.some(s => s.id === playerId)
    ).length;

    console.log(`📊 [BadgeCollection] 배지 기록: ${Object.keys(stats).length}개 | 매칭된 학생: ${matchedCount}명 / ${students.length}명`);

    setPlayerStats(stats);
  }, [playerBadges, students]);

  // 특정 배지를 획득한 학생 수 (실제 매칭되는 학생만 카운트)
  const getBadgeAcquiredCount = (badgeId) => {
    let count = 0;
    Object.keys(playerStats).forEach(playerId => {
      const playerStat = playerStats[playerId];
      if (playerStat.badges && playerStat.badges.includes(badgeId)) {
        // students 배열에서 실제로 찾을 수 있는 학생만 카운트
        const student = students.find(s => s.id === playerId);
        if (student) {
          count++;
        }
      }
    });
    return count;
  };

  // 특정 배지를 획득한 학생 목록
  const getStudentsWithBadge = (badgeId) => {
    const studentsWithBadge = [];

    // playerStats에서 배지를 가진 학생 ID 찾기
    Object.keys(playerStats).forEach(playerId => {
      const playerStat = playerStats[playerId];

      if (playerStat.badges && playerStat.badges.includes(badgeId)) {
        // students 배열에서 해당 학생 정보 찾기
        const student = students.find(s => s.id === playerId);

        if (student) {
          studentsWithBadge.push({
            id: student.id,
            name: student.name,
            className: student.className,
            acquiredAt: '정보 없음' // 향후 구현
          });
        }
      }
    });

    // 반별로 정렬 (반 이름 → 학생 이름)
    studentsWithBadge.sort((a, b) => {
      if (a.className !== b.className) {
        return a.className.localeCompare(b.className, 'ko');
      }
      return a.name.localeCompare(b.name, 'ko');
    });

    return studentsWithBadge;
  };

  // 배지 카드 클릭 핸들러
  const handleBadgeClick = (badge) => {
    const studentsWithBadge = getStudentsWithBadge(badge.id);

    // 학생이 없어도 모달을 열어서 "아직 획득한 학생이 없습니다" 메시지를 보여줌
    setSelectedBadge({ ...badge, students: studentsWithBadge });
    setShowStudentListModal(true);
  };

  // 배지 삭제 핸들러
  const handleDeleteBadge = async (student, badgeId) => {
    if (!confirm(`${student.name} 학생의 "${selectedBadge?.name}" 배지를 정말 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다.`)) {
      return;
    }

    try {
      console.log(`🗑️ 배지 삭제 시작: ${student.name} (${student.id}) - ${badgeId}`);

      // Firestore에서 배지 삭제
      await firestoreService.removePlayerBadge(student.id, badgeId);

      // 로컬 playerStats 업데이트 (즉시 UI 반영)
      setPlayerStats(prev => {
        const newStats = { ...prev };
        if (newStats[student.id]) {
          newStats[student.id] = {
            ...newStats[student.id],
            badges: newStats[student.id].badges.filter(id => id !== badgeId)
          };
        }
        return newStats;
      });

      // 모달의 학생 목록 업데이트
      const updatedStudents = getStudentsWithBadge(badgeId);
      setSelectedBadge(prev => ({
        ...prev,
        students: updatedStudents
      }));

      alert(`✅ ${student.name} 학생의 배지가 삭제되었습니다.`);
      console.log(`✅ 배지 삭제 완료`);
    } catch (error) {
      console.error('❌ 배지 삭제 실패:', error);
      alert('배지 삭제에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 배지 목록 필터링 (시스템 + 커스텀, 숨긴 배지 제외)
  const getFilteredBadges = () => {
    const allBadges = [...Object.values(BADGES), ...customBadges].filter(b => !hiddenBadges.includes(b.id));
    if (selectedTier === 'ALL') {
      return allBadges;
    }
    if (selectedTier === 'CUSTOM') {
      return customBadges.filter(b => !hiddenBadges.includes(b.id));
    }
    return allBadges.filter(badge => badge.tier === parseInt(selectedTier));
  };

  // 배지 카드 렌더링 (교사용 - 모두 컬러 표시)
  const BadgeCard = ({ badge }) => {
    const acquiredCount = getBadgeAcquiredCount(badge.id);
    const totalStudents = students.length;
    const isAcquired = acquiredCount > 0;

    const handleClick = () => {
      handleBadgeClick(badge);
    };

    return (
      <Card
        className={`w-full p-3 bg-card transition-all hover:scale-105 cursor-pointer ${
          isAcquired ? 'border-primary/50 hover:border-primary' : 'hover:border-muted-foreground/50'
        }`}
        onClick={handleClick}
      >
        <div className="flex flex-col items-center text-center gap-1.5">
          {/* 배지 아이콘 - 교사는 항상 컬러로 표시 */}
          <div className="text-4xl">
            {badge.icon}
          </div>

          {/* 배지 이름 */}
          <h3 className="font-bold text-sm">
            {badge.name}
          </h3>

          {/* 등급 표시 */}
          <Badge
            variant={isAcquired ? 'default' : 'outline'}
            className="text-xs"
          >
            {tierNames[badge.tier]}
          </Badge>

          {/* 설명 */}
          <p className="text-xs text-muted-foreground">
            {badge.description}
          </p>

          {/* 획득 현황 */}
          <div className="mt-1 w-full">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">획득</span>
              <span className={isAcquired ? 'text-primary font-semibold' : 'text-muted-foreground'}>
                {acquiredCount} / {totalStudents}명
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className={`h-2 rounded-full ${isAcquired ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                style={{ width: `${totalStudents > 0 ? (acquiredCount / totalStudents) * 100 : 0}%` }}
              />
            </div>
          </div>

          {/* 클릭 힌트 - 항상 표시 */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
            <Users className="w-3 h-3" />
            <span>클릭하여 {isAcquired ? '학생 목록' : '상세 정보'} 보기</span>
          </div>
        </div>
      </Card>
    );
  };

  const filteredBadges = getFilteredBadges();

  // 통계 계산 (시스템 + 커스텀)
  const totalBadges = Object.keys(BADGES).length + customBadges.length;
  const uniqueAcquiredBadges = new Set();
  Object.values(playerStats).forEach(stat => {
    stat.badges.forEach(badgeId => uniqueAcquiredBadges.add(badgeId));
  });
  const acquiredBadgeCount = uniqueAcquiredBadges.size;

  return (
    <div className="w-full max-w-full h-full flex flex-col bg-background min-h-0">
      {/* 헤더 */}
      <div className="border-b bg-card p-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          {/* 좌측: 대시보드 버튼 */}
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 font-medium rounded-full transition-all duration-200 shadow-sm hover:shadow-md flex-shrink-0"
          >
            <span>←</span>
            <span>대시보드</span>
          </button>

          {/* 중앙: 제목 */}
          <div className="absolute left-1/2 transform -translate-x-1/2">
            <h1 className="text-2xl font-bold">🏆 배지 도감</h1>
          </div>

          {/* 우측: 전체 통계 */}
          <div className="flex items-center gap-3">
            <div className="text-center bg-blue-50 rounded-lg px-4 py-2">
              <p className="text-sm font-bold text-black mb-1">전체 배지</p>
              <p className="text-2xl font-bold text-black">{totalBadges}</p>
            </div>
            <div className="text-center bg-green-50 rounded-lg px-4 py-2">
              <p className="text-sm font-bold text-black mb-1">획득한 배지</p>
              <p className="text-2xl font-bold text-black">{acquiredBadgeCount}</p>
            </div>
            <div className="text-center bg-purple-50 rounded-lg px-4 py-2">
              <p className="text-sm font-bold text-black mb-1">달성률</p>
              <p className="text-2xl font-bold text-black">
                {totalBadges > 0 ? Math.round((acquiredBadgeCount / totalBadges) * 100) : 0}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 탭 */}
      <Tabs value={selectedTier} onValueChange={setSelectedTier} className="flex-1 w-full max-w-full flex flex-col min-h-0 overflow-hidden">
        <TabsList className="w-full grid grid-cols-7 rounded-none border-b flex-shrink-0">
          <TabsTrigger value="ALL">전체</TabsTrigger>
          <TabsTrigger value={String(BADGE_TIERS.BEGINNER)}>입문</TabsTrigger>
          <TabsTrigger value={String(BADGE_TIERS.SKILLED)}>숙련</TabsTrigger>
          <TabsTrigger value={String(BADGE_TIERS.MASTER)}>마스터</TabsTrigger>
          <TabsTrigger value={String(BADGE_TIERS.LEGEND)}>레전드</TabsTrigger>
          <TabsTrigger value={String(BADGE_TIERS.SPECIAL)}>특별</TabsTrigger>
          <TabsTrigger value="CUSTOM">✨ 커스텀</TabsTrigger>
        </TabsList>

        {/* 전체 탭 */}
        <TabsContent value="ALL" className="flex-1 w-full max-w-full overflow-y-auto px-4 pt-4 pb-12 mt-0 min-h-0">
          <div className="w-full max-w-full grid grid-cols-5 gap-x-4 gap-y-6">
            {[...Object.values(BADGES), ...customBadges].filter(b => !hiddenBadges.includes(b.id)).map(badge => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </TabsContent>

        {/* 입문 탭 */}
        <TabsContent value={String(BADGE_TIERS.BEGINNER)} className="flex-1 w-full max-w-full overflow-y-auto px-4 pt-4 pb-12 mt-0 min-h-0">
          <div className="w-full max-w-full grid grid-cols-5 gap-x-4 gap-y-6">
            {[...Object.values(BADGES), ...customBadges].filter(b => b.tier === BADGE_TIERS.BEGINNER && !hiddenBadges.includes(b.id)).map(badge => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </TabsContent>

        {/* 숙련 탭 */}
        <TabsContent value={String(BADGE_TIERS.SKILLED)} className="flex-1 w-full max-w-full overflow-y-auto px-4 pt-4 pb-12 mt-0 min-h-0">
          <div className="w-full max-w-full grid grid-cols-5 gap-x-4 gap-y-6">
            {[...Object.values(BADGES), ...customBadges].filter(b => b.tier === BADGE_TIERS.SKILLED && !hiddenBadges.includes(b.id)).map(badge => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </TabsContent>

        {/* 마스터 탭 */}
        <TabsContent value={String(BADGE_TIERS.MASTER)} className="flex-1 w-full max-w-full overflow-y-auto px-4 pt-4 pb-12 mt-0 min-h-0">
          <div className="w-full max-w-full grid grid-cols-5 gap-x-4 gap-y-6">
            {[...Object.values(BADGES), ...customBadges].filter(b => b.tier === BADGE_TIERS.MASTER && !hiddenBadges.includes(b.id)).map(badge => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </TabsContent>

        {/* 레전드 탭 */}
        <TabsContent value={String(BADGE_TIERS.LEGEND)} className="flex-1 w-full max-w-full overflow-y-auto px-4 pt-4 pb-12 mt-0 min-h-0">
          <div className="w-full max-w-full grid grid-cols-5 gap-x-4 gap-y-6">
            {[...Object.values(BADGES), ...customBadges].filter(b => b.tier === BADGE_TIERS.LEGEND && !hiddenBadges.includes(b.id)).map(badge => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </TabsContent>

        {/* 특별 탭 */}
        <TabsContent value={String(BADGE_TIERS.SPECIAL)} className="flex-1 w-full max-w-full overflow-y-auto px-4 pt-4 pb-12 mt-0 min-h-0">
          <div className="w-full max-w-full grid grid-cols-5 gap-x-4 gap-y-6">
            {[...Object.values(BADGES), ...customBadges].filter(b => b.tier === BADGE_TIERS.SPECIAL && !hiddenBadges.includes(b.id)).map(badge => (
              <BadgeCard key={badge.id} badge={badge} />
            ))}
          </div>
        </TabsContent>

        {/* 커스텀 탭 */}
        <TabsContent value="CUSTOM" className="flex-1 w-full max-w-full overflow-y-auto px-4 pt-4 pb-12 mt-0 min-h-0">
          {customBadges.filter(b => !hiddenBadges.includes(b.id)).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-5xl mb-4">📦</p>
              <p className="text-lg font-semibold mb-2">아직 만든 배지가 없습니다</p>
              <p className="text-sm">배지 관리에서 커스텀 배지를 만들어보세요!</p>
            </div>
          ) : (
            <div className="w-full max-w-full grid grid-cols-5 gap-x-4 gap-y-6">
              {customBadges.filter(b => !hiddenBadges.includes(b.id)).map(badge => (
                <BadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* 학생 목록 모달 */}
      <Dialog open={showStudentListModal} onOpenChange={setShowStudentListModal}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <span className="text-4xl">{selectedBadge?.icon}</span>
              <div>
                <div className="text-xl font-bold">{selectedBadge?.name}</div>
                <div className="text-sm text-muted-foreground font-normal">
                  {selectedBadge?.description}
                </div>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">이 배지를 획득한 학생</h3>
              <Badge variant="default">
                {selectedBadge?.students?.length || 0}명
              </Badge>
            </div>

            {selectedBadge?.students && selectedBadge.students.length > 0 ? (
              <div className="space-y-4">
                {/* 반별로 그룹화 */}
                {Object.entries(
                  selectedBadge.students.reduce((groups, student) => {
                    const className = student.className;
                    if (!groups[className]) {
                      groups[className] = [];
                    }
                    groups[className].push(student);
                    return groups;
                  }, {})
                ).map(([className, classStudents]) => (
                  <div key={className} className="mb-6">
                    {/* 반 이름 헤더 */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="text-base font-bold text-black">
                        {className}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ({classStudents.length}명)
                      </div>
                      <div className="flex-1 border-b border-muted" />
                    </div>

                    {/* 반별 학생 목록 - 4열 그리드 */}
                    <div className="grid grid-cols-4 gap-3">
                      {classStudents.map((student) => (
                        <Card key={student.id} className="p-3">
                          <div className="flex items-center justify-between gap-3">
                            {/* 학생 이름 */}
                            <div className="font-semibold text-sm min-w-[60px]">{student.name}</div>

                            {/* 획득 날짜 및 시간 */}
                            <div className="text-xs text-muted-foreground flex-1 text-center">
                              {student.acquiredAt}
                            </div>

                            {/* 삭제 버튼 */}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBadge(student, selectedBadge.id)}
                              className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                              title="배지 삭제"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                아직 이 배지를 획득한 학생이 없습니다.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BadgeCollection;
