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
import StudentCodeListModal from './StudentCodeListModal';
import BadgeManagementModal from './BadgeManagementModal';
import ManualBadgeModal from './ManualBadgeModal';
import ClassRankingWidget from './ClassRankingWidget';
import ClassDetailRankingModal from './ClassDetailRankingModal';
import { useModalKeyboard } from '../hooks/useKeyboardShortcut';
import { BADGES } from '../utils/badgeSystem';
import { saveCustomBadge, loadCustomBadges, deleteCustomBadge, awardManualBadge, recalculateAllStudentBadges } from '../services/firestoreService';

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

  // 학생 코드 모달 상태
  const [showStudentCodeModal, setShowStudentCodeModal] = useState(false);

  // 경기 기록 모달 상태
  const [showGameRecordModal, setShowGameRecordModal] = useState(false);
  const [selectedRecordGameId, setSelectedRecordGameId] = useState(null);

  // 커스텀 배지 관련 상태
  const [customBadges, setCustomBadges] = useState([]);
  const [badgeOverrides, setBadgeOverrides] = useState({});
  const [hiddenBadges, setHiddenBadges] = useState([]);
  const [showBadgeManagement, setShowBadgeManagement] = useState(false);
  const [showManualBadgeModal, setShowManualBadgeModal] = useState(false);
  const [selectedStudentForBadge, setSelectedStudentForBadge] = useState(null);

  // 배지 재계산 상태
  const [isRecalculating, setIsRecalculating] = useState(false);
  const [recalculateProgress, setRecalculateProgress] = useState(null);

  // 학급 랭킹 관련 상태
  const [showClassDetailModal, setShowClassDetailModal] = useState(false);
  const [selectedClassData, setSelectedClassData] = useState(null);

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

  // 커스텀 배지 초기 로드
  useEffect(() => {
    if (user) {
      // 로컬스토리지에서 로드
      const savedBadges = localStorage.getItem('customBadges');
      if (savedBadges) {
        try {
          setCustomBadges(JSON.parse(savedBadges));
        } catch (error) {
          console.error('커스텀 배지 로드 실패:', error);
        }
      }

      const savedOverrides = localStorage.getItem('badgeOverrides');
      if (savedOverrides) {
        try {
          setBadgeOverrides(JSON.parse(savedOverrides));
        } catch (error) {
          console.error('배지 오버라이드 로드 실패:', error);
        }
      }

      const savedHidden = localStorage.getItem('hiddenBadges');
      if (savedHidden) {
        try {
          setHiddenBadges(JSON.parse(savedHidden));
        } catch (error) {
          console.error('숨긴 배지 로드 실패:', error);
        }
      }

      // Firebase에서 동기화 (선택)
      const syncFromFirebase = async () => {
        try {
          const firebaseBadges = await loadCustomBadges(user.uid);
          if (firebaseBadges.length > 0) {
            setCustomBadges(firebaseBadges);
            localStorage.setItem('customBadges', JSON.stringify(firebaseBadges));
          }
        } catch (error) {
          console.error('Firebase 동기화 실패:', error);
        }
      };
      syncFromFirebase();
    }
  }, [user]);

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

  // 배지 저장 핸들러
  const handleSaveBadge = async (badge) => {
    const isBasicBadge = badge.id && !badge.isCustom;

    if (isBasicBadge) {
      // 기본 배지 오버라이드 (아이콘/이름만)
      const newOverrides = {
        ...badgeOverrides,
        [badge.id]: { icon: badge.icon, name: badge.name }
      };
      setBadgeOverrides(newOverrides);
      localStorage.setItem('badgeOverrides', JSON.stringify(newOverrides));
      alert('✅ 배지가 수정되었습니다!');
    } else {
      // 커스텀 배지 저장
      const existingIndex = customBadges.findIndex(b => b.id === badge.id);
      let newBadges;

      if (existingIndex !== -1) {
        // 수정
        newBadges = customBadges.map(b => b.id === badge.id ? badge : b);
      } else {
        // 새로 추가
        newBadges = [...customBadges, badge];
      }

      setCustomBadges(newBadges);
      localStorage.setItem('customBadges', JSON.stringify(newBadges));

      // Firebase 저장 (선택)
      try {
        await saveCustomBadge(user.uid, badge);
        alert('✅ 커스텀 배지가 저장되었습니다!');
      } catch (error) {
        console.error('Firebase 저장 실패:', error);
        alert('⚠️ 배지 저장 중 오류가 발생했습니다.');
      }
    }
  };

  // 배지 삭제 핸들러
  const handleDeleteBadge = async (badgeId) => {
    const newBadges = customBadges.filter(b => b.id !== badgeId);
    setCustomBadges(newBadges);
    localStorage.setItem('customBadges', JSON.stringify(newBadges));

    // Firebase 삭제 (선택)
    try {
      await deleteCustomBadge(user.uid, badgeId);
      alert('✅ 배지가 삭제되었습니다.');
    } catch (error) {
      console.error('Firebase 삭제 실패:', error);
    }
  };

  // 배지 숨기기/표시 핸들러
  const handleHideBadge = (badgeId) => {
    const newHiddenBadges = hiddenBadges.includes(badgeId)
      ? hiddenBadges.filter(id => id !== badgeId)
      : [...hiddenBadges, badgeId];

    setHiddenBadges(newHiddenBadges);
    localStorage.setItem('hiddenBadges', JSON.stringify(newHiddenBadges));
  };

  // 배지 수동 부여 핸들러
  const handleAwardBadge = async (playerId, badgeId, note) => {
    try {
      await awardManualBadge(user.uid, playerId, badgeId, note);
      alert('✅ 배지를 부여했습니다!');
    } catch (error) {
      console.error('배지 부여 실패:', error);
      alert('❌ 배지 부여에 실패했습니다: ' + error.message);
    }
  };

  // 모든 학생 배지 재계산 핸들러
  const handleRecalculateAllBadges = async () => {
    if (!confirm('모든 학생의 배지를 재계산하시겠습니까?\n\n이 작업은 시간이 걸릴 수 있습니다.')) {
      return;
    }

    setIsRecalculating(true);
    setRecalculateProgress({ current: 0, total: 0, studentName: '' });

    try {
      const result = await recalculateAllStudentBadges(
        user.uid,
        (progress) => {
          setRecalculateProgress(progress);
        }
      );

      alert(`✅ 배지 재계산 완료!\n\n성공: ${result.success}명\n실패: ${result.failed}명\n총: ${result.total}명`);
      setRecalculateProgress(null);
    } catch (error) {
      console.error('배지 재계산 실패:', error);
      alert('❌ 배지 재계산에 실패했습니다: ' + error.message);
    } finally {
      setIsRecalculating(false);
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

  // 개별 완료된 경기 삭제 핸들러
  const handleDeleteCompletedGame = async (game) => {
    if (!confirm(`"${game.teamA.name} vs ${game.teamB.name}" 경기를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteGame(game.id);
      alert('✅ 경기가 삭제되었습니다.');
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* 상단 네비게이션 바 */}
      <nav className="bg-card shadow-lg border-b border-border">
        <div className="max-w-7xl mx-auto px-4 tablet:px-6 tablet-lg:px-8">
          <div className="flex justify-between items-center h-14 tablet:h-16 tablet-lg:h-20">
            {/* 좌측: 타이틀 */}
            <div className="flex items-center gap-2 tablet:gap-3">
              <span className="text-3xl tablet:text-4xl tablet-lg:text-5xl">⚾</span>
              <h1 className="text-xl tablet:text-3xl tablet-lg:text-4xl font-bold text-card-foreground">
                필드형 게임 마스터 보드
              </h1>
            </div>

            {/* 중앙: 날짜/시간 */}
            <div className="flex flex-1 justify-center">
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
              <Button
                onClick={() => setShowStudentCodeModal(true)}
                size="sm"
                className="bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200 text-sm tablet:text-base tablet-lg:text-lg"
              >
                📋 학생코드
              </Button>
              <Button
                onClick={() => setShowBadgeManagement(true)}
                size="sm"
                className="bg-purple-100 hover:bg-purple-200 text-purple-700 border-purple-200 text-sm tablet:text-base tablet-lg:text-lg"
              >
                ⚙️ 배지 관리
              </Button>
              <Button
                onClick={() => setDashboardView('classRanking')}
                size="sm"
                className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 border-yellow-200 text-sm tablet:text-base tablet-lg:text-lg"
              >
                🏆 학급 랭킹
              </Button>
              <Button onClick={signOut} size="sm" className="bg-red-100 hover:bg-red-200 text-red-700 border-red-200 text-sm tablet:text-base tablet-lg:text-lg">
                로그아웃
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-grow flex flex-col ${dashboardView === 'dashboard' ? 'justify-center' : ''}`}>
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
            <div className="grid grid-cols-2 tablet-lg:grid-cols-4 gap-3 tablet:gap-4 tablet-lg:gap-6">
              {/* 학급/팀 관리 카드 */}
              <Card
                className="cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 w-full h-[280px] flex-shrink-0"
                onClick={() => setDashboardView('teams')}
              >
                <CardContent className="p-6 tablet:p-8 tablet-lg:p-10 h-full flex flex-col justify-center items-center text-center gap-2 overflow-hidden !pt-6 tablet:!pt-8 tablet-lg:!pt-10">
                  {/* 제목 영역 - 가로 배치 */}
                  <div className="flex items-center justify-center gap-4 w-full">
                    <div className="text-5xl tablet:text-6xl tablet-lg:text-7xl">👥</div>
                    <div className="text-3xl tablet:text-4xl tablet-lg:text-5xl font-extrabold text-foreground">
                      학급 / 팀 관리
                    </div>
                  </div>

                  {/* 설명 */}
                  <p className="text-xl tablet:text-2xl tablet-lg:text-3xl font-bold text-gray-900">
                    학급 및 팀 설정, 학생 관리
                  </p>

                  {/* 통계 정보 - 배지 스타일 */}
                  <div className="flex flex-wrap gap-3 justify-center">
                    <span className="px-5 py-2.5 bg-blue-100/80 rounded-lg font-semibold text-blue-800 text-lg tablet:text-xl">
                      {new Set(students.map(s => s.className)).size}개 학급
                    </span>
                    <span className="px-5 py-2.5 bg-green-100/80 rounded-lg font-semibold text-green-800 text-lg tablet:text-xl">
                      {students.length}명 학생
                    </span>
                    <span className="px-5 py-2.5 bg-purple-100/80 rounded-lg font-semibold text-purple-800 text-lg tablet:text-xl">
                      {teams.length}개 팀
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 경기 관리 카드 */}
              <Card
                className="cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105 bg-gradient-to-br from-green-50 to-green-100 border-green-200 w-full h-[280px] flex-shrink-0"
                onClick={() => setDashboardView('games')}
              >
                <CardContent className="p-6 tablet:p-8 tablet-lg:p-10 h-full flex flex-col justify-center items-center text-center gap-2 overflow-hidden !pt-6 tablet:!pt-8 tablet-lg:!pt-10">
                  {/* 제목 영역 */}
                  <div className="flex items-center justify-center gap-4 w-full">
                    <div className="text-5xl tablet:text-6xl tablet-lg:text-7xl">⚾</div>
                    <div className="text-3xl tablet:text-4xl tablet-lg:text-5xl font-extrabold text-foreground">
                      경기 관리
                    </div>
                  </div>

                  {/* 설명 */}
                  <p className="text-xl tablet:text-2xl tablet-lg:text-3xl font-bold text-gray-900">
                    진행 중 및 완료된 경기
                  </p>

                  {/* 통계 정보 */}
                  <div className="flex flex-wrap gap-3 justify-center">
                    <span className="px-5 py-2.5 bg-green-100/80 rounded-lg font-semibold text-green-800 text-lg tablet:text-xl">
                      {playingGames.length}개 진행 중
                    </span>
                    <span className="px-5 py-2.5 bg-gray-100/80 rounded-lg font-semibold text-gray-800 text-lg tablet:text-xl">
                      {completedGames.length}개 완료
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 통계 카드 */}
              <Card
                className="cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 w-full h-[280px] flex-shrink-0"
                onClick={() => setDashboardView('stats')}
              >
                <CardContent className="p-6 tablet:p-8 tablet-lg:p-10 h-full flex flex-col justify-center items-center text-center gap-2 overflow-hidden !pt-6 tablet:!pt-8 tablet-lg:!pt-10">
                  {/* 제목 영역 */}
                  <div className="flex items-center justify-center gap-4 w-full">
                    <div className="text-5xl tablet:text-6xl tablet-lg:text-7xl">📊</div>
                    <div className="text-3xl tablet:text-4xl tablet-lg:text-5xl font-extrabold text-foreground">
                      통합 통계
                    </div>
                  </div>

                  {/* 설명 */}
                  <p className="text-xl tablet:text-2xl tablet-lg:text-3xl font-bold text-gray-900">
                    완료된 경기 통합 스탯
                  </p>

                  {/* 통계 정보 */}
                  <div className="flex flex-wrap gap-3 justify-center">
                    <span className="px-5 py-2.5 bg-purple-100/80 rounded-lg font-semibold text-purple-800 text-lg tablet:text-xl">
                      {completedGames.length}개 완료 경기
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* 배지 도감 카드 */}
              <Card
                className="cursor-pointer hover:shadow-xl transition-all duration-200 hover:scale-105 bg-gradient-to-br from-yellow-50 to-amber-100 border-yellow-200 w-full h-[280px] flex-shrink-0"
                onClick={() => setDashboardView('badges')}
              >
                <CardContent className="p-6 tablet:p-8 tablet-lg:p-10 h-full flex flex-col justify-center items-center text-center gap-2 overflow-hidden !pt-6 tablet:!pt-8 tablet-lg:!pt-10">
                  {/* 제목 영역 */}
                  <div className="flex items-center justify-center gap-4 w-full">
                    <div className="text-5xl tablet:text-6xl tablet-lg:text-7xl">🏆</div>
                    <div className="text-3xl tablet:text-4xl tablet-lg:text-5xl font-extrabold text-foreground">
                      배지 도감
                    </div>
                  </div>

                  {/* 설명 */}
                  <p className="text-xl tablet:text-2xl tablet-lg:text-3xl font-bold text-gray-900">
                    획득 가능한 모든 배지
                  </p>

                  {/* 통계 정보 */}
                  <div className="flex flex-wrap gap-3 justify-center">
                    <span className="px-5 py-2.5 bg-amber-100/80 rounded-lg font-semibold text-amber-800 text-lg tablet:text-xl">
                      📖 배지 컬렉션
                    </span>
                  </div>
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
              {playingGames.map((game) => {
                // 날짜/시간 파싱
                let dateTimeStr = '';
                let inningStr = '';

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

                  dateTimeStr = `${month}/${day} ${hours}:${minutes}`;
                  inningStr = `${game.currentInning}회 ${game.isTopInning ? '초' : '말'}`;
                } catch (e) {
                  dateTimeStr = '정보 없음';
                  inningStr = '-';
                }

                return (
                  <Card
                    key={game.id}
                    className="hover:shadow-lg transition-all duration-200 border-2 border-green-300 bg-green-50"
                  >
                    <CardHeader className="p-3">
                      <div className="flex flex-col gap-2">
                        {/* 첫 번째 줄: 팀명과 점수 (중앙 정렬) */}
                        <div className="flex items-center justify-center gap-2">
                          <span className="font-bold text-lg truncate" title={game.teamA?.name || '팀A'}>
                            {game.teamA?.name || '팀A'}
                          </span>
                          <span className="font-bold text-xl text-blue-600">
                            {game.scoreBoard?.teamATotal || 0}
                          </span>
                          <span className="text-gray-400 text-sm">:</span>
                          <span className="font-bold text-xl text-red-600">
                            {game.scoreBoard?.teamBTotal || 0}
                          </span>
                          <span className="font-bold text-lg truncate" title={game.teamB?.name || '팀B'}>
                            {game.teamB?.name || '팀B'}
                          </span>
                        </div>

                        {/* 두 번째 줄: 날짜/시간/이닝 + 버튼들 (가로 배치) */}
                        <div className="flex items-center justify-between gap-1">
                          {/* 날짜/시간/이닝 정보 */}
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <span className="inline-flex items-center gap-1">
                              <span>📅</span>
                              <span>{dateTimeStr.split(' ')[0]}</span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span>🕐</span>
                              <span>{dateTimeStr.split(' ')[1]}</span>
                            </span>
                            <span className="inline-flex items-center gap-1">
                              <span>▶️</span>
                              <span>{inningStr}</span>
                            </span>
                          </div>

                          {/* 버튼들 */}
                          <div className="flex gap-1.5 items-center">
                            <Button
                              onClick={() => setSelectedGameId(game.id)}
                              size="sm"
                              className="h-7 px-3 text-xs bg-green-100 hover:bg-green-200 text-green-700 border-green-200 font-semibold"
                            >
                              경기 계속하기
                            </Button>
                            <Button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteInProgressGame(game);
                              }}
                              size="sm"
                              className="h-7 px-2 text-xs bg-red-100 hover:bg-red-200 text-red-700 border-red-200"
                            >
                              🗑️
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
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
                  {completedGames.map((game) => {
                    // 날짜/시간 파싱
                    let dateTimeStr = '';
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

                      dateTimeStr = `${month}/${day} ${hours}:${minutes}`;
                    } catch (e) {
                      dateTimeStr = '정보 없음';
                    }

                    return (
                      <Card
                        key={game.id}
                        className={`hover:shadow-lg transition-all duration-200 border-2 ${
                          selectedCompletedGames.includes(game.id)
                            ? 'bg-red-100 border-red-400'
                            : 'bg-red-50 border-red-200'
                        }`}
                      >
                        <CardHeader className="p-3">
                          <div className="flex flex-col gap-2">
                            {/* 첫 번째 줄: 팀명과 점수 (중앙 정렬) */}
                            <div className="flex items-center justify-center gap-2">
                              <span className="font-bold text-lg truncate" title={game.teamA?.name || '팀A'}>
                                {game.teamA?.name || '팀A'}
                              </span>
                              <span className="font-bold text-xl text-blue-600">
                                {game.scoreBoard?.teamATotal || 0}
                              </span>
                              <span className="text-gray-400 text-sm">:</span>
                              <span className="font-bold text-xl text-red-600">
                                {game.scoreBoard?.teamBTotal || 0}
                              </span>
                              <span className="font-bold text-lg truncate" title={game.teamB?.name || '팀B'}>
                                {game.teamB?.name || '팀B'}
                              </span>
                            </div>

                            {/* 두 번째 줄: 날짜/시간 + 체크박스 + 버튼들 (가로 배치) */}
                            <div className="flex items-center justify-between gap-1">
                              {/* 왼쪽: 체크박스 + 날짜/시간 정보 */}
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedCompletedGames.includes(game.id)}
                                  onChange={() => handleToggleCompletedGame(game.id)}
                                  className="w-4 h-4 cursor-pointer flex-shrink-0"
                                />
                                <div className="flex items-center gap-2 text-sm text-gray-700">
                                  <span className="inline-flex items-center gap-1">
                                    <span>📅</span>
                                    <span>{dateTimeStr.split(' ')[0]}</span>
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <span>🕐</span>
                                    <span>{dateTimeStr.split(' ')[1]}</span>
                                  </span>
                                </div>
                              </div>

                              {/* 오른쪽: 버튼들 */}
                              <div className="flex gap-1.5 items-center">
                                <Button
                                  onClick={() => {
                                    setSelectedRecordGameId(game.id);
                                    setShowGameRecordModal(true);
                                  }}
                                  size="sm"
                                  className="h-7 px-3 text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 border-blue-200 font-semibold"
                                >
                                  기록 보기
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCompletedGame(game);
                                  }}
                                  size="sm"
                                  className="h-7 px-2 text-xs bg-red-100 hover:bg-red-200 text-red-700 border-red-200"
                                >
                                  🗑️
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    );
                  })}
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
          <div className="w-full h-[calc(100vh-4rem-3.5rem)]">
            <BadgeCollection
              onBack={() => setDashboardView('dashboard')}
              customBadges={customBadges}
              hiddenBadges={hiddenBadges}
            />
          </div>
        )}

        {/* 학급 랭킹 뷰 */}
        {dashboardView === 'classRanking' && (
          <div>
            <div className="flex justify-between items-center mb-6">
              <button
                onClick={() => setDashboardView('dashboard')}
                className="flex items-center gap-2 px-4 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 font-medium rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <span>←</span>
                <span>대시보드</span>
              </button>
              <h2 className="text-2xl font-bold text-foreground">🏆 학급별 랭킹</h2>
              <div className="w-24"></div>
            </div>

            <ClassRankingWidget
              teacherId={user?.uid}
              onClassClick={(classData) => {
                setSelectedClassData(classData);
                setShowClassDetailModal(true);
              }}
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

        {/* 학생 코드 목록 모달 */}
        <StudentCodeListModal
          open={showStudentCodeModal}
          onOpenChange={setShowStudentCodeModal}
        />

        {/* 배지 관리 모달 */}
        <BadgeManagementModal
          open={showBadgeManagement}
          onOpenChange={setShowBadgeManagement}
          customBadges={customBadges}
          systemBadges={Object.values(BADGES)}
          onSaveBadge={handleSaveBadge}
          onDeleteBadge={handleDeleteBadge}
          onHideBadge={handleHideBadge}
          hiddenBadges={hiddenBadges}
          onRecalculateAllBadges={handleRecalculateAllBadges}
          isRecalculating={isRecalculating}
          recalculateProgress={recalculateProgress}
        />

        {/* 수동 배지 부여 모달 */}
        <ManualBadgeModal
          open={showManualBadgeModal}
          onOpenChange={setShowManualBadgeModal}
          student={selectedStudentForBadge}
          allBadges={[...Object.values(BADGES), ...customBadges].filter(b => !hiddenBadges.includes(b.id))}
          ownedBadges={playerBadges[selectedStudentForBadge?.playerId] || []}
          onAwardBadge={handleAwardBadge}
        />

        {/* 학급 상세 랭킹 모달 */}
        <ClassDetailRankingModal
          open={showClassDetailModal}
          onOpenChange={setShowClassDetailModal}
          classData={selectedClassData}
          teacherId={user?.uid}
        />

        {/* 경기 기록 모달 */}
        <Dialog open={showGameRecordModal} onOpenChange={setShowGameRecordModal}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>경기 기록</DialogTitle>
              <DialogDescription>
                완료된 경기의 상세 기록을 확인할 수 있습니다.
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {selectedRecordGameId && (
                <StatsView
                  finishedGames={finishedGames.filter(g => g.id === selectedRecordGameId)}
                  teams={teams}
                  defaultTab="games"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      </main>

      {/* 하단 푸터 */}
      <footer className="bg-card shadow-lg border-t border-border sticky bottom-0 z-10">
        <div className="max-w-7xl mx-auto px-4 tablet:px-6 tablet-lg:px-8">
          <div className="flex justify-center items-center h-12 tablet:h-14">
            <p className="text-base tablet:text-lg tablet-lg:text-xl text-muted-foreground font-medium">
              ✨ Made By <span className="font-bold text-card-foreground">근쌤</span> ✨
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainApp;
