# 📊 Phase 3: 학생 경기 기록 시스템 구현 가이드

## 🎯 목표
학생과 교사 모두 학생별 경기 출전 기록과 상세 통계를 확인할 수 있는 시스템 구현

---

## 📋 구현 체크리스트

### 1단계: 학생용 화면 (StudentView 확장)
- [ ] `StudentGameHistory.jsx` 컴포넌트 생성
- [ ] StudentView에 통합
- [ ] 경기 목록 표시
- [ ] 경기별 상세 기록 표시

### 2단계: 교사용 화면 (새 탭)
- [ ] `StudentRecordsView.jsx` 컴포넌트 생성
- [ ] `PlayerDetailModal.jsx` 컴포넌트 생성
- [ ] MainApp 대시보드에 카드 추가
- [ ] 학생 목록 표시

### 3단계: Firebase 함수 추가
- [ ] `getPlayerDetailedHistory()` 함수
- [ ] `getPlayerBadgeTimeline()` 함수

### 4단계: (선택) 시각화
- [ ] recharts 설치
- [ ] 라인 차트 (스탯 추이)
- [ ] 바 차트 (카테고리별 누적)

---

## 📂 1. 학생용 화면 구현

### 1-1. StudentGameHistory.jsx 생성

**파일 위치**: `src/components/StudentGameHistory.jsx`

**기능**:
- 학생의 전체 경기 기록 표시
- 경기별 상세 스탯
- 경기별 획득 배지
- 상세 보기 확장/축소

**주요 코드**:
```jsx
import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { getPlayerDetailedHistory } from '../services/firestoreService';

export default function StudentGameHistory({ playerId, teacherId }) {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedGameId, setExpandedGameId] = useState(null);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc'

  useEffect(() => {
    loadGames();
  }, [playerId, teacherId]);

  const loadGames = async () => {
    setLoading(true);
    try {
      const history = await getPlayerDetailedHistory(teacherId, playerId);
      setGames(history);
    } catch (error) {
      console.error('경기 기록 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const sortedGames = [...games].sort((a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  });

  const totalStats = games.reduce((acc, game) => ({
    hits: acc.hits + (game.stats.hits || 0),
    runs: acc.runs + (game.stats.runs || 0),
    goodDefense: acc.goodDefense + (game.stats.goodDefense || 0),
    bonusCookie: acc.bonusCookie + (game.stats.bonusCookie || 0),
    badges: acc.badges + (game.newBadges?.length || 0)
  }), { hits: 0, runs: 0, goodDefense: 0, bonusCookie: 0, badges: 0 });

  if (loading) {
    return <div className="text-center py-8">로딩 중...</div>;
  }

  if (games.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-4xl mb-4">⚾</p>
        <p>아직 출전한 경기가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">⚾ 나의 경기 기록</h2>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="p-2 border rounded"
        >
          <option value="desc">최신순</option>
          <option value="asc">오래된순</option>
        </select>
      </div>

      {/* 누적 통계 요약 */}
      <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
        <div className="grid grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold">{games.length}</p>
            <p className="text-sm text-muted-foreground">경기</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totalStats.hits}</p>
            <p className="text-sm text-muted-foreground">안타</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totalStats.runs}</p>
            <p className="text-sm text-muted-foreground">득점</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totalStats.goodDefense}</p>
            <p className="text-sm text-muted-foreground">수비</p>
          </div>
          <div>
            <p className="text-2xl font-bold">{totalStats.badges}</p>
            <p className="text-sm text-muted-foreground">배지</p>
          </div>
        </div>
      </Card>

      {/* 경기 목록 */}
      <div className="space-y-3">
        {sortedGames.map((game) => (
          <GameCard
            key={game.gameId}
            game={game}
            isExpanded={expandedGameId === game.gameId}
            onToggle={() => setExpandedGameId(
              expandedGameId === game.gameId ? null : game.gameId
            )}
          />
        ))}
      </div>
    </div>
  );
}

// 개별 경기 카드 컴포넌트
function GameCard({ game, isExpanded, onToggle }) {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const isWin = game.result === 'win';
  const resultColor = isWin ? 'text-blue-600' : 'text-red-600';
  const resultText = isWin ? '승리' : '패배';

  return (
    <Card className={`p-4 ${isExpanded ? 'ring-2 ring-primary' : ''}`}>
      {/* 기본 정보 */}
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">
              📅 {formatDate(game.date)}
            </span>
            <span className="text-sm text-muted-foreground">
              🏆 {game.team}
            </span>
            <span className={`text-sm font-semibold ${resultColor}`}>
              ({game.score.our}:{game.score.opponent} {resultText})
            </span>
          </div>
        </div>
      </div>

      {/* 스탯 */}
      <div className="flex gap-4 text-sm mb-3">
        <span>⚾ 안타 {game.stats.hits}</span>
        <span>🏃 득점 {game.stats.runs}</span>
        <span>🛡️ 수비 {game.stats.goodDefense}</span>
        <span>🍪 쿠키 {game.stats.bonusCookie}</span>
      </div>

      {/* 획득 배지 */}
      {game.newBadges && game.newBadges.length > 0 && (
        <div className="mb-3">
          <p className="text-sm font-semibold mb-1">🏅 획득 배지:</p>
          <div className="flex gap-2 flex-wrap">
            {game.newBadges.map((badge) => (
              <span
                key={badge.id}
                className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs"
              >
                {badge.icon} {badge.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 상세 보기 버튼 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onToggle}
        className="w-full"
      >
        {isExpanded ? '상세 보기 ▲' : '상세 보기 ▼'}
      </Button>

      {/* 확장 영역 */}
      {isExpanded && (
        <div className="mt-4 pt-4 border-t space-y-3">
          {/* 이닝별 상세 */}
          <div>
            <h4 className="font-semibold mb-2">📊 이닝별 상세 기록</h4>
            <div className="grid grid-cols-5 gap-2">
              {game.inningDetails?.map((inning, idx) => (
                <div key={idx} className="p-2 bg-muted rounded text-center">
                  <p className="text-xs font-semibold">{idx + 1}회</p>
                  <p className="text-xs">{inning.event || '-'}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 하이라이트 */}
          {game.highlights && game.highlights.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">🎯 하이라이트</h4>
              <ul className="text-sm space-y-1">
                {game.highlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span>•</span>
                    <span>{highlight}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
```

