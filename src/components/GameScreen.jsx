import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../contexts/GameContext';
import firestoreService from '../services/firestoreService';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from './ui/dropdown-menu';
import { Settings } from 'lucide-react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import RunnerAdjustmentModal from './RunnerAdjustmentModal';
import RunnersLeftOnBaseModal from './RunnersLeftOnBaseModal';
import BadgePopup from './BadgePopup';
import BadgeProgressIndicator from './BadgeProgressIndicator';
import InningLineupChangeModal from './InningLineupChangeModal';
import PlayerBadgeOrderModal from './PlayerBadgeOrderModal';
import { checkNewBadges, calculatePlayerTotalStats, BADGES } from '../utils/badgeSystem';
import { getNextBadgesProgress } from '../utils/badgeProgress';
import { debugLog } from '../types/gameTypes';

/**
 * SortableAttackRow 컴포넌트
 * 드래그 가능한 공격팀 선수 행
 */
const SortableAttackRow = ({ player, index, isCurrentBatter, currentInning, children }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: player.id || player.name,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    height: '50px',
  };

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`
        border-b-2 border-black py-4
        ${isCurrentBatter
          ? 'bg-yellow-100 border-yellow-300 font-bold'
          : 'hover:bg-red-50'
        }
        ${isDragging ? 'opacity-50' : ''}
      `}
    >
      <td className="py-2 align-middle text-center">
        <div className="flex items-center justify-center gap-2">
          {/* 드래그 핸들 */}
          <span
            {...attributes}
            {...listeners}
            className="cursor-move text-gray-400 hover:text-gray-600 text-lg"
          >
            ⠿
          </span>
          <span className="font-bold">{player.battingOrder || index + 1}</span>
          {player.outInInning === currentInning && (
            <span className="text-[10px] text-red-600 font-bold bg-red-100 px-1 rounded">
              {currentInning}회OUT
            </span>
          )}
        </div>
      </td>
      {children}
    </tr>
  );
};

// 포지션 기본 옵션
const POSITION_OPTIONS = ['포수', '1루수', '2루수', '3루수', '자유수비', '외야수', '직접입력'];

/**
 * HitBadge 컴포넌트
 * 파스텔톤 안타 카드 배지
 */
