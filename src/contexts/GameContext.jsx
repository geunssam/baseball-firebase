import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import firestoreService from '../services/firestoreService';

/**
 * GameContext
 *
 * FirestoreService를 React 컴포넌트에서 쉽게 사용할 수 있도록
 * Context API로 감싼 전역 상태 관리 시스템입니다.
 *
 * 제공하는 데이터:
 * - students: 학생 목록
 * - teams: 팀 목록
 * - games: 진행 중인 경기 목록
 * - playerBadges: 선수 배지 목록
 * - finishedGames: 종료된 경기 목록
 *
 * 제공하는 함수:
 * - createStudent, updateStudent, deleteStudent
 * - createTeam, updateTeam, deleteTeam
 * - createGame, updateGame, finishGame
 * - savePlayerBadges, getPlayerBadges
 * - getPlayerHistory, getFinishedGames
 */

const GameContext = createContext();

export const GameProvider = ({ children }) => {
  const { user: currentUser } = useAuth();

  // ============================================
  // 상태 관리
  // ============================================
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [teams, setTeams] = useState([]);
  const [games, setGames] = useState([]);
  const [playerBadges, setPlayerBadges] = useState([]);
  const [finishedGames, setFinishedGames] = useState([]);
  const [playerHistory, setPlayerHistory] = useState({}); // { playerId: [game1, game2, ...] }

  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('saved'); // 'saving' | 'saved' | 'error'

  // ============================================
  // 실시간 리스너 연결 (로그인 시 자동 실행)
  // ============================================
  useEffect(() => {
    if (!currentUser) {
      // 로그아웃 시 모든 데이터 초기화
      setClasses([]);
      setStudents([]);
      setTeams([]);
      setGames([]);
      setPlayerBadges([]);
      setFinishedGames([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    console.log('🚀 [GameContext] 리스너 연결 시작...');

    // 1. 학급 목록 실시간 동기화
    const unsubscribeClasses = firestoreService.subscribeToClasses((updatedClasses) => {
      console.log('🔄 [GameContext] 학급 목록 콜백 호출됨!', updatedClasses);
      setClasses(updatedClasses);
      console.log('🔄 [GameContext] 학급 목록 업데이트:', updatedClasses.length);
    });

    // 2. 학생 목록 실시간 동기화
    const unsubscribeStudents = firestoreService.subscribeToStudents((updatedStudents) => {
      console.log('🔄 [GameContext] 학생 목록 콜백 호출됨!', updatedStudents);
      setStudents(updatedStudents);
      console.log('🔄 [GameContext] 학생 목록 업데이트:', updatedStudents.length);
    });

    // 3. 팀 목록 실시간 동기화
    const unsubscribeTeams = firestoreService.subscribeToTeams((updatedTeams) => {
      console.log('🔄 [GameContext] 팀 목록 콜백 호출됨!', updatedTeams);
      // 각 팀의 players 상세 정보 출력
      updatedTeams.forEach(team => {
        console.log(`  📦 팀 "${team.name}" (${team.id}):`, {
          playerCount: team.players?.length || 0,
          players: team.players?.map(p => ({ id: p.id, name: p.name, battingOrder: p.battingOrder })) || []
        });
      });
      setTeams(updatedTeams);
      console.log('🔄 [GameContext] 팀 목록 업데이트:', updatedTeams.length);
    });

    // 4. 진행 중 경기 목록 실시간 동기화
    const unsubscribeGames = firestoreService.subscribeToGames((updatedGames) => {
      setGames(updatedGames);
      console.log('🔄 [GameContext] 경기 목록 업데이트:', updatedGames.length);
    });

    // 5. 종료된 경기 목록 실시간 동기화
    const unsubscribeFinishedGames = firestoreService.subscribeToFinishedGames((updatedFinishedGames) => {
      setFinishedGames(updatedFinishedGames);
      console.log('🔄 [GameContext] 종료된 경기 목록 업데이트:', updatedFinishedGames.length);
    });

    // 6. 초기 데이터 로드
    const loadInitialData = async () => {
      try {
        // 선수 배지 로드
        const badges = await firestoreService.getAllPlayerBadges();
        setPlayerBadges(badges);

        console.log('✅ [GameContext] 초기 데이터 로드 완료');
      } catch (error) {
        console.error('❌ [GameContext] 초기 데이터 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadInitialData();

    // 컴포넌트 언마운트 시 리스너 정리
    return () => {
      unsubscribeClasses();
      unsubscribeStudents();
      unsubscribeTeams();
      unsubscribeGames();
      unsubscribeFinishedGames();
      console.log('🧹 [GameContext] 리스너 정리 완료');
    };
  }, [currentUser]);

  // ============================================
  // 학급 관리 함수
  // ============================================

  const createClass = async (classData) => {
    try {
      setSaveStatus('saving');
      const classId = await firestoreService.createClass(classData);
      setSaveStatus('saved');
      return classId;
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  };

  const updateClass = async (classId, updates) => {
    try {
      setSaveStatus('saving');
      await firestoreService.updateClass(classId, updates);
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  };

  const deleteClass = async (classId) => {
    try {
      setSaveStatus('saving');
      await firestoreService.deleteClass(classId);
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  };

  // ============================================
  // 학생 관리 함수
  // ============================================

  const createStudent = async (studentData) => {
    try {
      setSaveStatus('saving');
      const studentId = await firestoreService.createStudent(studentData);
      setSaveStatus('saved');
      return studentId;
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  };

  const updateStudent = async (studentId, updates) => {
    try {
      setSaveStatus('saving');
      await firestoreService.updateStudent(studentId, updates);
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  };

  const deleteStudent = async (studentId) => {
    try {
      setSaveStatus('saving');
      await firestoreService.deleteStudent(studentId);
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  };

  // ============================================
  // 팀 관리 함수
  // ============================================

  const createTeam = async (teamData) => {
    try {
      setSaveStatus('saving');
      const teamId = await firestoreService.createTeam(teamData);
      setSaveStatus('saved');
      return teamId;
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  };

  const updateTeam = async (teamId, updates) => {
    try {
      setSaveStatus('saving');
      await firestoreService.updateTeam(teamId, updates);
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  };

  const deleteTeam = async (teamId) => {
    try {
      setSaveStatus('saving');
      await firestoreService.deleteTeam(teamId);
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  };

  // ============================================
  // 경기 관리 함수
  // ============================================

  const createGame = async (gameData) => {
    try {
      setSaveStatus('saving');
      const gameId = await firestoreService.createGame(gameData);
      setSaveStatus('saved');
      return gameId;
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  };

  const updateGame = async (gameId, updates) => {
    try {
      setSaveStatus('saving');
      await firestoreService.updateGame(gameId, updates);
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  };

  const finishGame = async (gameId, finalGameData) => {
    try {
      setSaveStatus('saving');
      await firestoreService.finishGame(gameId, finalGameData);

      // 종료된 경기 목록 새로고침
      const finished = await firestoreService.getFinishedGames(10);
      setFinishedGames(finished);

      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  };

  const deleteGame = async (gameId) => {
    try {
      setSaveStatus('saving');
      await firestoreService.deleteGame(gameId);
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  };

  const deleteInProgressGame = async (gameId, gameData) => {
    try {
      setSaveStatus('saving');
      await firestoreService.deleteInProgressGame(gameId, gameData);
      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  };

  // ============================================
  // 선수 배지 관리 함수
  // ============================================

  const savePlayerBadges = async (playerId, badgeData) => {
    try {
      setSaveStatus('saving');
      await firestoreService.savePlayerBadges(playerId, badgeData);

      // 배지 목록 새로고침
      const badges = await firestoreService.getAllPlayerBadges();
      setPlayerBadges(badges);

      setSaveStatus('saved');
    } catch (error) {
      setSaveStatus('error');
      throw error;
    }
  };

  const getPlayerBadges = async (playerId) => {
    try {
      return await firestoreService.getPlayerBadges(playerId);
    } catch (error) {
      console.error('❌ [GameContext] 선수 배지 로드 실패:', error);
      throw error;
    }
  };

  // ============================================
  // 선수 히스토리 함수
  // ============================================

  const getPlayerHistory = async (playerId) => {
    try {
      return await firestoreService.getPlayerHistory(playerId);
    } catch (error) {
      console.error('❌ [GameContext] 선수 히스토리 로드 실패:', error);
      throw error;
    }
  };

  const loadMoreFinishedGames = async (limitCount = 10) => {
    try {
      const finished = await firestoreService.getFinishedGames(limitCount);
      setFinishedGames(finished);
    } catch (error) {
      console.error('❌ [GameContext] 종료된 경기 로드 실패:', error);
      throw error;
    }
  };

  const loadGameHistory = async (gameId) => {
    try {
      // 경기의 모든 선수 ID 추출
      const game = games.find(g => g.id === gameId);
      if (!game) return;

      const allPlayerIds = [
        ...(game.teamA?.lineup || []).map(p => p.id || p.playerId),
        ...(game.teamB?.lineup || []).map(p => p.id || p.playerId)
      ].filter(Boolean);

      console.log(`🔄 ${allPlayerIds.length}명의 히스토리 로드 시작...`);

      // 병렬로 모든 선수의 히스토리 로드
      const historyMap = {};
      await Promise.all(
        allPlayerIds.map(async (id) => {
          const { games: history } = await firestoreService.getPlayerHistory(id);
          historyMap[id] = history || [];
        })
      );

      setPlayerHistory(historyMap);
      console.log('✅ 히스토리 로드 완료');
      return historyMap;
    } catch (error) {
      console.error('❌ 히스토리 로드 실패:', error);
      return {};
    }
  };

  // ============================================
  // Context 값
  // ============================================

  const value = {
    // 상태
    classes,
    students,
    teams,
    games,
    playerBadges,
    finishedGames,
    playerHistory,
    loading,
    saveStatus,

    // 학급 관리
    createClass,
    updateClass,
    deleteClass,

    // 학생 관리
    createStudent,
    updateStudent,
    deleteStudent,

    // 팀 관리
    createTeam,
    updateTeam,
    deleteTeam,

    // 경기 관리
    createGame,
    updateGame,
    finishGame,
    deleteGame,
    deleteInProgressGame,

    // 선수 배지
    savePlayerBadges,
    getPlayerBadges,

    // 선수 히스토리
    getPlayerHistory,
    loadGameHistory,
    loadMoreFinishedGames,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

// ============================================
// Custom Hook
// ============================================

/**
 * useGame Hook
 *
 * 컴포넌트에서 GameContext를 쉽게 사용하기 위한 Hook입니다.
 *
 * @example
 * const { students, teams, createStudent, createTeam, updateTeam } = useGame();
 */
export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return context;
};