### 1-2. StudentView.jsx 수정

**파일 위치**: `src/components/StudentView.jsx`

**배지 컬렉션과 랭킹 사이에 추가**:

```jsx
// Line 300-400 예상 (배지 컬렉션 다음)
{/* 배지 컬렉션 */}
<section className="mb-8">
  <BadgeCollection ... />
</section>

{/* ⭐ 경기 기록 섹션 추가 */}
<section className="mb-8">
  <StudentGameHistory
    playerId={studentData.playerId}
    teacherId={studentData.teacherId}
  />
</section>

{/* 우리 반 랭킹 */}
<section>
  ...
</section>
```

---

## 📂 2. 교사용 화면 구현

### 2-1. StudentRecordsView.jsx 생성

**파일 위치**: `src/components/StudentRecordsView.jsx`

**기능**:
- 모든 학생 목록 표시 (반별 그룹화)
- 학생 검색 및 필터링
- 학생 클릭 시 상세 모달

**주요 코드**:
```jsx
import React, { useState, useMemo } from 'react';
import { Card, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import PlayerDetailModal from './PlayerDetailModal';
import { useGame } from '../contexts/GameContext';

export default function StudentRecordsView({ onBack }) {
  const { students, playerHistory } = useGame();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // 반 목록
  const classes = useMemo(() => {
    const classSet = new Set(students.map(s => s.className));
    return ['all', ...Array.from(classSet).sort()];
  }, [students]);

  // 필터링된 학생 목록
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const matchesSearch = student.name.includes(searchTerm);
      const matchesClass = selectedClass === 'all' || student.className === selectedClass;
      return matchesSearch && matchesClass;
    });
  }, [students, searchTerm, selectedClass]);

  // 반별 그룹화
  const studentsByClass = useMemo(() => {
    const grouped = {};
    filteredStudents.forEach(student => {
      if (!grouped[student.className]) {
        grouped[student.className] = [];
      }
      grouped[student.className].push(student);
    });
    return grouped;
  }, [filteredStudents]);

  const handleStudentClick = (student) => {
    setSelectedStudent(student);
    setShowDetailModal(true);
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onBack}
          >
            ← 대시보드
          </Button>
          <h2 className="text-2xl font-bold">📋 학생 기록 관리</h2>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-4 mb-6">
        <Input
          placeholder="학생 이름 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-xs"
        />
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="p-2 border rounded"
        >
          {classes.map(cls => (
            <option key={cls} value={cls}>
              {cls === 'all' ? '전체 반' : cls}
            </option>
          ))}
        </select>
      </div>

      {/* 학생 목록 (반별) */}
      <div className="space-y-8">
        {Object.entries(studentsByClass)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([className, classStudents]) => (
            <div key={className}>
              <h3 className="text-lg font-bold mb-4">
                {className} ({classStudents.length}명)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {classStudents.map(student => {
                  const history = playerHistory[student.playerId] || { games: [] };
                  const gameCount = history.games.length;
                  const badges = student.badges?.length || 0;

                  return (
                    <Card
                      key={student.playerId}
                      className="cursor-pointer hover:shadow-lg transition-all"
                      onClick={() => handleStudentClick(student)}
                    >
                      <CardContent className="p-4 text-center">
                        <div className="text-3xl mb-2">👤</div>
                        <h4 className="font-semibold mb-1">{student.name}</h4>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>경기: {gameCount}회</p>
                          <p>배지: 🏅 {badges}개</p>
                        </div>
                        <Button size="sm" className="mt-3 w-full">
                          보기
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
      </div>

      {/* 상세 모달 */}
      <PlayerDetailModal
        open={showDetailModal}
        onOpenChange={setShowDetailModal}
        student={selectedStudent}
      />
    </div>
  );
}
```