const HitBadge = ({ hitType, showDelete = false, onDelete }) => {
  const colorMap = {
    '1루타': 'bg-green-50 border-green-300 text-green-700',
    '2루타': 'bg-blue-50 border-blue-300 text-blue-700',
    '3루타': 'bg-purple-50 border-purple-300 text-purple-700',
    '홈런': 'bg-amber-50 border-amber-300 text-amber-700'
  };

  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded border ${colorMap[hitType] || 'bg-gray-50 border-gray-300 text-gray-700'}`}>
      {hitType}
      {showDelete && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
          className="ml-0.5 text-red-500 hover:text-red-700 font-bold"
        >
          ×
        </button>
      )}
    </span>
  );
};

/**
 * GameScreen
 *
 * 경기 진행 화면
 * - 스코어보드
 * - 공격/수비 팀 라인업
 * - 타석 기록 패널
 * - 주자 상황 표시
 */
const GameScreen = ({ gameId, onExit }) => {
  const { games, updateGame, students, teams, playerHistory, loadGameHistory } = useGame();
  const [game, setGame] = useState(null);
  const [isFieldCollapsed, setIsFieldCollapsed] = useState(false);
  const [isControlCollapsed, setIsControlCollapsed] = useState(false);
  const [isAttackEditMode, setIsAttackEditMode] = useState(false);
  const [isDefenseEditMode, setIsDefenseEditMode] = useState(false);
  const [tempAttackLineup, setTempAttackLineup] = useState(null); // 공격팀 편집 중 임시 라인업
  const [currentDateTime, setCurrentDateTime] = useState(new Date()); // 현재 날짜/시간
  const [tempDefenseLineup, setTempDefenseLineup] = useState(null); // 수비팀 편집 중 임시 라인업
  const [activeId, setActiveId] = useState(null); // 드래그 중인 아이템 ID
  const [expandedHitRow, setExpandedHitRow] = useState(null); // 안타 추가 메뉴 확장된 행
  const [hitEditPlayerIndex, setHitEditPlayerIndex] = useState(null); // 안타 편집 모드 활성화된 선수 인덱스
  const [startInning, setStartInning] = useState(0); // 스코어보드 시작 이닝 (슬라이드 위치)
  const [inningCountInput, setInningCountInput] = useState(1); // 이닝 개수 입력
  const [isScoreboardExpanded, setIsScoreboardExpanded] = useState(false); // 스코어보드 확대 모달
  const [showRunnerModal, setShowRunnerModal] = useState(false); // 주자 조정 모달 표시 여부
  const [pendingRunners, setPendingRunners] = useState(null); // 모달에서 조정할 주자 정보 (자동 진루 후)
  const [pendingHomeRunners, setPendingHomeRunners] = useState([]); // 자동으로 홈에 가는 주자들
  const [originalRunners, setOriginalRunners] = useState(null); // 안타 치기 전 원래 주자 정보
  const [pendingGameData, setPendingGameData] = useState(null); // 모달 확인 전 임시 게임 데이터
  const [currentBatter, setCurrentBatter] = useState(null); // 현재 타자 정보 { name, playerIndex, hitType }

  // 잔루 관련 state
  const [showRunnersLeftModal, setShowRunnersLeftModal] = useState(false); // 잔루 확인 모달
  const [runnersLeftTeamName, setRunnersLeftTeamName] = useState(''); // 잔루 확인할 팀 이름
  const [runnersLeftData, setRunnersLeftData] = useState(null); // 잔루 데이터

  // 안타 상세 기록 접기/펼치기 상태
  const [isAllExpandedTeamA, setIsAllExpandedTeamA] = useState(false); // 팀A 전체 펼치기 여부
  const [isAllExpandedTeamB, setIsAllExpandedTeamB] = useState(false); // 팀B 전체 펼치기 여부
  const [expandedPlayersTeamA, setExpandedPlayersTeamA] = useState(new Set()); // 팀A 개별 펼침 선수 인덱스
  const [expandedPlayersTeamB, setExpandedPlayersTeamB] = useState(new Set()); // 팀B 개별 펼침 선수 인덱스
  const [showHitDetailModal, setShowHitDetailModal] = useState(false); // 타석 상세 기록 모달

  // 배지 시스템 상태
  const [newBadges, setNewBadges] = useState([]); // 새로 획득한 배지들
  const [showBadgePopup, setShowBadgePopup] = useState(false); // 배지 획득 팝업 표시 여부
  const badgePopupTimerRef = useRef(null); // 배지 팝업 자동 닫기 타이머
  const hasShownInitialBadgesRef = useRef(false); // 초기 배지 팝업 표시 여부 (중복 방지)

  // 선수 교체 상태
  const [replacingPlayerIndex, setReplacingPlayerIndex] = useState(null); // 교체 중인 선수 인덱스 (공격팀/수비팀 구분 필요)
  const [replacingTeam, setReplacingTeam] = useState(null); // 'attack' | 'defense'
  const [showPlayerReplaceModal, setShowPlayerReplaceModal] = useState(false); // 선수 교체 모달 표시 여부

  // 이닝별 라인업 전체 교체 상태
  const [showLineupChangeModal, setShowLineupChangeModal] = useState(false); // 라인업 전체 교체 모달
  const [lineupChangeTeamKey, setLineupChangeTeamKey] = useState(null); // 'teamA' | 'teamB'

  // 배지 관리 모달 상태
  const [showBadgeManageModal, setShowBadgeManageModal] = useState(false); // 배지 관리 모달 표시 여부
  const [selectedPlayerForBadgeId, setSelectedPlayerForBadgeId] = useState(null); // 배지 관리할 선수 ID

  // ✅ 선수 ID로 최신 선수 정보 동적 조회 (game 상태가 업데이트되면 자동으로 최신 값 반영)
  const getPlayerById = (playerId) => {
    if (!game || !playerId) return null;

    const playerInA = game.teamA.lineup.find(p => p.id === playerId);
    if (playerInA) return playerInA;

    const playerInB = game.teamB.lineup.find(p => p.id === playerId);
    return playerInB;
  };

  const selectedPlayerForBadge = getPlayerById(selectedPlayerForBadgeId);

  // 드래그 앤 드롭 센서 설정
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px 이동 후 드래그 시작 (클릭과 구분)
      },
    })
  );

  /**
   * 실시간 총 통계 계산 함수
   * 과거 히스토리 + 현재 경기 통계 + gamesPlayed에 현재 경기 +1
   */
  const calculateLiveTotalStats = (player) => {
    try {
      const playerId = player.id || player.playerId;
      if (!playerId) return null;

      // 메모리에서 과거 히스토리 가져오기 (동기)
      const history = playerHistory[playerId] || [];

      // 과거 통계 계산
      const pastStats = {
        totalHits: 0,
        totalRuns: 0,
        totalGoodDefense: 0,
        totalBonusCookie: 0,
        gamesPlayed: history.length,
        mvpCount: 0
      };

      history.forEach(game => {
        const stats = game.stats || {};
        pastStats.totalHits += stats.hits || 0;
        pastStats.totalRuns += stats.runs || 0;
        pastStats.totalGoodDefense += stats.goodDefense || 0;
        pastStats.totalBonusCookie += stats.bonusCookie || 0;
        if (game.isMVP) pastStats.mvpCount++;
      });

      // 현재 경기 통계
      const currentStats = player.stats || {};

      // 총 통계 = 과거 + 현재 (gamesPlayed +1 제거 - createGame에서 이미 추가됨)
      const totalStats = {
        totalHits: pastStats.totalHits + (currentStats.hits || 0),
        totalRuns: pastStats.totalRuns + (currentStats.runs || 0),
        totalGoodDefense: pastStats.totalGoodDefense + (currentStats.goodDefense || 0),
        totalBonusCookie: pastStats.totalBonusCookie + (currentStats.bonusCookie || 0),
        gamesPlayed: pastStats.gamesPlayed, // ✅ +1 제거 (createGame에서 이미 처리됨)
        mvpCount: pastStats.mvpCount
      };

      totalStats.totalPoints =
        totalStats.totalHits +
        totalStats.totalRuns +
        totalStats.totalGoodDefense +
        totalStats.totalBonusCookie;

      return totalStats;
    } catch (error) {
      console.error('❌ totalStats 계산 실패:', error);
      return null;
    }
  };

  // 게임 데이터 로드 및 선수 배지 로드
  // 현재 날짜/시간 업데이트
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let badgeCheckInterval;

    const loadGameWithBadges = async () => {
      const currentGame = games.find(g => g.id === gameId);
      if (!currentGame) return;

      try {
        // 모든 선수의 배지만 로드 (totalStats는 calculateLiveTotalStats가 동기로 처리)
        const loadBadgesForTeam = async (team) => {
          if (!team || !team.lineup) return team;

          console.log(`🔄 ${team.name} 팀 배지 로드 시작...`);

          const lineupWithBadges = await Promise.all(
            team.lineup.map(async (player) => {
              if (!player.id) return player;

              try {
                console.log(`  🔍 ${player.name} (${player.id}) 배지 로드...`);
                const badgeData = await firestoreService.getPlayerBadges(player.id);
                console.log(`    → 배지:`, badgeData);
                return {
                  ...player,
                  badges: badgeData.badges || []
                };
              } catch (error) {
                console.warn(`⚠️ ${player.name} 배지 로드 실패, 빈 배열로 초기화`, error);
                return { ...player, badges: [] };
              }
            })
          );

          console.log(`✅ ${team.name} 팀 배지 로드 완료 (${lineupWithBadges.length}명)`);

          return { ...team, lineup: lineupWithBadges };
        };

        const [teamAWithBadges, teamBWithBadges] = await Promise.all([
          loadBadgesForTeam(currentGame.teamA),
          loadBadgesForTeam(currentGame.teamB)
        ]);

        setGame({
          ...currentGame,
          teamA: teamAWithBadges,
          teamB: teamBWithBadges
        });

        console.log('✅ 게임 및 배지 로드 완료');

        // 즉시 playerHistory 로드 후 배지 체크 (setTimeout 제거)
        (async () => {
          try {
            // 1. 모든 선수의 히스토리를 메모리에 로드
            await loadGameHistory(gameId);
            console.log('📚 playerHistory 로드 완료');

            // 2. 배지 재로드 (배지 재계산이 완료된 상태)
            const [refreshedTeamA, refreshedTeamB] = await Promise.all([
              loadBadgesForTeam(currentGame.teamA),
              loadBadgesForTeam(currentGame.teamB)
            ]);

            // 3. 새로 획득한 배지 찾기
            const allNewBadges = [];

            // ✅ 새 경기인 경우: 출전 관련 모든 배지 체크 (첫 출전, 10경기, 30경기, 50경기, 100경기)
            if (currentGame.isNewGame && !hasShownInitialBadgesRef.current) {
              console.log('🆕 새 경기 감지! 출전 관련 배지 체크 시작...');

              // 양팀 선수 모두 체크
              const allPlayers = [...refreshedTeamA.lineup, ...refreshedTeamB.lineup];

              for (const player of allPlayers) {
                const playerId = player.id || player.playerId;
                if (!playerId) continue;

                const history = playerHistory[playerId] || [];

                // 현재 경기를 포함한 총 경기 수 (isNewGame이므로 현재 경기는 이미 포함됨)
                const totalGames = history.length;

                debugLog('BADGE_CHECK', `${player.name}: 총 ${totalGames}경기 출전`, { playerId, history: history.length });

                // 출전 관련 배지 체크 (실제 BADGES ID 사용)
                const gameBadgesToCheck = [
                  { id: 'first_game', games: 1, name: '첫 출전' },
                  { id: 'iron_man', games: 10, name: '철인' },
                  { id: 'immortal', games: 30, name: '불멸의 선수' }
                ];

                for (const badgeInfo of gameBadgesToCheck) {
                  // 해당 경기 수를 정확히 달성했고, 아직 배지가 없는 경우
                  if (totalGames === badgeInfo.games && !player.badges?.includes(badgeInfo.id)) {
                    const badge = BADGES[badgeInfo.id];
                    if (badge) {
                      console.log(`🎽 ${player.name}: ${badgeInfo.name} 배지 획득! (${totalGames}경기)`);

                      // 배지 즉시 수여
                      try {
                        await firestoreService.savePlayerBadges(playerId, {
                          badges: [...(player.badges || []), badgeInfo.id],
                          playerName: player.name
                        });

                        // UI에 표시할 배지 목록에 추가
                        allNewBadges.push({
                          ...badge,
                          playerName: player.name
                        });

                        // 플레이어 객체에도 배지 추가 (UI 즉시 반영)
                        player.badges = [...(player.badges || []), badgeInfo.id];
                      } catch (error) {
                        console.error(`❌ ${player.name} ${badgeInfo.name} 배지 저장 실패:`, error);
                      }
                    }
                  }
                }
              }

            } else {
              // 기존 경기: 배지 비교 로직 (기존 코드 유지)
              refreshedTeamA.lineup.forEach((player, idx) => {
                const oldBadges = teamAWithBadges.lineup[idx]?.badges || [];
                const newBadges = player.badges || [];

                const badgesToShow = newBadges.filter(b => !oldBadges.includes(b));

                if (badgesToShow.length > 0) {
                  console.log(`🔍 팀A ${player.name} 새 배지 발견:`, badgesToShow, '(기존:', oldBadges, ')');
                  badgesToShow.forEach(badgeId => {
                    const badge = Object.values(BADGES).find(b => b.id === badgeId);
                    if (badge) {
                      allNewBadges.push({
                        ...badge,
                        playerName: player.name
                      });
                    }
                  });
                }
              });

              refreshedTeamB.lineup.forEach((player, idx) => {
                const oldBadges = teamBWithBadges.lineup[idx]?.badges || [];
                const newBadges = player.badges || [];

                const badgesToShow = newBadges.filter(b => !oldBadges.includes(b));

                if (badgesToShow.length > 0) {
                  console.log(`🔍 팀B ${player.name} 새 배지 발견:`, badgesToShow, '(기존:', oldBadges, ')');
                  badgesToShow.forEach(badgeId => {
                    const badge = Object.values(BADGES).find(b => b.id === badgeId);
                    if (badge) {
                      allNewBadges.push({
                        ...badge,
                        playerName: player.name
                      });
                    }
                  });
                }
              });
            }

            // 4. 새 배지가 있으면 즉시 모달 표시
            if (allNewBadges.length > 0 && !hasShownInitialBadgesRef.current) {
              console.log('🎉 새 배지 발견:', allNewBadges);
              setNewBadges(allNewBadges);
              setShowBadgePopup(true);
              hasShownInitialBadgesRef.current = true; // 표시했음을 기록

              // 5초 후 자동 닫기 타이머 설정
              if (badgePopupTimerRef.current) {
                clearTimeout(badgePopupTimerRef.current);
              }
              badgePopupTimerRef.current = setTimeout(() => {
                setShowBadgePopup(false);
                setNewBadges([]);
              }, 5000);

              // ✅ 새 경기 플래그 제거 (Firestore 업데이트)
              if (currentGame.isNewGame) {
                console.log('🔄 isNewGame 플래그 제거 중...');
                updateGame(gameId, { isNewGame: false }).catch(err => {
                  console.warn('⚠️ isNewGame 플래그 제거 실패:', err);
                });
              }
            } else if (allNewBadges.length === 0) {
              console.log('✨ 새로 획득한 배지 없음');
            }

            // 5. 배지 업데이트
            setGame({
              ...currentGame,
              teamA: refreshedTeamA,
              teamB: refreshedTeamB
            });
          } catch (err) {
            console.warn('⚠️ 배지 재로드 실패:', err);
          }
        })();

      } catch (error) {
        console.error('❌ 배지 로드 실패:', error);
        setGame(currentGame); // 실패 시 배지 없이 게임만 로드
      }
    };

    loadGameWithBadges();

    return () => {
      if (badgeCheckInterval) clearInterval(badgeCheckInterval);
    };
  }, [games, gameId]);

  // 현재 이닝에 맞춰 스코어보드 슬라이드 자동 이동
  useEffect(() => {
    if (!game) return;
    const MAX_VISIBLE_INNINGS = 5;

    // 끝에서 5개를 표시하되, 현재 이닝이 보이도록
    const endInning = Math.min(
      Math.max(game.currentInning + 2, MAX_VISIBLE_INNINGS),
      game.innings
    );
    const newStartInning = Math.max(0, endInning - MAX_VISIBLE_INNINGS);

    setStartInning(newStartInning);
  }, [game?.currentInning, game?.innings]);

  // 공격 팀 전환 시 잔루 자동 복원
  useEffect(() => {
    if (!game) return;

    const restoreSavedRunners = async () => {
      const currentAttackTeam = game.isTopInning ? game.teamA : game.teamB;

      // 저장된 잔루가 있는지 확인
      if (currentAttackTeam.savedRunners) {
        const savedRunners = currentAttackTeam.savedRunners;
        const hasRunners = savedRunners.first || savedRunners.second || savedRunners.third;

        if (hasRunners) {
          console.log(`📦 ${currentAttackTeam.name} 잔루 복원:`, savedRunners);

          try {
            // 주자 복원
            await updateGame(game.id, {
              runners: savedRunners,
              [`${game.isTopInning ? 'teamA' : 'teamB'}.savedRunners`]: null // 복원 후 삭제
            });

            // 알림 표시
            const runnersList = [];
            if (savedRunners.first) runnersList.push(`1루: ${savedRunners.first.name}`);
            if (savedRunners.second) runnersList.push(`2루: ${savedRunners.second.name}`);
            if (savedRunners.third) runnersList.push(`3루: ${savedRunners.third.name}`);

            alert(`📦 ${currentAttackTeam.name} 잔루 복원\n\n${runnersList.join('\n')}`);
          } catch (error) {
            console.error('❌ 잔루 복원 실패:', error);
          }
        }
      }
    };

    restoreSavedRunners();
  }, [game?.isTopInning]); // isTopInning이 바뀔 때만 실행

  // 공수교대 핸들러
  const handleSwitchTeams = async () => {
    if (!game) return;

    // 현재 공격팀 확인
    const currentAttackTeam = game.isTopInning ? game.teamA : game.teamB;

    // 주자가 있으면 잔루 확인 모달 띄우기
    const hasRunners = game.runners?.first || game.runners?.second || game.runners?.third;

    if (hasRunners) {
      setRunnersLeftTeamName(currentAttackTeam.name);
      setRunnersLeftData(game.runners);
      setShowRunnersLeftModal(true);
    } else {
      // 주자 없으면 바로 공수교대
      await executeSwitchTeams(false);
    }
  };

  // 실제 공수교대 실행
  const executeSwitchTeams = async (saveRunners) => {
    if (!game) return;

    try {
      const currentAttackTeam = game.isTopInning ? 'teamA' : 'teamB';
      const updates = {
        isTopInning: !game.isTopInning,
      };

      // 잔루 허용 시 savedRunners에 저장
      if (saveRunners && runnersLeftData) {
        updates[`${currentAttackTeam}.savedRunners`] = runnersLeftData;
        console.log(`📦 ${runnersLeftTeamName} 잔루 저장:`, runnersLeftData);
      } else {
        updates[`${currentAttackTeam}.savedRunners`] = null;
      }

      // 주자 초기화
      updates.runners = { first: null, second: null, third: null };

      await updateGame(game.id, updates);
      console.log(`✅ 공수교대: ${!game.isTopInning ? '초' : '말'}공으로 전환`);

      setShowRunnersLeftModal(false);
      setRunnersLeftData(null);
      setRunnersLeftTeamName('');
    } catch (error) {
      console.error('❌ 공수교대 실패:', error);
      alert('공수교대에 실패했습니다.');
    }
  };

  // 이닝 변경 핸들러 (이닝별 자동 라인업 교체 포함)
  const handleChangeInning = async (delta) => {
    if (!game) return;

    const newInning = game.currentInning + delta;

    // 1회 미만이나 설정한 이닝 초과 방지
    if (newInning < 1 || newInning > game.innings) {
      alert(`이닝은 1회부터 ${game.innings}회까지만 가능합니다.`);
      return;
    }

    try {
      const updates = {
        currentInning: newInning,
      };

      // 이닝별 라인업 설정 확인 및 자동 교체
      const teamAConfig = game.teamA.inningLineups?.[newInning];
      const teamBConfig = game.teamB.inningLineups?.[newInning];

      if (teamAConfig || teamBConfig) {
        console.log(`🔄 ${newInning}회 라인업 자동 교체 시작...`);

        // 팀 A 라인업 교체
        if (teamAConfig) {
          const team = teams.find(t => t.id === teamAConfig.teamId);
          if (team && team.players) {
            const newLineup = team.players.map((player, index) => ({
              id: player.id || player.playerId,
              playerId: player.id || player.playerId,
              name: player.name,
              position: player.position || '선수',
              battingOrder: index + 1,
              outInInning: null,
              badges: player.badges || [], // 배지 정보 포함
              stats: {
                hits: 0, single: 0, double: 0, triple: 0, homerun: 0,
                runs: 0, bonusCookie: 0, goodDefense: 0
              },
              hitDetails: []
            }));
            updates['teamA.lineup'] = newLineup;
            updates['teamA.id'] = team.id;       // 팀 ID 업데이트
            updates['teamA.name'] = team.name;   // 팀 이름 업데이트
            console.log(`✅ 팀 A 슬롯을 "${teamAConfig.teamName}"으로 교체 (ID: ${team.id})`);
          }
        }

        // 팀 B 라인업 교체
        if (teamBConfig) {
          const team = teams.find(t => t.id === teamBConfig.teamId);
          if (team && team.players) {
            const newLineup = team.players.map((player, index) => ({
              id: player.id || player.playerId,
              playerId: player.id || player.playerId,
              name: player.name,
              position: player.position || '선수',
              battingOrder: index + 1,
              outInInning: null,
              badges: player.badges || [], // 배지 정보 포함
              stats: {
                hits: 0, single: 0, double: 0, triple: 0, homerun: 0,
                runs: 0, bonusCookie: 0, goodDefense: 0
              },
              hitDetails: []
            }));
            updates['teamB.lineup'] = newLineup;
            updates['teamB.id'] = team.id;       // 팀 ID 업데이트
            updates['teamB.name'] = team.name;   // 팀 이름 업데이트
            console.log(`✅ 팀 B 슬롯을 "${teamBConfig.teamName}"으로 교체 (ID: ${team.id})`);
          }
        }

        // 타자 인덱스 초기화
        updates.currentBatterIndex = 0;
      }

      await updateGame(game.id, updates);
      console.log(`✅ 이닝 변경: ${newInning}회로 이동`);

      if (teamAConfig || teamBConfig) {
        alert(`✅ ${newInning}회 라인업이 자동으로 교체되었습니다!`);
      }
    } catch (error) {
      console.error('❌ 이닝 변경 실패:', error);
      alert('이닝 변경에 실패했습니다.');
    }
  };

  // 경기 종료 핸들러
  const handleEndGame = async () => {
    if (!game) return;

    if (!confirm('경기를 종료하시겠습니까?\n(종료 후에도 기록은 확인 가능합니다)')) {
      return;
    }

    try {
      // 경기 종료 및 선수 히스토리 저장
      const finalGameData = {
        ...game,
        teamA: {
          ...game.teamA,
          lineup: game.teamA.lineup.map(player => ({
            ...player,
            // newBadges 정보 포함하여 경기 기록에 저장
            newBadges: player.newBadges || []
          })),
          players: game.teamA.lineup.map(player => ({
            playerId: player.playerId || player.id,
            name: player.name,
            stats: player.stats || {
              hits: 0,
              single: 0,
              double: 0,
              triple: 0,
              homerun: 0,
              runs: 0,
              bonusCookie: 0,
              goodDefense: 0
            }
          }))
        },
        teamB: {
          ...game.teamB,
          lineup: game.teamB.lineup.map(player => ({
            ...player,
            // newBadges 정보 포함하여 경기 기록에 저장
            newBadges: player.newBadges || []
          })),
          players: game.teamB.lineup.map(player => ({
            playerId: player.playerId || player.id,
            name: player.name,
            stats: player.stats || {
              hits: 0,
              single: 0,
              double: 0,
              triple: 0,
              homerun: 0,
              runs: 0,
              bonusCookie: 0,
              goodDefense: 0
            }
          }))
        },
        status: 'completed',
        completedAt: new Date()
      };

      await firestoreService.finishGame(game.id, finalGameData);
      console.log('✅ 경기가 종료되고 선수 기록이 저장되었습니다.');
      alert('✅ 경기가 종료되었습니다.');
      onExit?.();
    } catch (error) {
      console.error('❌ 경기 종료 실패:', error);
      alert('❌ 경기 종료에 실패했습니다.');
    }
  };

  // 이닝 추가 핸들러
  const handleAddInning = async (count = 1) => {
    if (!confirm(`이닝을 ${count}회 추가하시겠습니까?`)) return;

    try {
      const newGame = { ...game };
      for (let i = 0; i < count; i++) {
        newGame.innings++;
        newGame.scoreBoard.teamA.push(0);
        newGame.scoreBoard.teamB.push(0);
      }

      await updateGame(game.id, newGame);
      alert(`✅ 이닝이 추가되었습니다! (총 ${newGame.innings}회)`);
    } catch (error) {
      console.error('❌ 이닝 추가 실패:', error);
      alert('❌ 이닝 추가에 실패했습니다.');
    }
  };

  // 라인업 전체 교체 모달 열기
  const handleOpenLineupChange = (teamKey) => {
    setLineupChangeTeamKey(teamKey);
    setShowLineupChangeModal(true);
  };

  // 라인업 전체 교체 확인
  const handleConfirmLineupChange = async (teamKey, newLineup, changeInfo) => {
    if (!game) return;

    try {
      const updates = {
        [`${teamKey}.lineup`]: newLineup,
        [`${teamKey}.name`]: changeInfo.teamName, // 팀 이름도 업데이트
        [`${teamKey}.id`]: changeInfo.teamId, // 팀 ID도 업데이트
        currentBatterIndex: 0,
        runners: { first: null, second: null, third: null }
      };

      await updateGame(game.id, updates);
      console.log(`✅ ${changeInfo.teamName}으로 라인업 교체 완료`);
      alert(`✅ ${changeInfo.teamName}으로 라인업이 교체되었습니다!`);
      setShowLineupChangeModal(false);
    } catch (error) {
      console.error('❌ 라인업 교체 실패:', error);
      alert('❌ 라인업 교체에 실패했습니다.');
    }
  };

  // 선수 이름 클릭 시 배지 관리 모달 열기
  const handlePlayerNameClick = async (player) => {
    try {
      // 1. Firestore에서 최신 배지 정보 로드
      const playerId = player.id || player.playerId;
      console.log(`🔍 ${player.name} (${playerId}) 배지 로드 시도...`);

      const badgeData = await firestoreService.getPlayerBadges(playerId);
      console.log(`  → 배지 데이터:`, badgeData);

      // 🔥 2. game 상태를 업데이트해서 최신 배지 정보 반영
      const newGame = { ...game };
      const teamA_idx = newGame.teamA.lineup.findIndex(p => p.id === playerId);
      const teamB_idx = newGame.teamB.lineup.findIndex(p => p.id === playerId);

      if (teamA_idx >= 0) {
        newGame.teamA.lineup[teamA_idx].badges = badgeData?.badges || [];
        console.log(`  → 팀A 선수 배지 업데이트: ${badgeData?.badges?.length || 0}개`);
      } else if (teamB_idx >= 0) {
        newGame.teamB.lineup[teamB_idx].badges = badgeData?.badges || [];
        console.log(`  → 팀B 선수 배지 업데이트: ${badgeData?.badges?.length || 0}개`);
      }

      // 🔥 3. 상태 업데이트 (모달 열기 전에 game 상태 먼저 업데이트)
      setGame(newGame);

      // 4. 모달 열기
      setSelectedPlayerForBadgeId(playerId);
      setShowBadgeManageModal(true);
    } catch (error) {
      console.error('❌ 배지 로드 실패:', error);
      // 실패해도 모달은 열기 (현재 배지로)
      setSelectedPlayerForBadgeId(playerId);
      setShowBadgeManageModal(true);
    }
  };

  // 배지 관리 모달 닫기
  const handleBadgeManageModalClose = () => {
    setShowBadgeManageModal(false);
    setSelectedPlayerForBadgeId(null);
  };

  // 배지 순서 저장
  const handleBadgeOrderSave = async (newBadgeOrder) => {
    if (!selectedPlayerForBadge || !game) return;

    console.log('📥 [배지순서] 저장 요청 받음:', newBadgeOrder);
    console.log('📥 [배지순서] 선수:', selectedPlayerForBadge.name);

    try {
      const playerId = selectedPlayerForBadge.id;
      const newGame = { ...game };

      // player.id로 teamA와 teamB에서 선수 찾기
      const teamA_idx = newGame.teamA.lineup.findIndex(p => p.id === playerId);
      const teamB_idx = newGame.teamB.lineup.findIndex(p => p.id === playerId);

      if (teamA_idx >= 0) {
        newGame.teamA.lineup[teamA_idx].badges = newBadgeOrder;
        debugLog('배지', `✅ ${selectedPlayerForBadge.name}의 배지 순서 업데이트 (팀A)`);
      } else if (teamB_idx >= 0) {
        newGame.teamB.lineup[teamB_idx].badges = newBadgeOrder;
        debugLog('배지', `✅ ${selectedPlayerForBadge.name}의 배지 순서 업데이트 (팀B)`);
      }

      // ✅ 먼저 로컬 상태 업데이트 (즉시 UI 반영)
      setGame(newGame);
      console.log('📥 [배지순서] 로컬 상태 업데이트 완료');

      // 🔥 Firestore의 playerBadges 컬렉션도 업데이트 (순서 저장)
      await firestoreService.savePlayerBadges(playerId, {
        badges: newBadgeOrder
      });
      console.log('📥 [배지순서] playerBadges 컬렉션 업데이트 완료');

      // ✅ 그 다음 게임 상태 Firestore에 저장
      await updateGame(game.id, newGame);
      console.log('📥 [배지순서] 게임 상태 Firestore 저장 완료');

      handleBadgeManageModalClose();
    } catch (error) {
      console.error('❌ [배지순서] 저장 실패:', error);
      alert('❌ 배지 순서 저장에 실패했습니다.');
      throw error; // ✅ 에러를 상위로 전파
    }
  };

  // 이닝 삭제 핸들러
  const handleRemoveInning = async (count = 1) => {
    if (game.innings - count < 1) {
      alert('⚠️ 최소 1이닝은 필요합니다.');
      return;
    }
    if (game.currentInning > game.innings - count) {
      alert('⚠️ 현재 진행 중인 이닝 이후의 이닝만 삭제할 수 있습니다.');
      return;
    }
    if (!confirm(`마지막 ${count}개 이닝을 삭제하시겠습니까?`)) return;

    try {
      const newGame = { ...game };
      for (let i = 0; i < count; i++) {
        newGame.innings--;
        newGame.scoreBoard.teamA.pop();
        newGame.scoreBoard.teamB.pop();
      }

      await updateGame(game.id, newGame);
      alert(`✅ 이닝이 삭제되었습니다! (총 ${newGame.innings}회)`);
    } catch (error) {
      console.error('❌ 이닝 삭제 실패:', error);
      alert('❌ 이닝 삭제에 실패했습니다.');
    }
  };

  // ============================================
  // 편집 모드 핸들러
  // ============================================

  // 공격팀 편집 모드 토글
  const handleToggleAttackEditMode = async () => {
    if (!isAttackEditMode) {
      // 편집 모드 시작: 현재 라인업을 임시 상태로 복사
      const attackTeam = game.isTopInning ? game.teamA : game.teamB;
      setTempAttackLineup([...attackTeam.lineup]);
      setIsAttackEditMode(true);
    } else {
      // 편집 모드 종료 (완료): Firebase에 저장
      await handleSaveAttackLineup();
    }
  };

  // 공격팀 편집 완료 (Firebase 저장)
  const handleSaveAttackLineup = async () => {
    if (!tempAttackLineup || !game) return;

    try {
      const attackTeam = game.isTopInning ? game.teamA : game.teamB;
      const updatedTeam = {
        ...attackTeam,
        lineup: tempAttackLineup
      };

      const newGame = { ...game };
      if (game.isTopInning) {
        newGame.teamA = updatedTeam;
      } else {
        newGame.teamB = updatedTeam;
      }

      await updateGame(game.id, newGame);
      console.log('✅ 공격팀 라인업 저장 완료');

      // 편집 모드 종료
      setIsAttackEditMode(false);
      setTempAttackLineup(null);
    } catch (error) {
      console.error('❌ 공격팀 라인업 저장 실패:', error);
      alert('라인업 저장에 실패했습니다.');
    }
  };

  // 수비팀 편집 모드 토글
  const handleToggleDefenseEditMode = async () => {
    if (!isDefenseEditMode) {
      // 편집 모드 시작: 현재 라인업을 임시 상태로 복사
      const defenseTeam = game.isTopInning ? game.teamB : game.teamA;
      setTempDefenseLineup([...defenseTeam.lineup]);
      setIsDefenseEditMode(true);
    } else {
      // 편집 모드 종료 (완료): Firebase에 저장
      await handleSaveDefenseLineup();
    }
  };

  // 드래그 시작
  const handleDragStart = (event) => {
    setActiveId(event.active.id);
  };

  // 드래그 종료 (타순 재배치)
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id || !tempAttackLineup) return;

    const oldIndex = tempAttackLineup.findIndex((p) => (p.id || p.name) === active.id);
    const newIndex = tempAttackLineup.findIndex((p) => (p.id || p.name) === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    // 타순 재배치
    const reorderedLineup = arrayMove(tempAttackLineup, oldIndex, newIndex);

    // 타순 번호 재할당 (0부터 순서대로)
    const lineupWithNewOrder = reorderedLineup.map((player, index) => ({
      ...player,
      battingOrder: index,
    }));

    setTempAttackLineup(lineupWithNewOrder);
  };

  // 수비팀 포지션 변경 핸들러
  const handlePositionChange = (playerIndex, newPosition) => {
    if (!tempDefenseLineup) return;

    const updatedLineup = [...tempDefenseLineup];
    updatedLineup[playerIndex] = {
      ...updatedLineup[playerIndex],
      position: newPosition
    };
    setTempDefenseLineup(updatedLineup);
  };

  // 수비팀 편집 완료 (Firebase 저장)
  const handleSaveDefenseLineup = async () => {
    if (!tempDefenseLineup || !game) return;

    try {
      const defenseTeam = game.isTopInning ? game.teamB : game.teamA;
      const updatedTeam = {
        ...defenseTeam,
        lineup: tempDefenseLineup
      };

      const newGame = { ...game };
      if (game.isTopInning) {
        newGame.teamB = updatedTeam;
      } else {
        newGame.teamA = updatedTeam;
      }

      await updateGame(game.id, newGame);
      console.log('✅ 수비팀 라인업 저장 완료');

      // 편집 모드 종료
      setIsDefenseEditMode(false);
      setTempDefenseLineup(null);
    } catch (error) {
      console.error('❌ 수비팀 라인업 저장 실패:', error);
      alert('라인업 저장에 실패했습니다.');
    }
  };

  // 주자 수동 이동 핸들러 (하이브리드 방식의 수동 조정 기능)
  const handleRunnerMove = async (fromBase, toBase) => {
    if (game.status === 'completed') {
      alert('⚠️ 완료된 경기는 수정할 수 없습니다.');
      return;
    }

    const newGame = { ...game };
    const isTeamA = game.isTopInning;
    const team = isTeamA ? newGame.teamA : newGame.teamB;
    const runners = newGame.runners || { first: null, second: null, third: null };

    // 이동할 주자 정보
    const runner = runners[fromBase];
    if (!runner) {
      console.error('주자가 없습니다.');
      return;
    }

    // 원래 위치에서 제거
    runners[fromBase] = null;

    // 새 위치로 이동
    if (toBase === 'home') {
      // 득점 처리
      if (runner.playerIndex !== undefined) {
        const scoredPlayer = team.lineup[runner.playerIndex];
        if (scoredPlayer && scoredPlayer.stats) {
          scoredPlayer.stats.runs = (scoredPlayer.stats.runs || 0) + 1;
        }
      }

      // 팀 스코어 증가
      const scoreKey = `score${isTeamA ? 'A' : 'B'}`;
      newGame[scoreKey] = (newGame[scoreKey] || 0) + 1;

      console.log(`✅ ${runner.name} 득점! 현재 스코어: ${newGame[scoreKey]}`);
    } else if (toBase === 'out') {
      // 아웃 처리 (선택적 기능)
      console.log(`❌ ${runner.name} 아웃`);
      // 필요시 아웃 카운트 증가 로직 추가 가능
    } else {
      // 다른 베이스로 이동
      runners[toBase] = runner;
      console.log(`📍 ${runner.name} ${fromBase}→${toBase} 이동`);
    }

    newGame.runners = runners;

    try {
      await updateGame(game.id, newGame);
      console.log(`✅ 주자 이동 완료`);
    } catch (error) {
      console.error('❌ 주자 이동 실패:', error);
      alert('주자 이동에 실패했습니다.');
    }
  };

  // 아웃 카운트 변경 핸들러
  const handleChangeOuts = async (delta) => {
    if (!game) return;

    try {
      const newGame = { ...game };
      const newOuts = Math.max(0, Math.min(3, (newGame.currentOuts || 0) + delta));
      newGame.currentOuts = newOuts;

      await updateGame(game.id, newGame);
      console.log(`✅ 아웃: ${newOuts}`);
    } catch (error) {
      console.error('❌ 아웃 업데이트 실패:', error);
      alert('아웃 업데이트에 실패했습니다.');
    }
  };

  // 스트라이크 카운트 변경 핸들러
  const handleChangeStrikes = async (delta) => {
    if (!game) return;

    console.log(`🎯 [스트라이크] 함수 호출: delta=${delta}, 현재=${game.currentStrikes || 0}`);

    try {
      const newGame = { ...game };
      const currentStrikes = newGame.currentStrikes || 0;

      // 스트라이크 2에서 +를 누르면 아웃 처리
      if (currentStrikes === 2 && delta === 1) {
        console.log(`⚡ [삼진아웃] 조건 충족! 아웃 처리 시작...`);

        const attackTeam = newGame.isTopInning ? newGame.teamA : newGame.teamB;
        const currentBatterIndex = newGame.currentBatterIndex || 0;
        const currentBatter = attackTeam.lineup[currentBatterIndex];

        if (currentBatter) {
          // 현재 타자에게 아웃 기록
          currentBatter.outInInning = newGame.currentInning;
          currentBatter.stats = currentBatter.stats || { hits: 0, single: 0, double: 0, triple: 0, homerun: 0, runs: 0, bonusCookie: 0, goodDefense: 0 };

          console.log(`⚾ ${currentBatter.name} 삼진아웃! (${newGame.currentInning}회)`);
        }

        // 아웃 카운트 증가
        const newOuts = (newGame.currentOuts || 0) + 1;
        newGame.currentOuts = newOuts;

        // 스트라이크 초기화
        newGame.currentStrikes = 0;

        // 다음 타자로 이동
        const nextBatterIndex = (currentBatterIndex + 1) % attackTeam.lineup.length;
        newGame.currentBatterIndex = nextBatterIndex;

        console.log(`📊 [삼진아웃] 아웃: ${newOuts}, 다음 타자 인덱스: ${nextBatterIndex}`);

        // ✅ 먼저 로컬 상태를 즉시 업데이트하여 UI 반영 (다음 타자 하이라이트)
        setGame(newGame);
        console.log(`🔄 로컬 상태 즉시 업데이트: 다음 타자 인덱스=${nextBatterIndex}`);

        // Firestore에도 저장
        await updateGame(game.id, newGame);

        console.log(`✅ 삼진아웃 처리 완료`);
        alert(`⚾ ${currentBatter?.name || '타자'} 삼진아웃!\n\n현재 아웃: ${newOuts}\n다음 타자: ${attackTeam.lineup[nextBatterIndex]?.name || '?'}`);
        return;
      }

      // 일반 스트라이크 카운트 변경
      const newStrikes = Math.max(0, Math.min(2, currentStrikes + delta));
      newGame.currentStrikes = newStrikes;

      console.log(`📊 [스트라이크] ${currentStrikes} → ${newStrikes}`);

      await updateGame(game.id, newGame);
      console.log(`✅ 스트라이크 업데이트 완료: ${newStrikes}`);
    } catch (error) {
      console.error('❌ 스트라이크 업데이트 실패:', error);
      alert('스트라이크 업데이트에 실패했습니다.');
    }
  };

  // 타격 아웃 핸들러 (공을 쳤으나 아웃된 경우: 플라이, 땅볼 등)
  const handleBattedOut = async () => {
    if (!game) return;

    console.log('⚾ [타격 아웃] 함수 호출');

    try {
      const newGame = { ...game };
      const attackTeam = newGame.isTopInning ? newGame.teamA : newGame.teamB;
      const currentBatterIndex = newGame.currentBatterIndex || 0;
      const currentBatter = attackTeam.lineup[currentBatterIndex];

      if (currentBatter) {
        // 현재 타자에게 아웃 기록 (이닝 정보 저장)
        currentBatter.outInInning = newGame.currentInning;
        currentBatter.stats = currentBatter.stats || { hits: 0, single: 0, double: 0, triple: 0, homerun: 0, runs: 0, bonusCookie: 0, goodDefense: 0 };

        console.log(`⚾ ${currentBatter.name} 타격 아웃! (${newGame.currentInning}회)`);
      }

      // 아웃 카운트 증가
      const newOuts = (newGame.currentOuts || 0) + 1;
      newGame.currentOuts = newOuts;

      // 스트라이크 초기화
      newGame.currentStrikes = 0;

      // 다음 타자로 이동
      const nextBatterIndex = (currentBatterIndex + 1) % attackTeam.lineup.length;
      newGame.currentBatterIndex = nextBatterIndex;

      console.log(`📊 [타격 아웃] 아웃: ${newOuts}, 다음 타자 인덱스: ${nextBatterIndex}`);

      // ✅ 먼저 로컬 상태를 즉시 업데이트하여 UI 반영 (다음 타자 하이라이트)
      setGame(newGame);
      console.log(`🔄 로컬 상태 즉시 업데이트: 다음 타자 인덱스=${nextBatterIndex}`);

      // Firestore에도 저장
      await updateGame(game.id, newGame);

      console.log(`✅ 타격 아웃 처리 완료`);
      alert(`⚾ ${currentBatter?.name || '타자'} 타격 아웃!\n\n현재 아웃: ${newOuts}\n다음 타자: ${attackTeam.lineup[nextBatterIndex]?.name || '?'}`);
    } catch (error) {
      console.error('❌ 타격 아웃 처리 실패:', error);
      alert('타격 아웃 처리에 실패했습니다.');
    }
  };

  // [삭제됨] handleHit 함수 - 사용하지 않음 (handleAddHit + 모달 방식으로 대체)

  // 선수 교체 함수
  const handleReplacePlayer = async (team, playerIndex, newStudentId) => {
    // 선택된 학생 찾기
    const newStudent = students.find(s => s.id === newStudentId);
    if (!newStudent) {
      alert('선택한 학생을 찾을 수 없습니다.');
      return;
    }

    // ✅ 현재 공격/수비팀 구분 (isTopInning 기준)
    const isAttackTeam = team === 'attack';
    const targetTeam = isAttackTeam
      ? (game.isTopInning ? 'teamA' : 'teamB')
      : (game.isTopInning ? 'teamB' : 'teamA');

    const lineup = game[targetTeam].lineup;

    // 이미 라인업에 있는지 확인
    if (lineup.some(p => p.id === newStudentId)) {
      alert(`${newStudent.name}은(는) 이미 라인업에 있습니다.`);
      return;
    }

    // 기존 선수 정보 가져오기
    const oldPlayer = lineup[playerIndex];

    // 새 선수 객체 생성 (기존 선수의 타순과 포지션 유지)
    const newPlayer = {
      id: newStudent.id,
      name: newStudent.name,
      className: newStudent.className,
      battingOrder: oldPlayer.battingOrder,
      position: oldPlayer.position,
      stats: { hits: 0, single: 0, double: 0, triple: 0, homerun: 0, runs: 0, bonusCookie: 0, goodDefense: 0 },
      hitDetails: [],
      badges: []
    };

    // 게임 데이터 업데이트
    const newGame = { ...game };
    newGame[targetTeam].lineup[playerIndex] = newPlayer;

    // 임시 라인업 업데이트
    if (isAttackTeam) {
      setTempAttackLineup(newGame[targetTeam].lineup);
    } else {
      setTempDefenseLineup(newGame[targetTeam].lineup);
    }

    // ✅ Firestore에 즉시 반영
    try {
      await updateGame(game.id, newGame);
      setGame(newGame);
      console.log(`✅ 선수 교체 완료: ${oldPlayer.name} → ${newStudent.name} (${targetTeam})`);
    } catch (error) {
      console.error('❌ 선수 교체 실패:', error);
      alert('선수 교체에 실패했습니다.');
      return;
    }

    // 교체 모드 종료
    setReplacingPlayerIndex(null);
    setReplacingTeam(null);
  };

  // 선수 스탯 업데이트 함수 (득점, 쿠키, 수비용)
  const handleUpdatePlayerStat = async (isTeamA, playerIndex, statName, delta) => {
    // 완료된 경기는 수정 불가
    if (game.status === 'completed') {
      alert('⚠️ 완료된 경기는 기록을 수정할 수 없습니다.');
      return;
    }

    // 1. 게임 데이터 복사 (불변성 유지)
    const newGame = { ...game };

    // 2. 팀 선택 (공격팀 vs 수비팀)
    const team = isTeamA ? newGame.teamA : newGame.teamB;
    const player = team.lineup[playerIndex];

    // 3. stats 객체 초기화 (없을 경우 대비)
    if (!player.stats) {
      player.stats = { hits: 0, single: 0, double: 0, triple: 0, homerun: 0, runs: 0, bonusCookie: 0, goodDefense: 0 };
    }

    // 4. 새 값 계산 (0 이하로 내려가지 않도록)
    const oldValue = player.stats[statName] || 0;
    const newValue = Math.max(0, oldValue + delta);
    player.stats[statName] = newValue;

    // 5. 득점 변경 시 스코어보드 자동 업데이트
    if (statName === 'runs') {
      // 현재 이닝의 해당 팀 총 득점 계산
      const totalRunsThisInning = team.lineup.reduce((sum, p) =>
        sum + (p.stats?.runs || 0), 0
      );

      // 스코어보드의 현재 이닝 점수 업데이트
      const inningIndex = newGame.currentInning - 1;
      if (isTeamA) {
        newGame.scoreBoard.teamA[inningIndex] = totalRunsThisInning;
        newGame.scoreBoard.teamATotal = newGame.scoreBoard.teamA.reduce((a, b) => a + b, 0);
      } else {
        newGame.scoreBoard.teamB[inningIndex] = totalRunsThisInning;
        newGame.scoreBoard.teamBTotal = newGame.scoreBoard.teamB.reduce((a, b) => a + b, 0);
      }

      console.log(`📊 스코어보드 업데이트: ${newGame.currentInning}회 ${totalRunsThisInning}점`);
    }

    // 6. Firestore에 업데이트
    try {
      await updateGame(game.id, newGame);
      console.log(`✅ ${player.name}의 ${statName} ${delta > 0 ? '증가' : '감소'}: ${newValue}`);

      // 7. 증가한 경우에만 배지 체크 (감소는 배지 X)
      if (delta > 0) {
        await checkAndAwardBadges(player);
      }
    } catch (error) {
      console.error('❌ 스탯 업데이트 실패:', error);
      alert('스탯 업데이트에 실패했습니다.');
    }
  };

  // 안타 추가 핸들러 (주자 자동 이동 포함)
  const handleAddHit = async (playerIndex, hitType) => {
    if (game.status === 'completed') {
      alert('⚠️ 완료된 경기는 기록을 수정할 수 없습니다.');
      return;
    }

    const newGame = { ...game };
    const isTeamA = game.isTopInning;
    const team = isTeamA ? newGame.teamA : newGame.teamB;
    const batter = team.lineup[playerIndex];

    // stats 초기화
    if (!batter.stats) {
      batter.stats = { hits: 0, single: 0, double: 0, triple: 0, homerun: 0, runs: 0, bonusCookie: 0, goodDefense: 0 };
    }

    // currentGameHits 초기화
    if (!batter.currentGameHits) {
      batter.currentGameHits = [];
    }

    // 안타 기록 추가
    batter.currentGameHits.push(hitType);

    // 안타 스탯 증가
    batter.stats.hits += 1;

    // 안타 종류별 스탯 증가
    if (hitType === '1루타') batter.stats.single += 1;
    else if (hitType === '2루타') batter.stats.double += 1;
    else if (hitType === '3루타') batter.stats.triple += 1;
    else if (hitType === '홈런') batter.stats.homerun += 1;

    // 안타 기록 후 배지 체크
    checkAndAwardBadges(batter);

    // === 주자 이동 로직 (간단한 N루타 = N루씩 전진) ===
    const currentRunners = newGame.runners || { first: null, second: null, third: null };
    // 안타 치기 전 원래 주자 저장 (득점 계산용) - 깊은 복사
    const beforeHitRunners = {
      first: currentRunners.first ? { ...currentRunners.first } : null,
      second: currentRunners.second ? { ...currentRunners.second } : null,
      third: currentRunners.third ? { ...currentRunners.third } : null
    };
    const newRunners = { first: null, second: null, third: null };
    const autoHomeRunners = []; // 자동으로 홈에 가는 주자들

    // ⚠️ 기존 주자만 이동, 타자는 모달에서 선택
    if (hitType === '홈런') {
      // 홈런: 모든 주자 홈으로
      if (currentRunners.third) autoHomeRunners.push({ ...currentRunners.third, fromBase: 'third' });
      if (currentRunners.second) autoHomeRunners.push({ ...currentRunners.second, fromBase: 'second' });
      if (currentRunners.first) autoHomeRunners.push({ ...currentRunners.first, fromBase: 'first' });
      // 타자는 홈으로 미리 보내지 않음 (모달에서 선택)
      newGame.runners = { first: null, second: null, third: null };

    } else if (hitType === '3루타') {
      // 3루타: 기존 모든 주자 홈 (타자는 제외)
      if (currentRunners.third) autoHomeRunners.push({ ...currentRunners.third, fromBase: 'third' });
      if (currentRunners.second) autoHomeRunners.push({ ...currentRunners.second, fromBase: 'second' });
      if (currentRunners.first) autoHomeRunners.push({ ...currentRunners.first, fromBase: 'first' });
      // 타자는 베이스에 배치하지 않음 (모달에서 선택)
      newGame.runners = newRunners;

    } else if (hitType === '2루타') {
      // 2루타: 3루/2루 → 홈, 1루 → 3루 (타자는 제외)
      if (currentRunners.third) autoHomeRunners.push({ ...currentRunners.third, fromBase: 'third' });
      if (currentRunners.second) autoHomeRunners.push({ ...currentRunners.second, fromBase: 'second' });
      if (currentRunners.first) {
        newRunners.third = currentRunners.first;
      }
      // 타자는 베이스에 배치하지 않음 (모달에서 선택)
      newGame.runners = newRunners;

    } else if (hitType === '1루타') {
      // 1루타: 3루 → 홈, 2루 → 3루, 1루 → 2루 (타자는 제외)
      if (currentRunners.third) autoHomeRunners.push({ ...currentRunners.third, fromBase: 'third' });
      if (currentRunners.second) {
        newRunners.third = currentRunners.second;
      }
      if (currentRunners.first) {
        newRunners.second = currentRunners.first;
      }
      // 타자는 베이스에 배치하지 않음 (모달에서 선택)
      newGame.runners = newRunners;
    }

    // 주자 이동 로그
    const runnerStatus = [];
    if (newGame.runners.first) runnerStatus.push(`1루: ${newGame.runners.first.name}`);
    if (newGame.runners.second) runnerStatus.push(`2루: ${newGame.runners.second.name}`);
    if (newGame.runners.third) runnerStatus.push(`3루: ${newGame.runners.third.name}`);
    if (runnerStatus.length > 0) {
      console.log(`📍 자동 진루 후 주자 상황: ${runnerStatus.join(', ')}`);
    } else {
      console.log(`📍 주자 없음`);
    }

    // 임시 게임 데이터 저장 및 모달 오픈
    setPendingGameData(newGame);
    setOriginalRunners(beforeHitRunners); // 안타 치기 전 원래 주자
    setPendingRunners(newGame.runners); // 자동 진루 후 주자
    setPendingHomeRunners(autoHomeRunners); // 자동으로 홈에 가는 주자들
    setCurrentBatter({ name: batter.name, playerIndex, hitType }); // 현재 타자 정보
    setShowRunnerModal(true);

    // 인라인 메뉴 닫기
    setExpandedHitRow(null);
  };

  /**
   * 배지 체크 및 획득 처리
   * @param {Object} player - 체크할 선수 객체
   */
  const checkAndAwardBadges = async (player) => {
    if (!player) return;

    // 🔍 학생 실제 ID 찾기 (이름과 반으로 매칭)
    let actualStudent;

    // 1차 시도: 이름 + 반으로 매칭
    if (player.className) {
      actualStudent = students.find(s =>
        s.name === player.name && s.className === player.className
      );
    }

    // 2차 시도: 이름만으로 매칭 (반 정보가 없거나 1차 매칭 실패 시)
    if (!actualStudent) {
      actualStudent = students.find(s => s.name === player.name);
    }

    if (!actualStudent) {
      console.warn(`⚠️ 배지 수여 실패: students에서 "${player.name}" 학생을 찾을 수 없습니다.`);
      console.log('📋 현재 students 목록:', students.map(s => ({ name: s.name, className: s.className, id: s.id })));
      return;
    }

    const actualStudentId = actualStudent.id;
    console.log(`🔍 배지 체크: ${player.name} | 라인업 ID: ${player.id} | 실제 학생 ID: ${actualStudentId}`);

    // ✨ 전체 누적 통계 계산 (과거 히스토리 + 현재 경기 스탯)
    let totalStats = {};
    try {
      const { games: history = [] } = await firestoreService.getPlayerHistory(actualStudentId);

      // 1. 과거 경기 통계 계산
      const pastStats = calculatePlayerTotalStats(history);
      debugLog('BADGE_CHECK', `${player.name} 과거 통계`, pastStats);

      // 2. 현재 경기 스탯 추가
      const currentStats = player.stats || {};

      // 3. 과거 + 현재 합산
      totalStats = {
        totalHits: pastStats.totalHits + (currentStats.hits || 0),
        totalRuns: pastStats.totalRuns + (currentStats.runs || 0),
        totalHomerun: (pastStats.totalHomerun || 0) + (currentStats.homerun || 0),
        totalGoodDefense: pastStats.totalGoodDefense + (currentStats.goodDefense || 0),
        totalBonusCookie: pastStats.totalBonusCookie + (currentStats.bonusCookie || 0),
        totalPoints: pastStats.totalPoints + (currentStats.hits || 0) + (currentStats.runs || 0) + (currentStats.goodDefense || 0) + (currentStats.bonusCookie || 0),
        gamesPlayed: pastStats.gamesPlayed + 1, // 현재 경기 포함
        mvpCount: pastStats.mvpCount || 0,
        hasPerfectGame: pastStats.hasPerfectGame || false
      };

      console.log(`📊 ${player.name} 전체 통계 (과거+현재):`, totalStats);
      debugLog('BADGE_CHECK', `현재 경기 스탯`, currentStats);

      // 선수 객체에 totalStats 저장 (프로그레스 바에서 사용)
      player.totalStats = totalStats;
    } catch (error) {
      console.warn(`⚠️ ${player.name} 전체 통계 계산 실패:`, error);
      // Fallback: 현재 경기 통계만 사용
      const currentStats = player.stats || {};
      totalStats = {
        totalHits: currentStats.hits || 0,
        totalRuns: currentStats.runs || 0,
        totalHomerun: currentStats.homerun || 0,
        totalGoodDefense: currentStats.goodDefense || 0,
        totalBonusCookie: currentStats.bonusCookie || 0,
        totalPoints: (currentStats.hits || 0) + (currentStats.runs || 0) + (currentStats.goodDefense || 0) + (currentStats.bonusCookie || 0),
        gamesPlayed: 1,
        mvpCount: 0,
        hasPerfectGame: false
      };
      player.totalStats = totalStats;
    }

    // 기존 배지 목록
    const currentBadges = player.badges || [];

    // 새로운 배지 체크 (전체 통계 기반)
    const earnedBadges = checkNewBadges(totalStats, currentBadges);

    if (earnedBadges.length > 0) {
      console.log(`🏅 ${player.name} 새 배지 획득:`, earnedBadges.map(b => b.name));

      // 획득한 배지 ID 목록
      const newBadgeIds = earnedBadges.map(b => b.id);
      const updatedBadges = [...currentBadges, ...newBadgeIds];

      // 🎯 Firestore에 배지 저장 - 실제 학생 ID 사용!
      try {
        await firestoreService.savePlayerBadges(actualStudentId, {
          badges: updatedBadges,
          playerName: player.name
        });
        console.log(`✅ ${player.name} 배지 Firestore 저장 완료 (ID: ${actualStudentId}):`, newBadgeIds);

        // 선수 객체에도 배지 업데이트 (UI 즉시 반영)
        player.badges = updatedBadges;

        // React 재렌더링 트리거 (프로그레스 바 즉시 반영)
        setGame(prev => ({ ...prev }));

        // 배지 팝업 표시 (학생 이름 포함)
        const badgesWithPlayerName = earnedBadges.map(badge => ({
          ...badge,
          playerName: player.name
        }));
        setNewBadges(prev => [...(prev || []), ...badgesWithPlayerName]);
        setShowBadgePopup(true);

        // 5초 후 자동 닫기 타이머 설정
        if (badgePopupTimerRef.current) {
          clearTimeout(badgePopupTimerRef.current);
        }
        badgePopupTimerRef.current = setTimeout(() => {
          setShowBadgePopup(false);
          setNewBadges([]);
        }, 5000);
      } catch (error) {
        console.error(`❌ ${player.name} 배지 저장 실패:`, error);
      }
    }
  };

  // 주자 조정 모달 확인 핸들러
  const handleRunnerModalConfirm = async (adjustedRunners, batterStatus) => {
    if (!pendingGameData) {
      console.error('임시 게임 데이터가 없습니다.');
      return;
    }

    const newGame = { ...pendingGameData };
    const isTeamA = newGame.isTopInning;
    const team = isTeamA ? newGame.teamA : newGame.teamB;

    // 타자가 아웃으로 변경된 경우 안타 스탯 롤백
    if (batterStatus === 'out' && currentBatter) {
      const batter = team.lineup[currentBatter.playerIndex];
      if (batter && batter.stats) {
        console.log(`⚠️ ${currentBatter.name} 아웃으로 변경 - 안타 스탯 롤백`);

        // 안타 스탯 감소
        batter.stats.hits = Math.max(0, (batter.stats.hits || 0) - 1);

        // 안타 종류별 스탯 감소
        if (currentBatter.hitType === '1루타') batter.stats.single = Math.max(0, (batter.stats.single || 0) - 1);
        else if (currentBatter.hitType === '2루타') batter.stats.double = Math.max(0, (batter.stats.double || 0) - 1);
        else if (currentBatter.hitType === '3루타') batter.stats.triple = Math.max(0, (batter.stats.triple || 0) - 1);
        else if (currentBatter.hitType === '홈런') batter.stats.homerun = Math.max(0, (batter.stats.homerun || 0) - 1);

        // currentGameHits에서도 제거
        if (batter.currentGameHits && batter.currentGameHits.length > 0) {
          const lastIndex = batter.currentGameHits.lastIndexOf(currentBatter.hitType);
          if (lastIndex !== -1) {
            batter.currentGameHits.splice(lastIndex, 1);
          }
        }

        console.log(`✅ 스탯 롤백 완료: ${currentBatter.name}`);
      }
    }

    // 조정된 주자 상황과 원래 주자 상황 비교하여 득점 계산
    const beforeHitRunners = originalRunners; // 안타 치기 전 원래 주자
    let runsScored = 0;
    const scoredRunners = [];

    console.log('🔍 득점 계산 시작');
    console.log('  안타 전 주자:', beforeHitRunners);
    console.log('  조정 후 주자:', adjustedRunners);
    console.log('  현재 타자:', currentBatter);

    // 원래 있던 모든 주자를 확인하여 현재 어떤 베이스에도 없으면 득점으로 간주
    const allOriginalRunners = [];
    if (beforeHitRunners?.third) allOriginalRunners.push({ ...beforeHitRunners.third, base: 'third' });
    if (beforeHitRunners?.second) allOriginalRunners.push({ ...beforeHitRunners.second, base: 'second' });
    if (beforeHitRunners?.first) allOriginalRunners.push({ ...beforeHitRunners.first, base: 'first' });

    // ✅ 타자도 득점 계산 대상에 추가 (홈런 타자 득점 누락 방지)
    if (currentBatter) {
      allOriginalRunners.push({
        name: currentBatter.name,
        playerIndex: currentBatter.playerIndex,
        base: 'batter'
      });
    }

    // 각 원래 주자(+ 타자)가 현재 어디에 있는지 확인
    allOriginalRunners.forEach(runner => {
      const isOnFirst = adjustedRunners.first?.playerIndex === runner.playerIndex;
      const isOnSecond = adjustedRunners.second?.playerIndex === runner.playerIndex;
      const isOnThird = adjustedRunners.third?.playerIndex === runner.playerIndex;

      // 어떤 베이스에도 없으면 득점으로 간주
      if (!isOnFirst && !isOnSecond && !isOnThird) {
        scoredRunners.push(runner);
        runsScored++;
        console.log(`🏃 ${runner.name} 홈인! (원래 위치: ${runner.base})`);
      }
    });

    // 득점한 주자들의 runs 스탯 증가 및 배지 체크
    scoredRunners.forEach(runner => {
      if (runner.playerIndex !== undefined) {
        const scoredPlayer = team.lineup[runner.playerIndex];
        if (scoredPlayer && scoredPlayer.stats) {
          const beforeRuns = scoredPlayer.stats.runs || 0;
          scoredPlayer.stats.runs = beforeRuns + 1;
          console.log(`✅ ${scoredPlayer.name} 득점 스탯 업데이트: ${beforeRuns} → ${scoredPlayer.stats.runs}`);

          // 배지 체크
          checkAndAwardBadges(scoredPlayer);
        }
      }
    });

    // 스코어보드 업데이트
    if (runsScored > 0) {
      const inningIndex = newGame.currentInning - 1;
      const currentInningScore = isTeamA
        ? (newGame.scoreBoard.teamA[inningIndex] || 0)
        : (newGame.scoreBoard.teamB[inningIndex] || 0);

      if (isTeamA) {
        newGame.scoreBoard.teamA[inningIndex] = currentInningScore + runsScored;
        newGame.scoreBoard.teamATotal = newGame.scoreBoard.teamA.reduce((a, b) => a + b, 0);
      } else {
        newGame.scoreBoard.teamB[inningIndex] = currentInningScore + runsScored;
        newGame.scoreBoard.teamBTotal = newGame.scoreBoard.teamB.reduce((a, b) => a + b, 0);
      }

      console.log(`📊 스코어보드 업데이트: ${newGame.currentInning}회 ${runsScored}점 추가`);
    }

    // 조정된 주자 상황 적용
    newGame.runners = adjustedRunners;

    // ✅ 타자가 아웃이 아니면 다음 타자로 이동 (안타 후 타자 인덱스 자동 변경)
    if (batterStatus !== 'out') {
      const currentBatterIndex = newGame.currentBatterIndex || 0;
      const nextBatterIndex = (currentBatterIndex + 1) % team.lineup.length;
      newGame.currentBatterIndex = nextBatterIndex;
      console.log(`📍 안타 후 다음 타자로 이동: ${currentBatterIndex} → ${nextBatterIndex} (다음 타자: ${team.lineup[nextBatterIndex]?.name || '?'})`);
    } else {
      console.log(`⚠️ 타자 아웃 처리됨 - 타자 인덱스 이동 없음`);
    }

    // Firestore 업데이트
    try {
      await updateGame(game.id, newGame);
      console.log(`✅ 주자 상황 업데이트 완료 | 득점: ${runsScored}점`);

      // 모달 닫기 및 임시 데이터 초기화
      setShowRunnerModal(false);
      setPendingGameData(null);
      setPendingRunners(null);
      setOriginalRunners(null);
      setCurrentBatter(null);
    } catch (error) {
      console.error('❌ 주자 상황 업데이트 실패:', error);
      alert('주자 상황 업데이트에 실패했습니다.');
    }
  };

  // 주자 조정 모달 취소 핸들러
  const handleRunnerModalCancel = () => {
    setShowRunnerModal(false);
    setPendingGameData(null);
    setPendingRunners(null);
    setOriginalRunners(null);
    setCurrentBatter(null);
    console.log('주자 조정 취소');
  };

  // 안타 삭제 핸들러 (편집 모드)
  const handleRemoveHit = async (playerIndex, hitIndex) => {
    if (game.status === 'completed') {
      alert('⚠️ 완료된 경기는 기록을 수정할 수 없습니다.');
      return;
    }

    const newGame = { ...game };
    const isTeamA = game.isTopInning;
    const team = isTeamA ? newGame.teamA : newGame.teamB;
    const player = team.lineup[playerIndex];

    if (!player.currentGameHits || !player.currentGameHits[hitIndex]) {
      console.error('삭제할 안타 기록이 없습니다.');
      return;
    }

    // 삭제할 안타 종류 확인
    const hitType = player.currentGameHits[hitIndex];

    // currentGameHits에서 삭제
    player.currentGameHits.splice(hitIndex, 1);

    // 안타 스탯 감소
    player.stats.hits = Math.max(0, player.stats.hits - 1);

    // 안타 종류별 스탯 감소
    if (hitType === '1루타') player.stats.single = Math.max(0, player.stats.single - 1);
    else if (hitType === '2루타') player.stats.double = Math.max(0, player.stats.double - 1);
    else if (hitType === '3루타') player.stats.triple = Math.max(0, player.stats.triple - 1);
    else if (hitType === '홈런') player.stats.homerun = Math.max(0, player.stats.homerun - 1);

    // 주자 상황에서 해당 타자 제거
    if (newGame.runners) {
      const playerName = player.name;

      // 1루에 있는 경우 제거
      if (newGame.runners.first?.name === playerName && newGame.runners.first?.playerIndex === playerIndex) {
        newGame.runners.first = null;
        console.log(`📍 1루 주자 ${playerName} 제거`);
      }

      // 2루에 있는 경우 제거
      if (newGame.runners.second?.name === playerName && newGame.runners.second?.playerIndex === playerIndex) {
        newGame.runners.second = null;
        console.log(`📍 2루 주자 ${playerName} 제거`);
      }

      // 3루에 있는 경우 제거
      if (newGame.runners.third?.name === playerName && newGame.runners.third?.playerIndex === playerIndex) {
        newGame.runners.third = null;
        console.log(`📍 3루 주자 ${playerName} 제거`);
      }
    }

    // Firestore 업데이트
    try {
      await updateGame(game.id, newGame);
      console.log(`✅ ${player.name} ${hitType} 삭제 완료`);
    } catch (error) {
      console.error('❌ 안타 삭제 실패:', error);
      alert('안타 삭제에 실패했습니다.');
    }
  };

  // 게임 데이터가 없으면 로딩 표시
  if (!game) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">⚾</div>
          <div className="text-foreground text-xl font-semibold">경기 로딩 중...</div>
        </div>
      </div>
    );
  }

  const attackTeam = game.isTopInning ? game.teamA : game.teamB;
  const defenseTeam = game.isTopInning ? game.teamB : game.teamA;
  const isCompleted = game.status === 'completed';

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* 상단 네비게이션 */}
      <nav className="bg-card shadow-lg border-b border-border flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 gap-4">
            {/* 좌측: 타이틀 */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="text-2xl">⚾</span>
              <h1 className="text-lg font-bold text-card-foreground">
                경기 진행 중
              </h1>
            </div>

            {/* 중앙: 날짜/시간 */}
            <div className="flex-1 flex justify-center">
              <div className="flex items-center gap-3 px-4 py-2 bg-lime-50 text-gray-800 font-semibold rounded-full shadow-sm border border-lime-200">
                <div className="flex items-center gap-1">
                  <span className="text-lg">📆</span>
                  <span className="text-base">
                    {currentDateTime.toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      weekday: 'short'
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-lg">⏱️</span>
                  <span className="text-base">
                    {currentDateTime.toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit'
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* 우측: 빈 공간 (대칭을 위해) */}
            <div className="flex-shrink-0" style={{ width: '100px' }}></div>
          </div>
        </div>
      </nav>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col overflow-hidden py-2 px-4 max-w-7xl mx-auto w-full">
        {/* 스코어보드 + 진루상황 (28% 높이) */}
        <div className="flex-[0_0_28%] grid grid-cols-1 lg:grid-cols-10 gap-3 mb-2">
          {/* 스코어보드 (8) */}
          <div className="lg:col-span-8 flex flex-col">
            <Card className="flex-1 flex flex-col overflow-hidden bg-white shadow-lg">
              <CardContent className="flex-1 overflow-auto p-3 w-full flex flex-col justify-center">
              {/* 상단: 대시보드 버튼 + 회차 + 공격팀 + 이닝 버튼 */}
              <div className="flex items-center justify-between mb-2">
                {/* 좌측: 대시보드 버튼 */}
                <button
                  onClick={() => {
                    if (confirm('메인 화면으로 돌아가시겠습니까?')) {
                      onExit?.();
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-100 hover:bg-sky-200 text-sky-700 font-medium rounded-full transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  <span>←</span>
                  <span>대시보드</span>
                </button>

                {/* 중앙: 회차 + 공격팀 */}
                <div className="flex items-center gap-3">
                  <div className="text-xl tablet:text-2xl font-bold text-blue-600">
                    {game.currentInning}회 {game.isTopInning ? '초' : '말'}
                  </div>
                  <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-3 py-1 rounded-lg font-bold shadow-lg flex items-center gap-1.5">
                    <span className="text-sm">⚔️</span>
                    <span className="text-base">{attackTeam.name}</span>
                  </div>
                </div>

                {/* 우측: 이닝 추가/삭제 버튼 */}
                {!isCompleted ? (
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-gray-100 rounded px-2 py-1">
                      {/* 숫자 입력 필드 */}
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={inningCountInput}
                        onChange={(e) => setInningCountInput(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                        className="w-12 text-center text-sm font-semibold bg-white border border-gray-300 rounded px-1 py-0.5 focus:outline-none focus:border-blue-500"
                      />
                      <span className="text-sm text-gray-600">이닝</span>

                      {/* 상하 화살표 */}
                      <div className="flex flex-col">
                        <button
                          onClick={() => setInningCountInput(prev => Math.min(10, prev + 1))}
                          className="text-gray-600 hover:text-gray-800 leading-none"
                          title="수량 증가"
                        >
                          ▲
                        </button>
                        <button
                          onClick={() => setInningCountInput(prev => Math.max(1, prev - 1))}
                          className="text-gray-600 hover:text-gray-800 leading-none"
                          title="수량 감소"
                        >
                          ▼
                        </button>
                      </div>
                    </div>

                    {/* 삭제/추가 버튼 */}
                    <button
                      onClick={() => handleRemoveInning(inningCountInput)}
                      className="bg-red-500 hover:bg-red-600 text-white w-7 h-7 rounded text-xs font-bold transition shadow-sm"
                      title={`${inningCountInput}회 삭제`}
                    >
                      -
                    </button>
                    <button
                      onClick={() => handleAddInning(inningCountInput)}
                      className="bg-blue-500 hover:bg-blue-600 text-white w-7 h-7 rounded text-xs font-bold transition shadow-sm"
                      title={`${inningCountInput}회 추가`}
                    >
                      +
                    </button>

                    {/* 스코어보드 확대 버튼 */}
                    <button
                      onClick={() => setIsScoreboardExpanded(true)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-xs font-semibold transition shadow-sm flex items-center gap-1"
                      title="전체 스코어보드 보기"
                    >
                      🔍 확대
                    </button>
                  </div>
                ) : (
                  <div></div>
                )}
              </div>

              {/* 스코어보드 테이블 */}
              <div className="overflow-x-auto">
                {/* 이닝 네비게이션 */}
                {(() => {
                  const MAX_VISIBLE_INNINGS = 5;
                  const endInning = Math.min(startInning + MAX_VISIBLE_INNINGS, game.innings);
                  const visibleInnings = Array.from({ length: endInning - startInning }, (_, i) => startInning + i);

                  // 네비게이션 활성화 여부 (6회 이상일 때만)
                  const isNavEnabled = game.innings > MAX_VISIBLE_INNINGS;
                  const canGoPrev = isNavEnabled && startInning > 0;
                  const canGoNext = isNavEnabled && endInning < game.innings;

                  return (
                    <>
                      {/* 네비게이션 버튼 (항상 표시, 5이닝 이하일 때는 비활성화) */}
                      <div className="flex justify-center items-center gap-3 mb-3">
                        <button
                          onClick={() => isNavEnabled && setStartInning(Math.max(0, startInning - 1))}
                          disabled={!canGoPrev}
                          className={`px-3 py-1 rounded text-sm font-semibold ${
                            !canGoPrev
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          ← 이전
                        </button>
                        <span className="text-sm text-gray-600 font-semibold">
                          {startInning + 1}~{endInning}회 (총 {game.innings}회)
                        </span>
                        <button
                          onClick={() => isNavEnabled && setStartInning(Math.min(game.innings - MAX_VISIBLE_INNINGS, startInning + 1))}
                          disabled={!canGoNext}
                          className={`px-3 py-1 rounded text-sm font-semibold ${
                            !canGoNext
                              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                              : 'bg-blue-500 text-white hover:bg-blue-600'
                          }`}
                        >
                          다음 →
                        </button>
                      </div>

                      {/* 스코어보드 테이블 */}
                      <table className="w-full text-center border-collapse rounded-lg overflow-hidden shadow-lg">
                        <thead>
                          <tr className="bg-gradient-to-r from-sky-100 to-blue-100">
                            <th className="border border-gray-300 p-1 tablet:p-1.5 tablet-lg:p-2 font-bold text-lg tablet:text-xl tablet-lg:text-2xl">팀</th>
                            {visibleInnings.map((inningIndex) => {
                              const isCurrentInning = inningIndex + 1 === game.currentInning;
                              return (
                                <th
                                  key={inningIndex}
                                  className={`border border-gray-300 p-1 tablet:p-1.5 tablet-lg:p-2 text-lg tablet:text-xl tablet-lg:text-2xl transition-all ${
                                    isCurrentInning
                                      ? 'bg-gradient-to-br from-blue-400 to-blue-500 text-white font-bold shadow-inner'
                                      : 'hover:bg-blue-50'
                                  }`}
                                >
                                  {inningIndex + 1}회
                                  {isCurrentInning && (
                                    <span className="ml-1 inline-block animate-pulse text-sm">🔴</span>
                                  )}
                                </th>
                              );
                            })}
                            <th className="border border-gray-300 p-1 tablet:p-1.5 tablet-lg:p-2 bg-gradient-to-r from-yellow-100 to-amber-100 font-bold text-lg tablet:text-xl tablet-lg:text-2xl">
                              총점
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {/* TeamA Row */}
                          <tr className={`transition-all ${game.isTopInning ? 'bg-gradient-to-r from-blue-50 to-sky-50' : 'hover:bg-gray-50'}`}>
                            <td className="border border-gray-300 p-1 tablet:p-1.5 tablet-lg:p-2 font-semibold text-lg tablet:text-xl tablet-lg:text-2xl">
                              {game.teamA.name}
                              {game.isTopInning && (
                                <span className="ml-1 tablet:ml-2 text-red-500 font-bold text-base tablet:text-lg">⚔️</span>
                              )}
                            </td>
                            {visibleInnings.map((inningIndex) => {
                              const score = game.scoreBoard.teamA[inningIndex];
                              const hasScore = score > 0;
                              return (
                                <td
                                  key={inningIndex}
                                  className={`border border-gray-300 p-1 tablet:p-1.5 tablet-lg:p-2 transition-all ${
                                    hasScore ? 'bg-yellow-50 font-extrabold' : ''
                                  }`}
                                >
                                  <span className={`text-3xl tablet:text-4xl tablet-lg:text-5xl ${hasScore ? 'text-orange-600' : 'text-gray-400'}`}>
                                    {score}
                                  </span>
                                  {/* 득점 이닝 시각적 표시 */}
                                  {hasScore && (
                                    <div className="mt-1 flex justify-center gap-0.5">
                                      {Array.from({ length: Math.min(score, 3) }).map((_, i) => (
                                        <span key={i} className="text-sm">⭐</span>
                                      ))}
                                      {score > 3 && <span className="text-sm">+{score - 3}</span>}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="border border-gray-300 p-1 tablet:p-1.5 tablet-lg:p-2 bg-gradient-to-r from-yellow-50 to-amber-50">
                              <div className="text-4xl tablet:text-5xl tablet-lg:text-6xl font-bold text-blue-600">
                                {game.scoreBoard.teamATotal}
                              </div>
                            </td>
                          </tr>

                          {/* TeamB Row */}
                          <tr className={`transition-all ${!game.isTopInning ? 'bg-gradient-to-r from-red-50 to-pink-50' : 'hover:bg-gray-50'}`}>
                            <td className="border border-gray-300 p-1 tablet:p-1.5 tablet-lg:p-2 font-semibold text-lg tablet:text-xl tablet-lg:text-2xl">
                              {game.teamB.name}
                              {!game.isTopInning && (
                                <span className="ml-1 tablet:ml-2 text-red-500 font-bold text-base tablet:text-lg">⚔️</span>
                              )}
                            </td>
                            {visibleInnings.map((inningIndex) => {
                              const score = game.scoreBoard.teamB[inningIndex];
                              const hasScore = score > 0;
                              return (
                                <td
                                  key={inningIndex}
                                  className={`border border-gray-300 p-1 tablet:p-1.5 tablet-lg:p-2 transition-all ${
                                    hasScore ? 'bg-yellow-50 font-extrabold' : ''
                                  }`}
                                >
                                  <span className={`text-3xl tablet:text-4xl tablet-lg:text-5xl ${hasScore ? 'text-orange-600' : 'text-gray-400'}`}>
                                    {score}
                                  </span>
                                  {/* 득점 이닝 시각적 표시 */}
                                  {hasScore && (
                                    <div className="mt-1 flex justify-center gap-0.5">
                                      {Array.from({ length: Math.min(score, 3) }).map((_, i) => (
                                        <span key={i} className="text-sm">⭐</span>
                                      ))}
                                      {score > 3 && <span className="text-sm">+{score - 3}</span>}
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                            <td className="border border-gray-300 p-1 tablet:p-1.5 tablet-lg:p-2 bg-gradient-to-r from-yellow-50 to-amber-50">
                              <div className="text-4xl tablet:text-5xl tablet-lg:text-6xl font-bold text-red-600">
                                {game.scoreBoard.teamBTotal}
                              </div>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </>
                  );
                })()}
              </div>

              {/* 경기 컨트롤 (파스텔 퍼플 배경) - 스코어보드 내부 하단 */}
              {game.status === 'playing' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {/* 모바일 토글 버튼 */}
                  <button
                    onClick={() => setIsControlCollapsed(!isControlCollapsed)}
                    className="md:hidden w-full flex items-center justify-center gap-2 py-2 px-3 text-sm text-purple-700 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                  >
                    <span>경기 컨트롤</span>
                    <span className="text-xs">{isControlCollapsed ? '▼' : '▲'}</span>
                  </button>

                  {/* 컨트롤 버튼들 - 파스텔 퍼플 프레임 */}
                  <div className={`${isControlCollapsed ? 'hidden md:flex' : 'flex'} items-center justify-center gap-2 flex-wrap bg-purple-100 px-3 py-2 rounded-lg`}>
                    <Button
                      onClick={() => handleChangeInning(-1)}
                      disabled={game.currentInning <= 1}
                      variant="outline"
                      size="sm"
                      className="text-xs bg-white"
                    >
                      ⬅️ 이전 이닝
                    </Button>
                    <Button
                      onClick={() => handleChangeInning(1)}
                      disabled={game.currentInning >= game.innings}
                      variant="outline"
                      size="sm"
                      className="text-xs bg-white"
                    >
                      다음 이닝 ➡️
                    </Button>
                    <Button
                      onClick={handleSwitchTeams}
                      variant="default"
                      size="sm"
                      className="text-xs bg-green-100 hover:bg-green-200 text-green-700"
                    >
                      🔄 공수교대
                    </Button>
                    <Button
                      onClick={handleEndGame}
                      variant="destructive"
                      size="sm"
                      className="text-xs bg-red-100 hover:bg-red-200 text-red-700"
                    >
                      🏁 경기 종료
                    </Button>
                  </div>
                </div>
              )}
                </CardContent>
              </Card>
            </div>

          {/* 진루 상황 + 카운트 (2) */}
          <div className="lg:col-span-2 flex flex-col">
            <Card className="flex-1 flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
              <CardHeader
                className="pb-1 pt-2 flex-shrink-0 cursor-pointer hover:bg-gray-200/50 transition-colors rounded-t-lg"
                onClick={() => setIsFieldCollapsed(!isFieldCollapsed)}
              >
                <CardTitle className="text-center text-green-800 text-sm flex items-center justify-center gap-2">
                  <span>⚾ 주자 상황</span>
                  <span className="text-xs text-gray-500">
                    {isFieldCollapsed ? '▼' : '▲'}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-2 overflow-hidden">
                {!isFieldCollapsed && (
              <div className="flex flex-col items-center justify-between h-full">
                {/* 야구장 다이아몬드 */}
                <div className="flex items-center justify-center flex-shrink-0">
                  <div
                    className="relative bg-gradient-to-br from-green-600 to-green-800 rounded-lg shadow-lg overflow-visible"
                    style={{
                      width: '140px',
                      height: '140px'
                    }}
                  >
                    {/* 내야 흙색 영역 */}
                    <div
                      className="absolute bg-gradient-to-br from-orange-700 to-amber-800"
                      style={{
                        width: '65%',
                        height: '65%',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(45deg)',
                        transformOrigin: 'center'
                      }}
                    />

                    {/* 베이스 간 연결선 */}
                    <svg className="absolute inset-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                      <line x1="50%" y1="85%" x2="85%" y2="50%" stroke="white" strokeWidth="2" opacity="0.6" />
                      <line x1="85%" y1="50%" x2="50%" y2="15%" stroke="white" strokeWidth="2" opacity="0.6" />
                      <line x1="50%" y1="15%" x2="15%" y2="50%" stroke="white" strokeWidth="2" opacity="0.6" />
                      <line x1="15%" y1="50%" x2="50%" y2="85%" stroke="white" strokeWidth="2" opacity="0.6" />
                    </svg>

                    {/* 2루 (상단) */}
                    <div
                      className={`absolute w-6 h-6 transform transition-all shadow-xl border-2 border-white ${
                        game.runners?.second
                          ? 'bg-yellow-400 scale-110'
                          : 'bg-gray-100'
                      } z-10`}
                      style={{
                        top: '15%',
                        left: '50%',
                        transform: `translate(-50%, -50%) rotate(45deg) ${game.runners?.second ? 'scale(1.1)' : 'scale(1)'}`,
                        borderRadius: '2px'
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center transform -rotate-45 text-gray-800 font-black text-xs">
                        {game.runners?.second ? '🏃' : '2'}
                      </div>
                    </div>

                    {/* 3루 (좌측) */}
                    <div
                      className={`absolute w-6 h-6 transform transition-all shadow-xl border-2 border-white ${
                        game.runners?.third
                          ? 'bg-yellow-400 scale-110'
                          : 'bg-gray-100'
                      } z-10`}
                      style={{
                        top: '50%',
                        left: '15%',
                        transform: `translate(-50%, -50%) rotate(45deg) ${game.runners?.third ? 'scale(1.1)' : 'scale(1)'}`,
                        borderRadius: '2px'
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center transform -rotate-45 text-gray-800 font-black text-xs">
                        {game.runners?.third ? '🏃' : '3'}
                      </div>
                    </div>

                    {/* 1루 (우측) */}
                    <div
                      className={`absolute w-6 h-6 transform transition-all shadow-xl border-2 border-white ${
                        game.runners?.first
                          ? 'bg-yellow-400 scale-110'
                          : 'bg-gray-100'
                      } z-10`}
                      style={{
                        top: '50%',
                        left: '85%',
                        transform: `translate(-50%, -50%) rotate(45deg) ${game.runners?.first ? 'scale(1.1)' : 'scale(1)'}`,
                        borderRadius: '2px'
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center transform -rotate-45 text-gray-800 font-black text-xs">
                        {game.runners?.first ? '🏃' : '1'}
                      </div>
                    </div>

                    {/* 홈베이스 */}
                    <div
                      className="absolute w-6 h-6 bg-white transform shadow-xl border-2 border-white z-10"
                      style={{
                        top: '85%',
                        left: '50%',
                        transform: 'translate(-50%, -50%) rotate(45deg)',
                        borderRadius: '2px'
                      }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center transform -rotate-45 text-gray-800 font-black text-xs">
                        H
                      </div>
                    </div>
                  </div>
                </div>

                {/* 주자 이름 표시 + 수동 조정 */}
                {(game.runners?.first || game.runners?.second || game.runners?.third) && (
                  <div className="w-full px-0.5 mt-0.5">
                    <div className="flex gap-0.5 text-[8px] flex-wrap">
                      {game.runners?.third && (
                        <div className="flex items-center gap-1 bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-300 flex-shrink-0">
                          <span className="font-semibold text-yellow-800 text-[10px] truncate max-w-[60px]">
                            3루: {game.runners.third.name}
                          </span>
                          {!isCompleted && (
                            <Select
                              value="third"
                              onValueChange={(newBase) => handleRunnerMove('third', newBase)}
                            >
                              <SelectTrigger className="w-12 h-5 text-[9px] bg-white border-yellow-400 px-1">
                                <SelectValue placeholder="이동" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="third" className="text-xs">3루 유지</SelectItem>
                                <SelectItem value="home" className="text-xs">⚡ 홈인</SelectItem>
                                <SelectItem value="second" className="text-xs">← 2루</SelectItem>
                                <SelectItem value="out" className="text-xs text-red-600">❌ 아웃</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}
                      {game.runners?.second && (
                        <div className="flex items-center gap-1 bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-300 flex-shrink-0">
                          <span className="font-semibold text-yellow-800 text-[10px] truncate max-w-[60px]">
                            2루: {game.runners.second.name}
                          </span>
                          {!isCompleted && (
                            <Select
                              value="second"
                              onValueChange={(newBase) => handleRunnerMove('second', newBase)}
                            >
                              <SelectTrigger className="w-12 h-5 text-[9px] bg-white border-yellow-400 px-1">
                                <SelectValue placeholder="이동" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="second" className="text-xs">2루 유지</SelectItem>
                                <SelectItem value="third" className="text-xs">→ 3루</SelectItem>
                                <SelectItem value="home" className="text-xs">⚡ 홈인</SelectItem>
                                <SelectItem value="first" className="text-xs">← 1루</SelectItem>
                                <SelectItem value="out" className="text-xs text-red-600">❌ 아웃</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}
                      {game.runners?.first && (
                        <div className="flex items-center gap-1 bg-yellow-100 px-1.5 py-0.5 rounded border border-yellow-300 flex-shrink-0">
                          <span className="font-semibold text-yellow-800 text-[10px] truncate max-w-[60px]">
                            1루: {game.runners.first.name}
                          </span>
                          {!isCompleted && (
                            <Select
                              value="first"
                              onValueChange={(newBase) => handleRunnerMove('first', newBase)}
                            >
                              <SelectTrigger className="w-12 h-5 text-[9px] bg-white border-yellow-400 px-1">
                                <SelectValue placeholder="이동" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="first" className="text-xs">1루 유지</SelectItem>
                                <SelectItem value="second" className="text-xs">→ 2루</SelectItem>
                                <SelectItem value="third" className="text-xs">→ 3루</SelectItem>
                                <SelectItem value="home" className="text-xs">⚡ 홈인</SelectItem>
                                <SelectItem value="out" className="text-xs text-red-600">❌ 아웃</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 카운트 (아웃 + 스트라이크) */}
                <div className="w-full px-0.5 space-y-0.5 mt-1">
                  {/* 아웃 카운트 (game.options.outs가 true일 때만 표시) */}
                  {game.options?.outs && (
                    <div className="flex items-center justify-between bg-white rounded p-0.5 shadow-sm border border-gray-200">
                      <span className="font-bold text-gray-700 text-[10px] ml-0.5">O</span>
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => handleChangeOuts(-1)}
                          className="w-5 h-5 rounded bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold text-[10px] transition flex items-center justify-center"
                        >
                          -
                        </button>
                        <div className="flex gap-0.5">
                          {[0, 1, 2, 3].map((n) => (
                            <div
                              key={n}
                              className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                                (game.currentOuts || 0) === n
                                  ? 'bg-red-500 text-white'
                                  : 'bg-gray-100 text-gray-400'
                              }`}
                            >
                              {n}
                            </div>
                          ))}
                        </div>
                        <button
                          onClick={() => handleChangeOuts(1)}
                          className="w-5 h-5 rounded bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold text-[10px] transition flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {/* 스트라이크 카운트 */}
                  <div className="flex items-center justify-between bg-white rounded p-0.5 shadow-sm border border-gray-200">
                    <span className="font-bold text-gray-700 text-[10px] ml-0.5">S</span>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => handleChangeStrikes(-1)}
                        className="w-5 h-5 rounded bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold text-[10px] transition flex items-center justify-center"
                      >
                        -
                      </button>
                      <div className="flex gap-0.5">
                        {[0, 1, 2].map((n) => (
                          <div
                            key={n}
                            className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[10px] ${
                              (game.currentStrikes || 0) === n
                                ? 'bg-yellow-500 text-white'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {n}
                          </div>
                        ))}
                      </div>
                      <button
                        onClick={() => handleChangeStrikes(1)}
                        className="w-5 h-5 rounded bg-gray-300 hover:bg-gray-400 text-gray-700 font-bold text-[10px] transition flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* ⚾ 타격 아웃 버튼 (새로 추가) */}
                  <button
                    onClick={handleBattedOut}
                    className="w-full py-1.5 bg-red-500 hover:bg-red-600 text-white font-bold text-[11px] rounded shadow-sm transition"
                    title="타자가 공을 쳤으나 아웃된 경우 (플라이, 땅볼 등)"
                  >
                    타격 아웃
                  </button>
                </div>
              </div>
                )}
              </CardContent>
              </Card>
            </div>
          </div>

        {/* 공격팀/수비팀 라인업 (72% 높이) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-0">
          {/* 공격팀 */}
          <Card className="flex flex-col overflow-hidden bg-red-50/30 border-red-100">
            <CardHeader className="pb-2 flex-shrink-0">
              <div className="flex justify-between items-center w-full">
                  <CardTitle className="text-red-700">⚾ 공격팀 - {attackTeam.name}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isCompleted}>
                        <Settings className="w-4 h-4 mr-1" />
                        설정
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleOpenLineupChange(game.isTopInning ? 'teamA' : 'teamB')}>
                        🔄 라인업 전체 교체
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => {
                        const newExpanded = !isAllExpandedTeamB;
                        setIsAllExpandedTeamB(newExpanded);
                        if (newExpanded) {
                          setExpandedPlayersTeamB(new Set(attackTeam.lineup.map((_, i) => i)));
                        } else {
                          setExpandedPlayersTeamB(new Set());
                        }
                      }}>
                        {isAllExpandedTeamB ? '📂 모두 접기' : '📁 모두 펼치기'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleToggleAttackEditMode}>
                        {isAttackEditMode ? '✓ 편집 완료' : '✏️ 라인업 편집'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setShowRunnerModal(true)}>
                        🏃 주자 조정
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setShowHitDetailModal(true)}>
                        📊 타석 상세 기록
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 p-2">
              <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100% - 0px)' }}>
              <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '28%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '20%' }} />
                  </colgroup>
                  <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className="border-b-2 border-black">
                      <th className="text-center py-2 bg-white" style={{ textAlign: 'center' }}>타순</th>
                      <th className="text-left py-2 pl-2 bg-white" style={{ textAlign: 'left' }}>이름</th>
                      <th className="text-center py-2 bg-white" style={{ textAlign: 'center' }}>⚾ 안타</th>
                      <th className="text-center py-2 bg-white" style={{ textAlign: 'center' }}>🏃 득점</th>
                      <th className="text-center py-2 bg-white" style={{ textAlign: 'center' }}>🍪 쿠키</th>
                    </tr>
                  </thead>
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={(tempAttackLineup || attackTeam.lineup).map(p => p.id || p.name)}
                      strategy={verticalListSortingStrategy}
                    >
                      <tbody>
                        {(tempAttackLineup || attackTeam.lineup).map((player, i) => {
                          const isCurrentBatter = i === game.currentBatterIndex;

                          // 편집 모드일 때만 SortableAttackRow 사용
                          if (isAttackEditMode) {
                            return (
                              <SortableAttackRow
                                key={player.id || player.name}
                                player={player}
                                index={i}
                                isCurrentBatter={isCurrentBatter}
                                currentInning={game.currentInning}
                              >
                                <td className="py-2 align-middle text-left pl-2">
                                  <div className="flex items-center gap-1">
                                    {/* 배지 영역 (최대 3개) - 왼쪽, 고정 너비 */}
                                    <div className="flex items-center gap-0.5 w-16 flex-shrink-0">
                                      {player.badges && player.badges.length > 0 ? (
                                        <>
                                          {player.badges.slice(0, 3).map((badgeId, idx) => {
                                            const badge = Object.values(BADGES).find(b => b.id === badgeId);
                                            return badge ? (
                                              <span key={idx} title={badge.name} className="text-sm cursor-help">
                                                {badge.icon}
                                              </span>
                                            ) : null;
                                          })}
                                          {player.badges.length > 3 && (
                                            <span
                                              className="text-xs text-gray-500 cursor-help"
                                              title={player.badges.slice(3).map(id => {
                                                const b = Object.values(BADGES).find(badge => badge.id === id);
                                                return b ? `${b.icon} ${b.name}` : '';
                                              }).filter(Boolean).join('\n')}
                                            >
                                              +{player.badges.length - 3}
                                            </span>
                                          )}
                                        </>
                                      ) : null}
                                    </div>

                                    {/* 이름 + 진행도 - 오른쪽 */}
                                    <div className="flex flex-col gap-1 flex-1">
                                      <span
                                        className="font-bold cursor-pointer underline decoration-dotted decoration-gray-400 hover:decoration-solid hover:decoration-blue-600 hover:text-blue-600 transition-colors"
                                        onClick={() => handlePlayerNameClick(player)}
                                        title="배지 관리 클릭"
                                      >
                                        {player.name}
                                      </span>
                                      <BadgeProgressIndicator
                                        progressData={getNextBadgesProgress(calculateLiveTotalStats(player) || player.stats || {}, player.badges || [], BADGES, true)}
                                      />
                                    </div>

                                    <button
                                      onClick={() => {
                                        setReplacingPlayerIndex(i);
                                        setReplacingTeam('attack');
                                        setShowPlayerReplaceModal(true);
                                      }}
                                      className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded transition"
                                      title="선수 교체"
                                    >
                                      교체
                                    </button>
                                  </div>
                                </td>

                                {/* 편집 모드: 읽기 전용 스탯 표시 */}
                                <td className="text-center py-2 align-middle">
                                  <span className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-green-50 border border-green-200 text-green-800 font-bold">
                                    안타 <span className="font-extrabold text-base">{player.stats?.hits || 0}</span>
                                  </span>
                                </td>
                                <td className="text-center py-2 align-middle">
                                  <span className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-bold">
                                    득점 <span className="font-extrabold text-base">{player.stats?.runs || 0}</span>
                                  </span>
                                </td>
                                <td className="text-center py-2 align-middle">
                                  <span className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-800 font-bold">
                                    쿠키 <span className="font-extrabold text-base">{player.stats?.bonusCookie || 0}</span>
                                  </span>
                                </td>
                              </SortableAttackRow>
                            );
                          }

                          // 일반 모드 (편집 모드가 아닐 때)
                          return (
                            <React.Fragment key={i}>
                              <tr
                                className={`
                                  border-b-2 border-black py-4
                                  ${isCurrentBatter
                                    ? 'bg-yellow-100 border-yellow-300 font-bold'
                                    : 'hover:bg-red-50'
                                  }
                                `}
                                style={{ height: '50px' }}
                              >
                                <td className="py-2 align-middle text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <button
                                      onClick={() => {
                                        const newSet = new Set(expandedPlayersTeamB);
                                        if (newSet.has(i)) {
                                          newSet.delete(i);
                                        } else {
                                          newSet.add(i);
                                        }
                                        setExpandedPlayersTeamB(newSet);
                                      }}
                                      className="text-xs hover:bg-gray-100 rounded px-1"
                                    >
                                      {expandedPlayersTeamB.has(i) ? '▼' : '▶'}
                                    </button>
                                    <span className="font-bold">{player.battingOrder || i + 1}</span>
                                    {player.outInInning === game.currentInning && (
                                      <span className="text-[10px] text-red-600 font-bold bg-red-100 px-1 rounded">
                                        {game.currentInning}회OUT
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-2 align-middle text-left pl-2">
                                  <div className="flex items-center gap-1">
                                    {/* 배지 영역 (최대 3개) - 왼쪽, 고정 너비 */}
                                    <div className="flex items-center gap-0.5 w-16 flex-shrink-0">
                                      {player.badges && player.badges.length > 0 ? (
                                        <>
                                          {player.badges.slice(0, 3).map((badgeId, idx) => {
                                            const badge = Object.values(BADGES).find(b => b.id === badgeId);
                                            return badge ? (
                                              <span key={idx} title={badge.name} className="text-sm cursor-help">
                                                {badge.icon}
                                              </span>
                                            ) : null;
                                          })}
                                          {player.badges.length > 3 && (
                                            <span
                                              className="text-xs text-gray-500 cursor-help"
                                              title={player.badges.slice(3).map(id => {
                                                const b = Object.values(BADGES).find(badge => badge.id === id);
                                                return b ? `${b.icon} ${b.name}` : '';
                                              }).filter(Boolean).join('\n')}
                                            >
                                              +{player.badges.length - 3}
                                            </span>
                                          )}
                                        </>
                                      ) : null}
                                    </div>

                                    {/* 이름 + 진행도 - 오른쪽 */}
                                    <div className="flex flex-col gap-1 flex-1">
                                      <span
                                        className="font-bold cursor-pointer underline decoration-dotted decoration-gray-400 hover:decoration-solid hover:decoration-blue-600 hover:text-blue-600 transition-colors"
                                        onClick={() => handlePlayerNameClick(player)}
                                        title="배지 관리 클릭"
                                      >
                                        {player.name}
                                      </span>
                                      <BadgeProgressIndicator
                                        progressData={getNextBadgesProgress(calculateLiveTotalStats(player) || player.stats || {}, player.badges || [], BADGES, true)}
                                      />
                                    </div>
                                  </div>
                                </td>

                                {/* 안타 */}
                                <td className="text-center py-2 align-middle relative">
                                  <div className="flex flex-col items-center gap-1">
                                    {/* - | 안타 0 형태의 버튼 */}
                                    <div className="flex items-center justify-center gap-0.5">
                                      <button
                                        onClick={() => {
                                          if (hitEditPlayerIndex === i) {
                                            setHitEditPlayerIndex(null); // 편집 모드 종료
                                          } else {
                                            setHitEditPlayerIndex(i); // 편집 모드 활성화
                                            setExpandedHitRow(null); // 안타 추가 메뉴는 닫기
                                          }
                                        }}
                                        disabled={isCompleted}
                                        className={`px-1.5 h-7 rounded-l text-xs font-bold ${
                                          isCompleted
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : 'bg-red-100 hover:bg-red-200 text-red-600'
                                        }`}
                                      >
                                        -
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (expandedHitRow === i) {
                                            setExpandedHitRow(null); // 닫기
                                          } else {
                                            setExpandedHitRow(i); // 열기
                                            setHitEditPlayerIndex(null); // 편집 모드는 종료
                                          }
                                        }}
                                        disabled={isCompleted}
                                        className={`px-2 h-7 rounded-r text-xs font-bold min-w-[40px] ${
                                          isCompleted
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                            : expandedHitRow === i
                                            ? 'bg-green-200 text-green-800 shadow-md'
                                            : 'bg-green-100 hover:bg-green-200 text-green-800'
                                        }`}
                                      >
                                        <span className="font-extrabold text-sm">{player.stats?.hits || 0}</span>
                                      </button>
                                    </div>

                                    {/* 안타 종류 선택 팝오버 (안타 버튼 오른쪽에 절대 위치) */}
                                    {expandedHitRow === i && (
                                      <div className="absolute left-full top-1/2 -translate-y-1/2 ml-1 flex gap-1 p-1 bg-white rounded-lg border-2 border-green-300 shadow-lg z-10">
                                        <button
                                          onClick={() => {
                                            handleAddHit(i, '1루타');
                                            setExpandedHitRow(null); // 클릭 후 닫기
                                          }}
                                          className="text-xs px-3 py-1 bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-300 whitespace-nowrap font-semibold"
                                        >
                                          1루타
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleAddHit(i, '2루타');
                                            setExpandedHitRow(null); // 클릭 후 닫기
                                          }}
                                          className="text-xs px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-300 whitespace-nowrap font-semibold"
                                        >
                                          2루타
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleAddHit(i, '3루타');
                                            setExpandedHitRow(null); // 클릭 후 닫기
                                          }}
                                          className="text-xs px-3 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded border border-purple-300 whitespace-nowrap font-semibold"
                                        >
                                          3루타
                                        </button>
                                        <button
                                          onClick={() => {
                                            handleAddHit(i, '홈런');
                                            setExpandedHitRow(null); // 클릭 후 닫기
                                          }}
                                          className="text-xs px-3 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded border border-amber-300 whitespace-nowrap font-semibold"
                                        >
                                          홈런
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>

                                {/* 득점 */}
                                <td className="text-center py-2 align-middle">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <button
                                      onClick={() => handleUpdatePlayerStat(game.isTopInning, i, 'runs', -1)}
                                      disabled={isCompleted}
                                      className={`px-1.5 h-7 rounded-l text-xs font-bold ${
                                        isCompleted
                                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                          : 'bg-red-100 hover:bg-red-200 text-red-600'
                                      }`}
                                    >
                                      -
                                    </button>
                                    <button
                                      onClick={() => handleUpdatePlayerStat(game.isTopInning, i, 'runs', 1)}
                                      disabled={isCompleted}
                                      className={`px-2 h-7 rounded-r text-xs font-bold min-w-[40px] ${
                                        isCompleted
                                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                          : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                                      }`}
                                    >
                                      <span className="font-extrabold text-sm">{player.stats?.runs || 0}</span>
                                    </button>
                                  </div>
                                </td>

                                {/* 쿠키 */}
                                <td className="text-center py-2 align-middle">
                                  <div className="flex items-center justify-center gap-0.5">
                                    <button
                                      onClick={() => handleUpdatePlayerStat(game.isTopInning, i, 'bonusCookie', -1)}
                                      disabled={isCompleted}
                                      className={`px-1.5 h-7 rounded-l text-xs font-bold ${
                                        isCompleted
                                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                          : 'bg-red-100 hover:bg-red-200 text-red-600'
                                      }`}
                                    >
                                      -
                                    </button>
                                    <button
                                      onClick={() => handleUpdatePlayerStat(game.isTopInning, i, 'bonusCookie', 1)}
                                      disabled={isCompleted}
                                      className={`px-2 h-7 rounded-r text-xs font-bold min-w-[40px] ${
                                        isCompleted
                                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                          : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'
                                      }`}
                                    >
                                      <span className="font-extrabold text-sm">{player.stats?.bonusCookie || 0}</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* 안타 상세 기록 (펼쳤을 때만 표시) */}
                              {expandedPlayersTeamB.has(i) && player.currentGameHits && player.currentGameHits.length > 0 && (
                                <tr>
                                  <td colSpan="5" className="py-2 px-4 bg-gray-50/50">
                                    <div className="text-xs text-gray-600 mb-1 font-semibold">타석 기록</div>
                                    <div className="flex flex-wrap gap-2">
                                      {player.currentGameHits.map((hitType, hitIndex) => {
                                        const hitColor = {
                                          '1루타': 'bg-green-100 border-green-300 text-green-800',
                                          '2루타': 'bg-blue-100 border-blue-300 text-blue-800',
                                          '3루타': 'bg-purple-100 border-purple-300 text-purple-800',
                                          '홈런': 'bg-red-100 border-red-300 text-red-800'
                                        }[hitType] || 'bg-gray-100 border-gray-300 text-gray-800';

                                        const hitIcon = {
                                          '1루타': '🟢',
                                          '2루타': '🔵',
                                          '3루타': '🟣',
                                          '홈런': '⭐'
                                        }[hitType] || '⚾';

                                        return (
                                          <div
                                            key={hitIndex}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border ${hitColor} text-xs`}
                                          >
                                            <span>{hitIcon} {hitType}</span>
                                            <button
                                              onClick={() => handleRemoveHit(i, hitIndex)}
                                              disabled={isCompleted}
                                              className={`text-xs px-1.5 py-0.5 rounded ${
                                                isCompleted
                                                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                                  : 'bg-red-100 hover:bg-red-200 text-red-600'
                                              }`}
                                            >
                                              ❌
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </SortableContext>
                  </DndContext>
                </table>
              </div>
              </CardContent>
            </Card>

          {/* 수비팀 */}
          <Card className="flex flex-col overflow-hidden bg-blue-50/30 border-blue-100">
            <CardHeader className="pb-2 flex-shrink-0">
                <div className="flex justify-between items-center w-full">
                  <CardTitle className="text-blue-700">🧤 수비팀 - {defenseTeam.name}</CardTitle>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isCompleted}>
                        <Settings className="w-4 h-4 mr-1" />
                        설정
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => handleOpenLineupChange(game.isTopInning ? 'teamB' : 'teamA')}>
                        🔄 라인업 전체 교체
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleToggleDefenseEditMode}>
                        {isDefenseEditMode ? '✓ 편집 완료' : '✏️ 라인업 편집'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col min-h-0 p-2">
              <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100% - 0px)' }}>
              <table className="w-full text-sm table-fixed">
                  <colgroup>
                    <col style={{ width: '18%' }} />
                    <col style={{ width: '32%' }} />
                    <col style={{ width: '25%' }} />
                    <col style={{ width: '25%' }} />
                  </colgroup>
                  <thead className="sticky top-0 bg-white z-10 shadow-sm">
                    <tr className="border-b-2 border-black">
                      <th className="text-center py-2 bg-white">포지션</th>
                      <th className="text-center py-2 bg-white">이름</th>
                      <th className="text-center py-2 bg-white">🛡️ 수비</th>
                      <th className="text-center py-2 bg-white">🍪 쿠키</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(tempDefenseLineup || defenseTeam.lineup).map((player, i) => (
                      <tr key={i} className="border-b-2 border-black py-4 hover:bg-blue-50" style={{ height: '50px' }}>
                        {/* 포지션 */}
                        <td className="py-2 align-middle text-center">
                          {isDefenseEditMode ? (
                            // 편집 모드: 드롭다운 또는 Input
                            <div className="flex flex-col gap-1 items-center">
                              <Select
                                value={player.position === '직접입력' || !POSITION_OPTIONS.includes(player.position) ? '직접입력' : player.position}
                                onValueChange={(value) => {
                                  if (value === '직접입력') {
                                    handlePositionChange(i, '');
                                  } else {
                                    handlePositionChange(i, value);
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[100px] h-8 text-xs">
                                  <SelectValue placeholder="포지션" />
                                </SelectTrigger>
                                <SelectContent>
                                  {POSITION_OPTIONS.map(pos => (
                                    <SelectItem key={pos} value={pos} className="text-xs">
                                      {pos}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {/* 직접입력 필드 */}
                              {(player.position === '직접입력' || !POSITION_OPTIONS.includes(player.position)) && player.position !== '' && (
                                <Input
                                  type="text"
                                  value={player.position || ''}
                                  onChange={(e) => handlePositionChange(i, e.target.value)}
                                  placeholder="포지션 입력"
                                  className="w-[100px] h-7 text-xs text-center"
                                />
                              )}
                              {/* 빈 상태일 때 Input 표시 */}
                              {player.position === '' && (
                                <Input
                                  type="text"
                                  value=""
                                  onChange={(e) => handlePositionChange(i, e.target.value)}
                                  placeholder="포지션 입력"
                                  className="w-[100px] h-7 text-xs text-center"
                                  autoFocus
                                />
                              )}
                            </div>
                          ) : (
                            // 일반 모드: 텍스트 표시
                            <span className="font-bold">{player.position || '-'}</span>
                          )}
                        </td>
                        <td className="py-2 align-middle text-left pl-2">
                          <div className="flex items-center gap-1">
                            {/* 배지 영역 (최대 3개) - 왼쪽, 고정 너비 */}
                            <div className="flex items-center gap-0.5 w-16 flex-shrink-0">
                              {player.badges && player.badges.length > 0 ? (
                                <>
                                  {player.badges.slice(0, 3).map((badgeId, idx) => {
                                    const badge = Object.values(BADGES).find(b => b.id === badgeId);
                                    return badge ? (
                                      <span key={idx} title={badge.name} className="text-sm cursor-help">
                                        {badge.icon}
                                      </span>
                                    ) : null;
                                  })}
                                  {player.badges.length > 3 && (
                                    <span
                                      className="text-xs text-gray-500 cursor-help"
                                      title={player.badges.slice(3).map(id => {
                                        const b = Object.values(BADGES).find(badge => badge.id === id);
                                        return b ? `${b.icon} ${b.name}` : '';
                                      }).filter(Boolean).join('\n')}
                                    >
                                      +{player.badges.length - 3}
                                    </span>
                                  )}
                                </>
                              ) : null}
                            </div>

                            {/* 이름 + 진행도 - 오른쪽 */}
                            <div className="flex flex-col gap-1 flex-1">
                              <span
                                className="font-bold cursor-pointer underline decoration-dotted decoration-gray-400 hover:decoration-solid hover:decoration-blue-600 hover:text-blue-600 transition-colors"
                                onClick={() => handlePlayerNameClick(player)}
                                title="배지 관리 클릭"
                              >
                                {player.name}
                              </span>
                              <BadgeProgressIndicator
                                progressData={getNextBadgesProgress(calculateLiveTotalStats(player) || player.stats || {}, player.badges || [], BADGES, true)}
                              />
                            </div>

                            {/* 편집 모드일 때만 교체 버튼 표시 */}
                            {isDefenseEditMode && (
                              <button
                                onClick={() => {
                                  setReplacingPlayerIndex(i);
                                  setReplacingTeam('defense');
                                  setShowPlayerReplaceModal(true);
                                }}
                                className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-0.5 rounded transition"
                                title="선수 교체"
                              >
                                교체
                              </button>
                            )}
                          </div>
                        </td>

                        {/* 수비 */}
                        <td className="text-center py-2 align-middle">
                          {isDefenseEditMode ? (
                            // 편집 모드: 읽기 전용 배지
                            <span className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-purple-50 border border-purple-200 text-purple-800 font-bold">
                              수비 <span className="font-extrabold text-base">{player.stats?.goodDefense || 0}</span>
                            </span>
                          ) : (
                            // 일반 모드: +/- 버튼
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                onClick={() => {
                                  // 수비팀은 공격팀의 반대편
                                  const isDefenseTeamA = !game.isTopInning;
                                  handleUpdatePlayerStat(isDefenseTeamA, i, 'goodDefense', -1);
                                }}
                                disabled={isCompleted}
                                className={`px-1.5 h-7 rounded-l text-xs font-bold ${
                                  isCompleted
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-red-100 hover:bg-red-200 text-red-600'
                                }`}
                              >
                                -
                              </button>
                              <button
                                onClick={() => {
                                  // 수비팀은 공격팀의 반대편
                                  const isDefenseTeamA = !game.isTopInning;
                                  handleUpdatePlayerStat(isDefenseTeamA, i, 'goodDefense', 1);
                                }}
                                disabled={isCompleted}
                                className={`px-2 h-7 rounded-r text-xs font-bold min-w-[40px] ${
                                  isCompleted
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-purple-100 hover:bg-purple-200 text-purple-700'
                                }`}
                              >
                                <span className="font-extrabold text-sm">{player.stats?.goodDefense || 0}</span>
                              </button>
                            </div>
                          )}
                        </td>

                        {/* 쿠키 */}
                        <td className="text-center py-2 align-middle">
                          {isDefenseEditMode ? (
                            // 편집 모드: 읽기 전용 배지
                            <span className="inline-flex items-center gap-1 text-sm px-3 py-1 rounded-full bg-yellow-50 border border-yellow-200 text-yellow-800 font-bold">
                              쿠키 <span className="font-extrabold text-base">{player.stats?.bonusCookie || 0}</span>
                            </span>
                          ) : (
                            // 일반 모드: +/- 버튼
                            <div className="flex items-center justify-center gap-0.5">
                              <button
                                onClick={() => {
                                  // 수비팀은 공격팀의 반대편
                                  const isDefenseTeamA = !game.isTopInning;
                                  handleUpdatePlayerStat(isDefenseTeamA, i, 'bonusCookie', -1);
                                }}
                                disabled={isCompleted}
                                className={`px-1.5 h-7 rounded-l text-xs font-bold ${
                                  isCompleted
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-red-100 hover:bg-red-200 text-red-600'
                                }`}
                              >
                                -
                              </button>
                              <button
                                onClick={() => {
                                  // 수비팀은 공격팀의 반대편
                                  const isDefenseTeamA = !game.isTopInning;
                                  handleUpdatePlayerStat(isDefenseTeamA, i, 'bonusCookie', 1);
                                }}
                                disabled={isCompleted}
                                className={`px-2 h-7 rounded-r text-xs font-bold min-w-[40px] ${
                                  isCompleted
                                    ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                                    : 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800'
                                }`}
                              >
                                <span className="font-extrabold text-sm">{player.stats?.bonusCookie || 0}</span>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              </CardContent>
            </Card>
        </div>
      </main>

      {/* 스코어보드 확대 모달 */}
      <Dialog open={isScoreboardExpanded} onOpenChange={setIsScoreboardExpanded}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-center">
              📊 전체 스코어보드 ({game.teamA.name} vs {game.teamB.name})
            </DialogTitle>
          </DialogHeader>

          <div className="mt-4">
            {/* 현재 상황 표시 */}
            <div className="flex justify-center items-center gap-4 mb-6">
              <Badge variant="outline" className="text-lg px-4 py-2">
                {game.currentInning}회 {game.isTopInning ? '초' : '말'}
              </Badge>
              <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white px-6 py-2 rounded-lg font-bold shadow-lg">
                ⚔️ 공격: {attackTeam.name}
              </div>
            </div>

            {/* 전체 이닝 스코어보드 */}
            <div className="overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead>
                  <tr className="bg-sky-100">
                    <th className="border border-gray-300 p-4 font-bold text-lg">팀</th>
                    {Array.from({ length: game.innings }).map((_, i) => (
                      <th
                        key={i}
                        className={`border border-gray-300 p-4 text-lg ${
                          i + 1 === game.currentInning ? 'bg-blue-200' : ''
                        }`}
                      >
                        {i + 1}회
                        {i + 1 === game.currentInning && <span className="ml-1 text-red-500">🔴</span>}
                      </th>
                    ))}
                    <th className="border border-gray-300 p-4 bg-yellow-100 font-bold text-lg">총점</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className={game.isTopInning ? 'bg-blue-50' : ''}>
                    <td className="border border-gray-300 p-4 font-semibold text-lg">{game.teamA.name}</td>
                    {game.scoreBoard.teamA.map((score, idx) => (
                      <td key={idx} className="border border-gray-300 p-4">
                        <span className="font-bold text-3xl">{score}</span>
                      </td>
                    ))}
                    <td className="border border-gray-300 p-4 text-4xl font-bold bg-yellow-50">
                      {game.scoreBoard.teamATotal}
                    </td>
                  </tr>
                  <tr className={!game.isTopInning ? 'bg-blue-50' : ''}>
                    <td className="border border-gray-300 p-4 font-semibold text-lg">{game.teamB.name}</td>
                    {game.scoreBoard.teamB.map((score, idx) => (
                      <td key={idx} className="border border-gray-300 p-4">
                        <span className="font-bold text-3xl">{score}</span>
                      </td>
                    ))}
                    <td className="border border-gray-300 p-4 text-4xl font-bold bg-yellow-50">
                      {game.scoreBoard.teamBTotal}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 닫기 버튼 */}
            <div className="flex justify-center mt-6">
              <Button
                onClick={() => setIsScoreboardExpanded(false)}
                size="lg"
                className="text-base px-8"
              >
                닫기
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 주자 조정 모달 */}
      <RunnerAdjustmentModal
        isOpen={showRunnerModal}
        onClose={handleRunnerModalCancel}
        runners={pendingRunners}
        initialHomeRunners={pendingHomeRunners}
        currentBatter={currentBatter}
        onConfirm={handleRunnerModalConfirm}
      />

      {/* 잔루 확인 모달 */}
      <RunnersLeftOnBaseModal
        isOpen={showRunnersLeftModal}
        onClose={() => setShowRunnersLeftModal(false)}
        runners={runnersLeftData}
        teamName={runnersLeftTeamName}
        onConfirm={executeSwitchTeams}
      />

      {/* 선수 교체 모달 */}
      <Dialog open={showPlayerReplaceModal} onOpenChange={setShowPlayerReplaceModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>선수 교체 - 학급에서 선수 선택</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* 학급별로 학생 목록 표시 */}
            {(() => {
              // 학급별로 학생 그룹화
              const studentsByClass = {};
              students.forEach(student => {
                if (!studentsByClass[student.className]) {
                  studentsByClass[student.className] = [];
                }
                studentsByClass[student.className].push(student);
              });

              // 현재 라인업
              const currentLineup = replacingTeam === 'attack'
                ? (game.isTopInning ? game.teamA.lineup : game.teamB.lineup)
                : (game.isTopInning ? game.teamB.lineup : game.teamA.lineup);

              return Object.keys(studentsByClass).sort().map(className => (
                <div key={className} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h3 className="text-lg font-bold mb-3">{className}</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                    {studentsByClass[className].map(student => {
                      const isInLineup = currentLineup.some(p => p.id === student.id);
                      return (
                        <button
                          key={student.id}
                          onClick={() => {
                            if (!isInLineup) {
                              handleReplacePlayer(replacingTeam, replacingPlayerIndex, student.id);
                              setShowPlayerReplaceModal(false);
                            }
                          }}
                          disabled={isInLineup}
                          className={`
                            px-3 py-2 rounded-lg text-sm font-semibold transition
                            ${isInLineup
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-100 hover:bg-blue-200 text-blue-700 cursor-pointer'
                            }
                          `}
                          title={isInLineup ? '이미 라인업에 있습니다' : '클릭하여 교체'}
                        >
                          {student.name}
                          {isInLineup && <span className="ml-1 text-xs">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ));
            })()}
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowPlayerReplaceModal(false);
                setReplacingPlayerIndex(null);
                setReplacingTeam(null);
              }}
            >
              취소
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 배지 획득 팝업 */}
      <BadgePopup
        isOpen={showBadgePopup}
        onClose={() => {
          // 타이머 정리
          if (badgePopupTimerRef.current) {
            clearTimeout(badgePopupTimerRef.current);
            badgePopupTimerRef.current = null;
          }
          setShowBadgePopup(false);
          setNewBadges([]);
        }}
        badges={newBadges}
      />

      {/* 이닝별 라인업 전체 교체 모달 */}
      <InningLineupChangeModal
        open={showLineupChangeModal}
        onOpenChange={setShowLineupChangeModal}
        teams={teams}
        teamKey={lineupChangeTeamKey}
        teamName={lineupChangeTeamKey === 'teamA' ? game?.teamA?.name : game?.teamB?.name}
        currentInning={game?.currentInning}
        currentLineup={lineupChangeTeamKey === 'teamA' ? game?.teamA?.lineup : game?.teamB?.lineup}
        opponentTeamId={lineupChangeTeamKey === 'teamA' ? game?.teamB?.id : game?.teamA?.id}
        opponentTeamName={lineupChangeTeamKey === 'teamA' ? game?.teamB?.name : game?.teamA?.name}
        onConfirmChange={handleConfirmLineupChange}
      />

      {/* 배지 관리 모달 */}
      {showBadgeManageModal && selectedPlayerForBadge && (
        <PlayerBadgeOrderModal
          player={selectedPlayerForBadge}
          allBadges={BADGES}
          onClose={handleBadgeManageModalClose}
          onSave={handleBadgeOrderSave}
          playerStats={calculateLiveTotalStats(selectedPlayerForBadge) || selectedPlayerForBadge.stats || {}}
        />
      )}
    </div>
  );
};

export default GameScreen;
