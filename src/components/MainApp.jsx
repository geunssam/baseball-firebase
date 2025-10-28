import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useGame } from '../contexts/GameContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import TeamDetailModal from './TeamDetailModal';
import LineupModal from './LineupModal';
import CreateGameModal from './CreateGameModal';
import GameScreen from './GameScreen';
import ClassTeamManagementView from './ClassTeamManagementView';
import BadgeCollection from './BadgeCollection';
import StatsView from './StatsView';
import { useModalKeyboard } from '../hooks/useKeyboardShortcut';

const MainApp = () => {
  const { user, signOut } = useAuth();
  const { students, playerBadges, teams, games, finishedGames, createTeam, updateTeam, updateGame, createGame, deleteGame, deleteInProgressGame, loading, saveStatus } = useGame();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [currentDateTime, setCurrentDateTime] = useState(new Date());

  // 팀 상세 및 라인업 모달 상태
  const [selectedTeam, setSelectedTeam] = useState(null);
  const [showTeamDetail, setShowTeamDetail] = useState(false);
  const [showLineup, setShowLineup] = useState(false);

  // 경기 생성 모달 상태
  const [showCreateGameModal, setShowCreateGameModal] = useState(false);

  // 선택된 경기 ID 상태
  const [selectedGameId, setSelectedGameId] = useState(null);

  // 대시보드 뷰 상태 ('dashboard' | 'teams' | 'games' | 'stats' | 'badges')
  const [dashboardView, setDashboardView] = useState('dashboard');

  // 완료된 경기 다중 선택 상태
  const [selectedCompletedGames, setSelectedCompletedGames] = useState([]);

  // 현재 날짜/시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // 디버깅용 로그 (개발 환경에서만, 데이터 변경 시에만 출력)
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [MainApp] Data updated:', {
        teams: teams.length,
        games: games.length,
        finishedGames: finishedGames.length,
        loading,
        user: user?.email
      });
    }
  }, [teams.length, games.length, finishedGames.length, loading, user?.email]);

  // 경기 목록 필터링
  const playingGames = games.filter(g => g.status === 'playing');
  const completedGames = finishedGames.slice(0, 5); // 최근 5개만

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      alert('팀 이름을 입력하세요.');
      return;
    }

    try {
      await createTeam({
        name: newTeamName,
        players: [],
        createdBy: user.displayName,
      });

      alert(`✅ "${newTeamName}" 팀이 생성되었습니다!`);
      setNewTeamName('');
      setShowCreateModal(false);
    } catch (error) {
      alert('❌ 팀 생성에 실패했습니다: ' + error.message);
    }
  };

  // 팀 생성 모달 키보드 단축키
  useModalKeyboard(showCreateModal, () => setShowCreateModal(false), handleCreateTeam, [newTeamName]);

  const handleTeamClick = (team) => {
    setSelectedTeam(team);
    setShowTeamDetail(true);
  };

  const handleUpdateTeam = async (updatedTeam) => {
    try {
      const { id, ...updates } = updatedTeam;
      await updateTeam(id, updates);

      // 선택된 팀 정보도 업데이트
      setSelectedTeam(updatedTeam);
    } catch (error) {
      alert('❌ 팀 업데이트에 실패했습니다: ' + error.message);
    }
  };

  const handleOpenLineup = (team) => {
    setSelectedTeam(team);
    setShowLineup(true);
  };

  const handleSaveLineup = async (lineup) => {
    if (!selectedTeam) return;

    const updatedTeam = {
      ...selectedTeam,
      players: lineup,
    };

    await handleUpdateTeam(updatedTeam);
  };

  const handleCreateGame = async (teamA, teamB, innings, options, inningLineups = {}) => {
    try {
      const gameData = {
        teamA: {
          id: teamA.id,
          name: teamA.name,
          lineup: teamA.players.map((player, index) => ({
            ...player,
            battingOrder: index + 1,
            outInInning: null, // 아웃당한 이닝 번호 (null이면 아웃 아님)
            stats: {
              hits: 0, // 총 안타
              single: 0, // 1루타
              double: 0, // 2루타
              triple: 0, // 3루타
              homerun: 0, // 홈런
              runs: 0, // 득점
              bonusCookie: 0, // 쿠키
              goodDefense: 0, // 수비
            },
          })),
          inningLineups: inningLineups.teamA || {}, // 이닝별 라인업 설정
        },
        teamB: {
          id: teamB.id,
          name: teamB.name,
          lineup: teamB.players.map((player, index) => ({
            ...player,
            battingOrder: index + 1,
            outInInning: null,
            stats: {
              hits: 0,
              single: 0,
              double: 0,
              triple: 0,
              homerun: 0,
              runs: 0,
              bonusCookie: 0,
              goodDefense: 0,
            },
          })),
          inningLineups: inningLineups.teamB || {}, // 이닝별 라인업 설정
        },
        innings,
        inningEndRule: options.inningEndRule || 'allBatters', // 'allBatters' | 'nOuts' | 'manual'
        outsPerInning: options.outsPerInning || 3,
        options,
        currentInning: 1,
        isTopInning: true,
        currentOuts: 0, // 현재 이닝 아웃 카운트
        runners: { first: null, second: null, third: null }, // bases → runners로 변경
        currentBatterIndex: 0,
        scoreBoard: {
          teamA: Array(innings).fill(0),
          teamB: Array(innings).fill(0),
          teamATotal: 0,
          teamBTotal: 0,
        },
        status: 'playing',
        isNewGame: true, // ✅ 새 경기 플래그 (첫 출전 배지 모달용)
        createdAt: new Date().toISOString(),
        createdBy: user.displayName,
      };

      const gameId = await createGame(gameData);
      console.log('✅ 경기 생성 완료:', gameId);
      alert('✅ 경기가 시작되었습니다!');
    } catch (error) {
      console.error('❌ 경기 생성 실패:', error);
      alert('❌ 경기 생성에 실패했습니다: ' + error.message);
    }
  };

  // 경기 화면 나가기 핸들러
  const handleExitGame = () => {
    setSelectedGameId(null); // 경기 선택 해제만 수행
    console.log('✅ 메인 화면으로 돌아갑니다.');
  };

  // 완료된 경기 선택/해제 핸들러
  const handleToggleCompletedGame = (gameId) => {
    setSelectedCompletedGames(prev =>
      prev.includes(gameId)
        ? prev.filter(id => id !== gameId)
        : [...prev, gameId]
    );
  };

  // 전체 선택/해제 핸들러
  const handleToggleAllCompletedGames = () => {
    if (selectedCompletedGames.length === completedGames.length) {
      setSelectedCompletedGames([]);
    } else {
      setSelectedCompletedGames(completedGames.map(g => g.id));
    }
  };

  // 진행 중인 경기 삭제 핸들러
  const handleDeleteInProgressGame = async (game) => {
    if (!confirm(`"${game.teamA.name} vs ${game.teamB.name}" 경기를 삭제하시겠습니까?\n\n⚠️ 진행 중인 경기를 삭제하면 선수들의 스탯이 경기 시작 전으로 복원됩니다.`)) {
      return;
    }

    try {
      await deleteInProgressGame(game.id, game);
      alert('✅ 경기가 삭제되었고 선수 스탯이 복원되었습니다.');
    } catch (error) {
      console.error('❌ 경기 삭제 실패:', error);
      alert('❌ 경기 삭제에 실패했습니다: ' + error.message);
    }
  };

  // 선택된 경기 삭제 핸들러
  const handleDeleteSelectedGames = async () => {
    if (selectedCompletedGames.length === 0) {
      alert('삭제할 경기를 선택해주세요.');
      return;
    }

    if (!confirm(`선택한 ${selectedCompletedGames.length}개의 경기를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await Promise.all(selectedCompletedGames.map(gameId => deleteGame(gameId)));
      setSelectedCompletedGames([]);
      alert('✅ 선택한 경기가 삭제되었습니다.');
    } catch (error) {
      console.error('❌ 경기 삭제 실패:', error);
      alert('❌ 경기 삭제에 실패했습니다: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">⚾</div>
          <div className="text-foreground text-xl font-semibold">데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  // 선택된 경기가 있으면 GameScreen 표시
  if (selectedGameId) {
    return <GameScreen gameId={selectedGameId} onExit={handleExitGame} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* 상단 네비게이션 바 */}
      <nav className="bg-card shadow-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 tablet:px-6 tablet-lg:px-8">
          <div className="flex justify-between items-center h-14 tablet:h-16 tablet-lg:h-20">
            {/* 좌측: 타이틀 */}
            <div className="flex items-center gap-2 tablet:gap-3">
              <span className="text-2xl tablet:text-3xl tablet-lg:text-4xl">⚾</span>
              <h1 className="text-sm tablet:text-lg tablet-lg:text-xl font-bold text-card-foreground">
                필드형 게임 마스터 보드
              </h1>
            </div>

            {/* 중앙: 날짜/시간 - 태블릿 가로모드에서만 표시 */}
            <div className="hidden tablet-lg:flex flex-1 justify-center">
              <div className="flex items-center gap-2 tablet-lg:gap-3 px-3 tablet-lg:px-4 py-1.5 tablet-lg:py-2 bg-lime-50 text-gray-800 font-semibold rounded-full shadow-sm border border-lime-200">
                <div className="flex items-center gap-1">
                  <span className="text-base tablet-lg:text-lg">📆</span>
                  <span className="text-sm tablet-lg:text-base">
                    {currentDateTime.toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-base tablet-lg:text-lg">⏱️</span>
                  <span className="text-sm tablet-lg:text-base">
                    {currentDateTime.toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* 우측: 프로필 */}
            <div className="flex items-center gap-2 tablet:gap-4">
              {/* 세로모드에서는 아바타만, 가로모드에서는 전체 정보 */}
              <Avatar className="w-8 h-8 tablet:w-10 tablet:h-10">
                <AvatarImage src={user?.photoURL} alt={user?.displayName} />
                <AvatarFallback>{user?.displayName?.charAt(0) || 'U'}</AvatarFallback>
              </Avatar>
              <div className="hidden tablet-lg:block text-right">
                <p className="text-sm font-semibold text-card-foreground">
                  {user?.displayName}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <Button onClick={signOut} size="sm" className="bg-red-100 hover:bg-red-200 text-red-700 border-red-200 text-xs tablet:text-sm">
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 저장 상태 표시 */}
        {saveStatus === 'saving' && (
          <Card className="mb-4 bg-primary/10 border-primary">
            <CardContent className="pt-4">
              <p className="text-primary font-medium">💾 저장 중...</p>
            </CardContent>
          </Card>
        )}

        {/* 대시보드 뷰 */}
        {dashboardView === 'dashboard' && (
          <div>
            <h2 className="text-2xl tablet:text-3xl font-bold text-foreground mb-4 tablet:mb-8">대시보드</h2>
            <div className="grid grid-cols-2 tablet-lg:grid-cols-4 gap-3 tablet:gap-4 tablet-lg:gap-6">
              {/* 학급/팀 관리 카드 */}
              <Card
                className="cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
                onClick={() => setDashboardView('teams')}
              >
                <CardHeader className="p-3 tablet:p-4 tablet-lg:p-6">
                  <div className="text-4xl tablet:text-5xl tablet-lg:text-6xl mb-2">👥</div>
                  <CardTitle className="text-base tablet:text-lg tablet-lg:text-xl">학급/팀 관리</CardTitle>
                  <CardDescription className="text-xs tablet:text-sm">팀 생성 및 선수 관리</CardDescription>
                </CardHeader>
                <CardContent className="p-3 tablet:p-4 tablet-lg:p-6 pt-0">
                  <p className="text-2xl tablet:text-3xl font-bold text-blue-600">{teams.length}</p>
                  <p className="text-xs tablet:text-sm text-muted-foreground">개 팀</p>
                </CardContent>
              </Card>

              {/* 경기 관리 카드 */}
              <Card
                className="cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105 bg-gradient-to-br from-green-50 to-green-100 border-green-200"
                onClick={() => setDashboardView('games')}
              >
                <CardHeader className="p-3 tablet:p-4 tablet-lg:p-6">
                  <div className="text-4xl tablet:text-5xl tablet-lg:text-6xl mb-2">⚾</div>
                  <CardTitle className="text-base tablet:text-lg tablet-lg:text-xl">경기 관리</CardTitle>
                  <CardDescription className="text-xs tablet:text-sm">진행 중 및 완료된 경기</CardDescription>
                </CardHeader>
                <CardContent className="p-3 tablet:p-4 tablet-lg:p-6 pt-0">
                  <div className="flex gap-4">
                    <div>
                      <p className="text-xl tablet:text-2xl font-bold text-green-600">{playingGames.length}</p>
                      <p className="text-xs text-muted-foreground">진행 중</p>
                    </div>
                    <div>
                      <p className="text-xl tablet:text-2xl font-bold text-gray-600">{completedGames.length}</p>
                      <p className="text-xs text-muted-foreground">완료</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 통계 카드 */}
              <Card
                className="cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
                onClick={() => setDashboardView('stats')}
              >
                <CardHeader className="p-3 tablet:p-4 tablet-lg:p-6">
                  <div className="text-4xl tablet:text-5xl tablet-lg:text-6xl mb-2">📊</div>
                  <CardTitle className="text-base tablet:text-lg tablet-lg:text-xl">통합 통계</CardTitle>
                  <CardDescription className="text-xs tablet:text-sm">완료된 경기 통합 스탯</CardDescription>
                </CardHeader>
                <CardContent className="p-3 tablet:p-4 tablet-lg:p-6 pt-0">
                  <p className="text-2xl tablet:text-3xl font-bold text-purple-600">{completedGames.length}</p>
                  <p className="text-xs tablet:text-sm text-muted-foreground">개 완료 경기</p>
                </CardContent>
              </Card>

              {/* 배지 도감 카드 */}
              <Card
                className="cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105 bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200"
                onClick={() => setDashboardView('badges')}
              >
                <CardHeader className="p-3 tablet:p-4 tablet-lg:p-6">
                  <div className="text-4xl tablet:text-5xl tablet-lg:text-6xl mb-2">🏆</div>
                  <CardTitle className="text-base tablet:text-lg tablet-lg:text-xl">배지 도감</CardTitle>
                  <CardDescription className="text-xs tablet:text-sm">획득 가능한 모든 배지</CardDescription>
                </CardHeader>
                <CardContent className="p-3 tablet:p-4 tablet-lg:p-6 pt-0">
                  <p className="text-2xl tablet:text-3xl font-bold text-amber-600">📖</p>
                  <p className="text-xs tablet:text-sm text-muted-foreground">배지 컬렉션</p>
                </CardContent>
              </Card>

              {/* 설정 카드 (향후 구현) */}
              <Card className="cursor-not-allowed opacity-50 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardHeader className="p-3 tablet:p-4 tablet-lg:p-6">
                  <div className="text-4xl tablet:text-5xl tablet-lg:text-6xl mb-2">⚙️</div>
                  <CardTitle className="text-base tablet:text-lg tablet-lg:text-xl">설정</CardTitle>
                  <CardDescription className="text-xs tablet:text-sm">앱 설정 및 환경설정</CardDescription>
                </CardHeader>
                <CardContent className="p-3 tablet:p-4 tablet-lg:p-6 pt-0">
                  <p className="text-xs tablet:text-sm text-muted-foreground">준비 중...</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* 팀 관리 뷰 */}
        {dashboardView === 'teams' && (
          <div className="h-[calc(100vh-8rem)]">
            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => setDashboardView('dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 font-medium rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <span>←</span>
                <span>대시보드</span>
              </button>
              <h2 className="text-2xl font-bold text-foreground">👥 학급/팀 관리</h2>
              <div className="w-24"></div> {/* 중앙 정렬을 위한 spacer */}
            </div>
            <ClassTeamManagementView />
          </div>
        )}

        {/* 경기 관리 뷰 */}
        {dashboardView === 'games' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setDashboardView('dashboard')}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 font-medium rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <span>←</span>
                  <span>대시보드</span>
                </button>
                <h2 className="text-2xl font-bold text-foreground">⚾ 경기 관리</h2>
              </div>
              <Button
                onClick={() => setShowCreateGameModal(true)}
                size="lg"
                className="bg-green-100 hover:bg-green-200 text-green-700 border-green-200"
              >
                ⚾ 새 경기 시작
              </Button>
            </div>

            {/* 진행 중인 경기 섹션 */}
            <h2 className="text-2xl font-bold text-foreground mb-4">▶️ 진행 중인 경기</h2>
        {playingGames.length > 0 ? (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {playingGames.map((game) => (
                <Card
                  key={game.id}
                  className="hover:shadow-lg transition-all duration-200 border-green-300 bg-green-50"
                >
                  <CardHeader className="text-center">
                    <CardTitle className="text-lg text-black font-bold mb-1">
                      ⚾ {game.teamA.name} vs {game.teamB.name}
                    </CardTitle>
                    <CardDescription className="text-sm text-gray-700 font-medium">
                      📅 {game.createdAt && (() => {
                        try {
                          const createdAt = game.createdAt;
                          let timestamp;

                          if (typeof createdAt === 'string') {
                            timestamp = new Date(createdAt);
                          } else if (createdAt?.toMillis) {
                            timestamp = new Date(createdAt.toMillis());
                          } else if (createdAt?.seconds) {
                            timestamp = new Date(createdAt.seconds * 1000);
                          } else if (typeof createdAt === 'number') {
                            timestamp = new Date(createdAt);
                          } else {
                            timestamp = new Date();
                          }

                          const month = String(timestamp.getMonth() + 1).padStart(2, '0');
                          const day = String(timestamp.getDate()).padStart(2, '0');
                          const hours = String(timestamp.getHours()).padStart(2, '0');
                          const minutes = String(timestamp.getMinutes()).padStart(2, '0');

                          return `${month}/${day} ${hours}:${minutes}`;
                        } catch (e) {
                          return '시간 정보 없음';
                        }
                      })()}
                      {' • '}
                      ▶️ {game.currentInning}회 {game.isTopInning ? '초' : '말'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">{game.teamA.name}</div>
                        <div className="text-3xl font-bold text-blue-600">{game.scoreBoard.teamATotal}</div>
                      </div>
                      <div className="text-2xl font-bold text-muted-foreground">:</div>
                      <div className="text-center">
                        <div className="text-sm text-muted-foreground">{game.teamB.name}</div>
                        <div className="text-3xl font-bold text-red-600">{game.scoreBoard.teamBTotal}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setSelectedGameId(game.id)}
                        className="flex-1 bg-green-100 hover:bg-green-200 text-green-700 border-green-200"
                      >
                        경기 계속하기
                      </Button>
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteInProgressGame(game);
                        }}
                        size="sm"
                        className="bg-red-100 hover:bg-red-200 text-red-700 border-red-200"
                      >
                        🗑️
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-md p-10 text-center border-2 border-dashed border-green-200 mb-8">
            <div className="mb-4">
              <span className="text-7xl">🏟️</span>
            </div>
            <h3 className="text-xl font-bold text-gray-700 mb-2">
              진행 중인 경기가 없습니다
            </h3>
            <p className="text-gray-500 mb-4">
              새로운 경기를 시작해보세요!
            </p>
            <button
              onClick={() => setShowCreateGameModal(true)}
              className="px-6 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-full shadow-md hover:shadow-lg transition-all transform hover:scale-105"
            >
              ⚾ 경기 시작
            </button>
          </div>
        )}

            {/* 완료된 경기 섹션 */}
            <h2 className="text-2xl font-bold text-foreground mb-4">✔️ 완료된 경기</h2>
            {completedGames.length > 0 ? (
              <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                  <div></div>
                  <div className="flex gap-2">
                    <Button
                      onClick={handleToggleAllCompletedGames}
                      variant="outline"
                      size="sm"
                    >
                      {selectedCompletedGames.length === completedGames.length ? '전체 해제' : '전체 선택'}
                    </Button>
                    {selectedCompletedGames.length > 0 && (
                      <Button
                        onClick={handleDeleteSelectedGames}
                        size="sm"
                        className="bg-red-100 hover:bg-red-200 text-red-700 border-red-200"
                      >
                        🗑️ 삭제 ({selectedCompletedGames.length})
                      </Button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {completedGames.map((game) => (
                    <Card
                      key={game.id}
                      className={`hover:shadow-lg transition-all duration-200 border-red-200 ${
                        selectedCompletedGames.includes(game.id)
                          ? 'bg-red-100 border-red-300'
                          : 'bg-red-50'
                      }`}
                    >
                      <CardHeader>
                        <div className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            checked={selectedCompletedGames.includes(game.id)}
                            onChange={() => handleToggleCompletedGame(game.id)}
                            className="mt-2 w-4 h-4 cursor-pointer flex-shrink-0"
                          />
                          <div className="flex-1 text-center">
                            <CardTitle className="text-lg text-black font-bold mb-1">
                              ⚾ {game.teamA.name} vs {game.teamB.name}
                            </CardTitle>
                            <CardDescription className="text-sm text-gray-700 font-medium">
                              📅 {(game.finishedAt || game.createdAt) && (() => {
                                try {
                                  const finishedAt = game.finishedAt || game.createdAt;
                                  let timestamp;

                                  if (typeof finishedAt === 'string') {
                                    timestamp = new Date(finishedAt);
                                  } else if (finishedAt?.toMillis) {
                                    timestamp = new Date(finishedAt.toMillis());
                                  } else if (finishedAt?.seconds) {
                                    timestamp = new Date(finishedAt.seconds * 1000);
                                  } else if (typeof finishedAt === 'number') {
                                    timestamp = new Date(finishedAt);
                                  } else {
                                    timestamp = new Date();
                                  }

                                  const month = String(timestamp.getMonth() + 1).padStart(2, '0');
                                  const day = String(timestamp.getDate()).padStart(2, '0');
                                  const hours = String(timestamp.getHours()).padStart(2, '0');
                                  const minutes = String(timestamp.getMinutes()).padStart(2, '0');

                                  return `${month}/${day} ${hours}:${minutes}`;
                                } catch (e) {
                                  return '시간 정보 없음';
                                }
                              })()}
                              {' • '}
                              ✔️ 종료
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between mb-4">
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">{game.teamA.name}</div>
                            <div className="text-3xl font-bold text-blue-600">{game.scoreBoard.teamATotal}</div>
                          </div>
                          <div className="text-2xl font-bold text-muted-foreground">:</div>
                          <div className="text-center">
                            <div className="text-sm text-muted-foreground">{game.teamB.name}</div>
                            <div className="text-3xl font-bold text-red-600">{game.scoreBoard.teamBTotal}</div>
                          </div>
                        </div>
                        <Button
                          onClick={() => setSelectedGameId(game.id)}
                          variant="outline"
                          className="w-full"
                        >
                          경기 기록 보기
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-xl shadow-md p-10 text-center border-2 border-dashed border-gray-200 mb-8">
                <div className="mb-4">
                  <span className="text-7xl">📋</span>
                </div>
                <h3 className="text-xl font-bold text-gray-700 mb-2">
                  완료된 경기가 없습니다
                </h3>
                <p className="text-gray-500">
                  경기를 완료하면 여기에 기록이 저장됩니다
                </p>
              </div>
            )}
          </div>
        )}

        {/* 통계 뷰 */}
        {dashboardView === 'stats' && (
          <StatsView
            finishedGames={finishedGames}
            teams={teams}
            onBack={() => setDashboardView('dashboard')}
          />
        )}

        {/* 배지 도감 뷰 */}
        {dashboardView === 'badges' && (
          <div className="h-[calc(100vh-8rem)]">
            <BadgeCollection
              onBack={() => setDashboardView('dashboard')}
            />
          </div>
        )}

        {/* 팀 생성 다이얼로그 */}
        <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>새 팀 만들기</DialogTitle>
              <DialogDescription>
                새로운 팀을 만들어보세요. 팀 이름을 입력해주세요.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="team-name">팀 이름</Label>
                <Input
                  id="team-name"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="예: 5학년 1반"
                  onKeyPress={(e) => e.key === 'Enter' && handleCreateTeam()}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateModal(false);
                  setNewTeamName('');
                }}
              >
                취소 <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-gray-100 rounded border">ESC</kbd>
              </Button>
              <Button onClick={handleCreateTeam}>
                생성 <kbd className="ml-2 px-1.5 py-0.5 text-xs bg-blue-100 rounded border">Enter</kbd>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 팀 상세 모달 */}
        <TeamDetailModal
          open={showTeamDetail}
          onOpenChange={setShowTeamDetail}
          team={selectedTeam}
          onUpdateTeam={handleUpdateTeam}
          onOpenLineup={handleOpenLineup}
        />

        {/* 라인업 편성 모달 */}
        <LineupModal
          open={showLineup}
          onOpenChange={setShowLineup}
          team={selectedTeam}
          onSaveLineup={handleSaveLineup}
        />

        {/* 경기 생성 모달 */}
        <CreateGameModal
          open={showCreateGameModal}
          onOpenChange={setShowCreateGameModal}
          teams={teams}
          onCreateGame={handleCreateGame}
        />
      </main>
    </div>
  );
};

export default MainApp;