### 2-2. PlayerDetailModal.jsx 생성

**파일 위치**: `src/components/PlayerDetailModal.jsx`

**기능**:
- 학생 개인 상세 정보
- 경기 기록 리스트
- 배지 타임라인
- CSV 내보내기 (선택)

**주요 코드**:
```jsx
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { getPlayerDetailedHistory, getPlayerBadgeTimeline } from '../services/firestoreService';

export default function PlayerDetailModal({ open, onOpenChange, student }) {
  const [games, setGames] = useState([]);
  const [badgeTimeline, setBadgeTimeline] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && student) {
      loadStudentData();
    }
  }, [open, student]);

  const loadStudentData = async () => {
    setLoading(true);
    try {
      const [gamesData, badgesData] = await Promise.all([
        getPlayerDetailedHistory(student.teacherId, student.playerId),
        getPlayerBadgeTimeline(student.teacherId, student.playerId)
      ]);
      setGames(gamesData);
      setBadgeTimeline(badgesData);
    } catch (error) {
      console.error('학생 데이터 불러오기 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalStats = games.reduce((acc, game) => ({
    hits: acc.hits + (game.stats.hits || 0),
    runs: acc.runs + (game.stats.runs || 0),
    goodDefense: acc.goodDefense + (game.stats.goodDefense || 0),
    bonusCookie: acc.bonusCookie + (game.stats.bonusCookie || 0)
  }), { hits: 0, runs: 0, goodDefense: 0, bonusCookie: 0 });

  const handleExportCSV = () => {
    // CSV 생성 로직
    const csvContent = [
      ['날짜', '팀', '결과', '안타', '득점', '수비', '쿠키', '획득 배지'],
      ...games.map(game => [
        game.date,
        game.team,
        game.result === 'win' ? '승리' : '패배',
        game.stats.hits,
        game.stats.runs,
        game.stats.goodDefense,
        game.stats.bonusCookie,
        game.newBadges?.map(b => b.name).join(', ') || '-'
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${student.name}_경기기록.csv`;
    link.click();
  };

  if (!student) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            👤 {student.name} ({student.className})
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">로딩 중...</div>
        ) : (
          <div className="space-y-6">
            {/* 누적 통계 */}
            <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50">
              <h3 className="font-semibold mb-3">📊 누적 통계</h3>
              <div className="grid grid-cols-5 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{games.length}</p>
                  <p className="text-sm text-muted-foreground">경기</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalStats.hits}</p>
                  <p className="text-sm text-muted-foreground">안타</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalStats.runs}</p>
                  <p className="text-sm text-muted-foreground">득점</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{totalStats.goodDefense}</p>
                  <p className="text-sm text-muted-foreground">수비</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{student.badges?.length || 0}</p>
                  <p className="text-sm text-muted-foreground">배지</p>
                </div>
              </div>
            </Card>

            {/* 경기 기록 */}
            <div>
              <h3 className="font-semibold mb-3">🎮 경기 기록 (최근 {Math.min(games.length, 5)}경기)</h3>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {games.slice(0, 5).map(game => (
                  <Card key={game.gameId} className="p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold">
                          {new Date(game.date).toLocaleDateString('ko-KR')}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {game.team} - {game.result === 'win' ? '승리' : '패배'}
                        </p>
                      </div>
                      <div className="text-sm">
                        안타 {game.stats.hits}, 득점 {game.stats.runs}
                      </div>
                    </div>
                    {game.newBadges && game.newBadges.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs">
                          🏅 {game.newBadges.map(b => b.name).join(', ')}
                        </p>
                      </div>
                    )}
                  </Card>
                ))}
              </div>
              {games.length > 5 && (
                <p className="text-sm text-muted-foreground text-center mt-2">
                  총 {games.length}경기 (5개만 표시)
                </p>
              )}
            </div>

            {/* 배지 타임라인 */}
            <div>
              <h3 className="font-semibold mb-3">🏅 배지 획득 타임라인</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {badgeTimeline.map((entry, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-muted rounded">
                    <span className="text-sm font-semibold">
                      {new Date(entry.date).toLocaleDateString('ko-KR')}
                    </span>
                    <div className="flex gap-2">
                      {entry.badges.map(badge => (
                        <span key={badge.id} className="text-sm">
                          {badge.icon} {badge.name}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            disabled={games.length === 0}
          >
            📊 CSV 내보내기
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

### 2-3. MainApp.jsx에 대시보드 카드 추가

**파일 위치**: `src/components/MainApp.jsx`

**Line 380-504 (기존 카드들 다음에 추가)**:

```jsx
{/* 기존 4개 카드... */}

{/* ⭐ 학생 기록 카드 추가 */}
<Card
  className="cursor-pointer hover:shadow-xl transition-all bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 w-full h-[280px]"
  onClick={() => setDashboardView('studentRecords')}
>
  <CardContent className="p-6 h-full flex flex-col justify-center items-center text-center gap-2 !pt-6">
    <div className="flex items-center justify-center gap-4 w-full">
      <div className="text-5xl">📋</div>
      <div className="text-3xl font-extrabold text-foreground">
        학생 기록
      </div>
    </div>

    <p className="text-xl font-bold text-gray-900">
      학생별 경기 출전 기록
    </p>

    <div className="flex flex-wrap gap-3 justify-center">
      <span className="px-5 py-2.5 bg-orange-100/80 rounded-lg font-semibold text-orange-800 text-lg">
        {students.length}명
      </span>
    </div>
  </CardContent>
</Card>
```

**State 추가**:
```jsx
const [dashboardView, setDashboardView] = useState('dashboard'); // 기존
// dashboardView 값: 'dashboard' | 'teams' | 'games' | 'stats' | 'badges' | 'studentRecords'
```

**뷰 렌더링 추가 (Line 800-850)**:
```jsx
{/* 학생 기록 뷰 */}
{dashboardView === 'studentRecords' && (
  <StudentRecordsView
    onBack={() => setDashboardView('dashboard')}
  />
)}
```

---

## 🔥 3. Firebase 함수 추가

**파일 위치**: `src/services/firestoreService.js`

```javascript
/**
 * 학생의 전체 경기 기록 (상세 정보 포함)
 */
export async function getPlayerDetailedHistory(teacherId, playerId) {
  try {
    // 1. playerHistory에서 games 배열 가져오기
    const historyRef = doc(db, 'users', teacherId, 'playerHistory', playerId);
    const historyDoc = await getDoc(historyRef);

    if (!historyDoc.exists()) {
      return [];
    }

    const games = historyDoc.data().games || [];

    // 2. 각 gameId로 finishedGames 조회
    const detailedGames = await Promise.all(
      games.map(async (game) => {
        const gameRef = doc(db, 'users', teacherId, 'finishedGames', game.gameId);
        const gameDoc = await getDoc(gameRef);

        if (!gameDoc.exists()) {
          return null;
        }

        const gameData = gameDoc.data();

        // 3. 해당 플레이어의 팀과 스탯 찾기
        const playerInTeamA = gameData.teamA?.lineup?.find(p => p.playerId === playerId);
        const playerInTeamB = gameData.teamB?.lineup?.find(p => p.playerId === playerId);
        const playerData = playerInTeamA || playerInTeamB;
        const playerTeam = playerInTeamA ? gameData.teamA.name : gameData.teamB.name;

        // 4. 승패 계산
        const isTeamA = !!playerInTeamA;
        const teamScore = isTeamA ? gameData.scoreBoard.teamATotal : gameData.scoreBoard.teamBTotal;
        const opponentScore = isTeamA ? gameData.scoreBoard.teamBTotal : gameData.scoreBoard.teamATotal;
        const result = teamScore > opponentScore ? 'win' : 'lose';

        return {
          gameId: game.gameId,
          date: game.date,
          team: playerTeam,
          score: {
            our: teamScore,
            opponent: opponentScore
          },
          result,
          stats: playerData.stats,
          newBadges: playerData.newBadges || [],
          inningDetails: [], // 필요시 구현
          highlights: [] // 필요시 구현
        };
      })
    );

    return detailedGames.filter(g => g !== null).sort((a, b) =>
      new Date(b.date) - new Date(a.date)
    );
  } catch (error) {
    console.error('getPlayerDetailedHistory 실패:', error);
    return [];
  }
}

/**
 * 학생의 배지 획득 타임라인
 */
export async function getPlayerBadgeTimeline(teacherId, playerId) {
  try {
    const games = await getPlayerDetailedHistory(teacherId, playerId);

    const timeline = games
      .filter(game => game.newBadges && game.newBadges.length > 0)
      .map(game => ({
        date: game.date,
        badges: game.newBadges
      }));

    return timeline;
  } catch (error) {
    console.error('getPlayerBadgeTimeline 실패:', error);
    return [];
  }
}
```

---

## 📈 4. (선택) 시각화 추가

### 4-1. recharts 설치

```bash
npm install recharts
```

### 4-2. 라인 차트 컴포넌트

**파일 위치**: `src/components/ui/StatsLineChart.jsx`

```jsx
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function StatsLineChart({ games }) {
  const data = games.map((game, idx) => ({
    name: `경기 ${idx + 1}`,
    안타: game.stats.hits,
    득점: game.stats.runs,
    수비: game.stats.goodDefense
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="안타" stroke="#8884d8" />
        <Line type="monotone" dataKey="득점" stroke="#82ca9d" />
        <Line type="monotone" dataKey="수비" stroke="#ffc658" />
      </LineChart>
    </ResponsiveContainer>
  );
}
```

### 4-3. StudentGameHistory에 통합

```jsx
import StatsLineChart from './ui/StatsLineChart';

// 경기 목록 전에 추가
{games.length > 0 && (
  <Card className="p-4">
    <h3 className="font-semibold mb-3">📈 스탯 추이</h3>
    <StatsLineChart games={sortedGames} />
  </Card>
)}
```

---

## ✅ 5. 테스트 체크리스트

### 학생용 화면 테스트
- [ ] StudentView에 경기 기록 섹션 표시
- [ ] 경기 목록 정상 로드
- [ ] 누적 통계 정확히 계산
- [ ] 경기별 상세 정보 확장/축소
- [ ] 최신순/오래된순 정렬
- [ ] 획득 배지 표시

### 교사용 화면 테스트
- [ ] 대시보드에 학생 기록 카드 표시
- [ ] 학생 목록 반별 그룹화
- [ ] 학생 검색 기능
- [ ] 반 필터링
- [ ] 학생 클릭 시 상세 모달
- [ ] 모달에서 경기 기록 표시
- [ ] 배지 타임라인 표시
- [ ] CSV 내보내기 (선택)

### 시각화 테스트 (선택)
- [ ] 라인 차트 렌더링
- [ ] 차트 데이터 정확성
- [ ] 반응형 크기 조정

---

## 🎉 완료 후 확인사항

1. ✅ 학생용: StudentView에 경기 기록 표시
2. ✅ 교사용: 대시보드에 학생 기록 카드 추가
3. ✅ 교사용: 학생 목록 및 상세 모달 정상 작동
4. ✅ Firebase 함수로 데이터 정상 조회
5. ✅ 경기별 상세 정보 표시
6. ✅ 배지 타임라인 표시
7. ✅ (선택) 그래프 시각화

---

**예상 소요 시간**: 6-8시간 (시각화 제외: 4-6시간)

**전체 프로젝트 완료! 🎉**
