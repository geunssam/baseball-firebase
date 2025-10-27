# 📊 통계 시스템 구현 완전 가이드 (IR - Implementation Requirements)

**프로젝트**: baseball-firebase
**작성일**: 2025-01-25
**버전**: v3.0 Final
**참고**: baseball-supabase 통계 시스템 분석 결과

---

## 📐 전체 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                     데이터 흐름 다이어그램                        │
└─────────────────────────────────────────────────────────────────┘

Firestore: finishedGames Collection
  ↓ GameContext에서 실시간 구독
  ↓
MainApp State: finishedGames[]
  ↓ props 전달
  ↓
StatsView Component
  │
  ├─── 📋 경기 기록 탭
  │    └─ 각 경기별 MVP 계산 (calculateMVPScore)
  │
  └─── 📊 통합 스코어보드 탭
       │
       ├─ 경기 카드 리스트 (가로 1열, 최신순)
       │  └─ selectedGameIds[] State 관리
       │
       └─ "통합 분석 보기" 클릭
          ↓
       SelectedGamesModal
          │
          ├─ aggregateClassScores() → 반별 통합 스코어보드
          ├─ aggregatePlayerStats() → 선수별 누적 통계
          ├─ calculatePlayerRanking() → 전체 선수 랭킹
          └─ buildGameDetails() → 경기별 상세 기록
```

---

## 🎯 구현 목표

### ✅ 완료 예정 기능
1. **경기 기록 탭**: 완료된 경기 목록 + 각 경기 MVP
2. **통합 스코어보드 탭**: 경기 선택 UI (카드 그리드)
3. **통합 분석 모달**:
   - 반별 통합 스코어보드
   - 통합 MVP
   - 전체 선수 랭킹 (스크롤)
   - 경기별 상세 기록

### ❌ 제외 기능 (supabase 전용)
- 선수 랭킹 탭 (DB 쿼리 필요)
- 배지 현황 탭 (별도 구현 예정)
- 반별 누적 기록 탭 (전체 경기 모드)

---

## 📦 파일 구조

```
src/
├── components/
│   ├── MainApp.jsx                    # (수정) StatsView 연결
│   ├── StatsView.jsx                  # (신규) 통계 메인 컴포넌트
│   │   ├── 경기 기록 탭
│   │   └── 통합 스코어보드 탭
│   │
│   └── SelectedGamesModal.jsx         # (신규) 통합 분석 모달
│       ├── 반별 통합 스코어보드
│       ├── 통합 MVP
│       ├── 전체 선수 랭킹
│       └── 경기별 상세 기록
│
└── utils/
    ├── mvpCalculator.js               # (기존) MVP 점수 계산
    ├── statsAggregator.js             # (기존) 통계 집계
    └── statsHelpers.js                # (신규) 통계 도우미 함수
        ├── aggregateClassScores()     # 반별 점수 집계
        ├── aggregatePlayerStats()     # 선수별 통계 집계 (simplified)
        ├── calculatePlayerRanking()   # 선수 랭킹 계산
        └── calculatePlayerPoints()    # 선수 총점 계산 (1점 체계)
```

---

## 🔧 핵심 데이터 처리 함수

### **1. statsHelpers.js (신규 생성)**

```javascript
/**
 * statsHelpers.js
 *
 * 통합 분석 모달에서 사용하는 통계 도우미 함수 모음
 */

/**
 * 선수 총점 계산 (1점 체계)
 * @param {Object} stats - { hits, runs, goodDefense, bonusCookie }
 * @returns {number} 총점
 */
export function calculatePlayerPoints(stats) {
  if (!stats) return 0;

  return (
    (stats.hits || 0) +
    (stats.runs || 0) +
    (stats.goodDefense || 0) +
    (stats.bonusCookie || 0)
  );
}

/**
 * 반별 점수 집계 (선택된 경기들)
 * @param {Array} selectedGames - 선택된 경기 목록
 * @param {Array} teams - 전체 팀 목록 (className 매핑용)
 * @returns {Object} { className: { totalScore, inningScores[], games[] } }
 */
export function aggregateClassScores(selectedGames, teams) {
  const classScores = {};

  // 최대 이닝 수 계산 (다양한 이닝 수 대응)
  const maxInnings = selectedGames.length > 0
    ? Math.max(...selectedGames.map(g => g.innings || 3))
    : 3;

  selectedGames.forEach(game => {
    // 현재 teams에서 className 가져오기 (우선순위)
    const currentTeamA = teams.find(t => t.id === game.teamAId);
    const currentTeamB = teams.find(t => t.id === game.teamBId);

    const classA = currentTeamA?.className || game.teamA.className || game.teamA.name;
    const classB = currentTeamB?.className || game.teamB.className || game.teamB.name;

    // 초기화
    if (!classScores[classA]) {
      classScores[classA] = {
        totalScore: 0,
        games: [],
        inningScores: Array(maxInnings).fill(0)
      };
    }
    if (!classScores[classB]) {
      classScores[classB] = {
        totalScore: 0,
        games: [],
        inningScores: Array(maxInnings).fill(0)
      };
    }

    // 이닝별 점수 합산 (범위 체크)
    game.scoreboard.teamA.forEach((score, idx) => {
      if (idx < maxInnings) {
        classScores[classA].inningScores[idx] += score;
      }
    });

    game.scoreboard.teamB.forEach((score, idx) => {
      if (idx < maxInnings) {
        classScores[classB].inningScores[idx] += score;
      }
    });

    // 총점 합산
    const scoreA = game.scoreboard.teamA.reduce((a, b) => a + b, 0);
    const scoreB = game.scoreboard.teamB.reduce((a, b) => a + b, 0);

    classScores[classA].totalScore += scoreA;
    classScores[classB].totalScore += scoreB;

    classScores[classA].games.push(game.id);
    classScores[classB].games.push(game.id);
  });

  return classScores;
}

/**
 * 선수별 통계 집계 (간소화 버전 - 통합 분석 모달 전용)
 * @param {Array} selectedGames - 선택된 경기 목록
 * @returns {Object} { playerId: { name, className, hits, runs, ..., totalPoints, gamesPlayed } }
 */
export function aggregatePlayerStats(selectedGames) {
  const playerStatsMap = {};

  selectedGames.forEach(game => {
    const allPlayers = [
      ...(game.teamA?.lineup || []),
      ...(game.teamB?.lineup || [])
    ];

    allPlayers.forEach(player => {
      const playerId = player.playerId || player.id;
      if (!playerId) return;

      if (!playerStatsMap[playerId]) {
        playerStatsMap[playerId] = {
          id: playerId,
          name: player.name,
          className: player.className,
          hits: 0,
          runs: 0,
          goodDefense: 0,
          bonusCookie: 0,
          gamesPlayed: 0
        };
      }

      const stats = playerStatsMap[playerId];
      stats.hits += player.stats?.hits || 0;
      stats.runs += player.stats?.runs || 0;
      stats.goodDefense += player.stats?.goodDefense || 0;
      stats.bonusCookie += player.stats?.bonusCookie || 0;
      stats.gamesPlayed += 1;
    });
  });

  return playerStatsMap;
}

/**
 * 선수 랭킹 계산 (MVP 점수 기준)
 * @param {Object} playerStatsMap - aggregatePlayerStats 결과
 * @returns {Array} 랭킹 배열 (총점 내림차순)
 */
export function calculatePlayerRanking(playerStatsMap) {
  const ranking = Object.values(playerStatsMap).map(player => ({
    ...player,
    totalPoints: calculatePlayerPoints(player)
  })).sort((a, b) => b.totalPoints - a.totalPoints);

  return ranking;
}

/**
 * MVP 선정 (1위 선수)
 * @param {Array} ranking - calculatePlayerRanking 결과
 * @returns {Object|null} MVP 선수 또는 null
 */
export function getMVP(ranking) {
  return ranking.length > 0 && ranking[0].totalPoints > 0 ? ranking[0] : null;
}

/**
 * 경기별 상세 정보 구성
 * @param {Object} game - 경기 객체
 * @returns {Object} 상세 정보 { teamAPlayers, teamBPlayers, ... }
 */
export function buildGameDetails(game) {
  return {
    gameId: game.id,
    teamAName: game.teamA?.name || '팀A',
    teamBName: game.teamB?.name || '팀B',
    teamAPlayers: (game.teamA?.lineup || []).filter(p => p.id),
    teamBPlayers: (game.teamB?.lineup || []).filter(p => p.id),
    scoreA: game.scoreboard?.teamA?.reduce((a, b) => a + b, 0) || 0,
    scoreB: game.scoreboard?.teamB?.reduce((a, b) => a + b, 0) || 0,
    winner: getWinner(game),
    innings: game.innings || 3,
    createdAt: game.createdAt,
    scoreboard: game.scoreboard
  };
}

/**
 * 승자 판정
 */
function getWinner(game) {
  const scoreA = game.scoreboard?.teamA?.reduce((a, b) => a + b, 0) || 0;
  const scoreB = game.scoreboard?.teamB?.reduce((a, b) => a + b, 0) || 0;

  if (scoreA > scoreB) return 'teamA';
  if (scoreB > scoreA) return 'teamB';
  return 'draw';
}
```

---

## 🎨 UI 컴포넌트 상세 설계

### **1. StatsView.jsx (신규 생성)**

#### **Props**
```javascript
{
  finishedGames: Array,      // 완료된 경기 목록
  teams: Array,              // 팀 목록 (className 매핑용)
  onBack: Function           // 대시보드로 돌아가기
}
```

#### **State**
```javascript
const [statsSubTab, setStatsSubTab] = useState('history');
// 'history' | 'scoreboard'

const [selectedGameIds, setSelectedGameIds] = useState([]);
// 선택된 경기 ID 배열

const [showSelectedGamesModal, setShowSelectedGamesModal] = useState(false);
// 통합 분석 모달 표시 여부
```

#### **완전한 컴포넌트 코드**

```javascript
import { useState } from 'react';
import { calculateMVPScore } from '../utils/mvpCalculator';
import SelectedGamesModal from './SelectedGamesModal';

const StatsView = ({ finishedGames, teams, onBack }) => {
  const [statsSubTab, setStatsSubTab] = useState('history');
  const [selectedGameIds, setSelectedGameIds] = useState([]);
  const [showSelectedGamesModal, setShowSelectedGamesModal] = useState(false);

  return (
    <div className="space-y-4">
      {/* 헤더 */}
      <div className="bg-white rounded-lg shadow-md p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-bold transition"
          >
            ← 뒤로
          </button>
          <h1 className="text-2xl font-bold">📊 통합 통계</h1>
        </div>
      </div>

      {finishedGames.length === 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center text-gray-500">
          종료된 경기가 없습니다.
        </div>
      ) : (
        <>
          {/* 서브탭 네비게이션 */}
          <div className="bg-white rounded-lg shadow-md p-2">
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => setStatsSubTab('history')}
                className={`px-6 py-3 rounded-lg font-bold transition ${
                  statsSubTab === 'history'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                📋 경기 기록
              </button>
              <button
                onClick={() => setStatsSubTab('scoreboard')}
                className={`px-6 py-3 rounded-lg font-bold transition ${
                  statsSubTab === 'scoreboard'
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'bg-gray-200 hover:bg-gray-300 text-gray-700'
                }`}
              >
                📊 통합 스코어보드
              </button>
            </div>
          </div>

          {/* 📋 경기 기록 탭 */}
          {statsSubTab === 'history' && (
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">📋 종료된 경기 목록</h2>
                <div className="text-sm text-gray-600">
                  총 <span className="font-bold text-blue-600">{finishedGames.length}</span>개 경기
                </div>
              </div>

              <div className="space-y-4">
                {[...finishedGames].reverse().map((game, idx) => {
                  const scoreA = game.scoreboard?.teamA?.reduce((a, b) => a + b, 0) || 0;
                  const scoreB = game.scoreboard?.teamB?.reduce((a, b) => a + b, 0) || 0;
                  const winner = scoreA > scoreB ? 'A' : scoreA < scoreB ? 'B' : 'draw';

                  // 각 경기의 MVP 계산
                  const allPlayers = [...(game.teamA?.lineup || []), ...(game.teamB?.lineup || [])];
                  const mvpPlayer = allPlayers.reduce((max, player) => {
                    const score = calculateMVPScore(player.stats);
                    return score > (max.score || 0) ? { ...player, score } : max;
                  }, {});

                  return (
                    <details
                      key={game.id || idx}
                      className="border-2 border-gray-300 rounded-xl bg-gradient-to-br from-gray-50 to-white hover:shadow-lg transition-shadow"
                    >
                      <summary className="cursor-pointer p-5 hover:bg-gray-100 rounded-xl transition-colors">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-xl font-bold">
                                {game.teamA?.name} <span className="text-gray-400">vs</span> {game.teamB?.name}
                              </h3>
                              {winner !== 'draw' && (
                                <span className="bg-yellow-400 text-yellow-900 px-3 py-1 rounded-full text-sm font-bold">
                                  🏆 {winner === 'A' ? game.teamA?.name : game.teamB?.name} 승리
                                </span>
                              )}
                              {winner === 'draw' && (
                                <span className="bg-gray-400 text-white px-3 py-1 rounded-full text-sm font-bold">
                                  무승부
                                </span>
                              )}
                            </div>

                            <div className="flex gap-4 text-sm text-gray-600">
                              <span>📅 {new Date(game.createdAt || Date.now()).toLocaleString('ko-KR', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}</span>
                              <span>⚾ {game.innings || 3}회 진행</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-3xl font-black">
                              <span className={winner === 'A' ? 'text-blue-600' : 'text-gray-600'}>{scoreA}</span>
                              <span className="text-gray-400 mx-2">:</span>
                              <span className={winner === 'B' ? 'text-red-600' : 'text-gray-600'}>{scoreB}</span>
                            </div>
                          </div>
                        </div>
                      </summary>

                      {/* 상세 내용 */}
                      <div className="p-5 pt-0 space-y-4" onClick={(e) => e.stopPropagation()}>
                        {/* MVP 정보 */}
                        {mvpPlayer.name && mvpPlayer.score > 0 && (
                          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-3 flex items-center gap-3">
                            <span className="text-3xl">👑</span>
                            <div className="flex-1">
                              <div className="text-sm text-yellow-800 font-semibold">이 경기 MVP</div>
                              <div className="text-lg font-bold text-yellow-900">{mvpPlayer.name}</div>
                            </div>
                            <div className="text-right text-sm text-yellow-800">
                              <div>⚾ {mvpPlayer.stats?.hits || 0}안타</div>
                              <div>🏃 {mvpPlayer.stats?.runs || 0}득점</div>
                              <div className="font-bold text-orange-600">{mvpPlayer.score}점</div>
                            </div>
                          </div>
                        )}

                        {/* 이닝별 점수 */}
                        <details className="mt-4">
                          <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800 font-semibold">
                            📊 이닝별 점수 보기
                          </summary>
                          <table className="w-full text-center border-collapse text-sm mt-2">
                            <thead className="bg-gray-100">
                              <tr>
                                <th className="border border-gray-300 p-2">팀</th>
                                {Array.from({ length: game.innings }, (_, i) => (
                                  <th key={i} className="border border-gray-300 p-2">{i + 1}회</th>
                                ))}
                                <th className="border border-gray-300 p-2 bg-yellow-100">총점</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr className={winner === 'A' ? 'bg-blue-50' : ''}>
                                <td className="border border-gray-300 p-2 font-semibold">{game.teamA?.name}</td>
                                {game.scoreboard?.teamA?.map((s, i) => (
                                  <td key={i} className="border border-gray-300 p-2">{s}</td>
                                ))}
                                <td className="border border-gray-300 p-2 font-bold">{scoreA}</td>
                              </tr>
                              <tr className={winner === 'B' ? 'bg-red-50' : ''}>
                                <td className="border border-gray-300 p-2 font-semibold">{game.teamB?.name}</td>
                                {game.scoreboard?.teamB?.map((s, i) => (
                                  <td key={i} className="border border-gray-300 p-2">{s}</td>
                                ))}
                                <td className="border border-gray-300 p-2 font-bold">{scoreB}</td>
                              </tr>
                            </tbody>
                          </table>
                        </details>
                      </div>
                    </details>
                  );
                })}
              </div>
            </div>
          )}

          {/* 📊 통합 스코어보드 탭 */}
          {statsSubTab === 'scoreboard' && (
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl shadow-2xl p-6">
              <h2 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                📊 통합할 경기를 선택하세요
              </h2>

              {/* 선택 상태 및 제어 버튼 */}
              <div className="bg-white rounded-xl p-4 mb-6 shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-lg">
                    선택된 경기: <span className="text-blue-600">{selectedGameIds.length}</span>개
                  </h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedGameIds(finishedGames.map(g => g.id))}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold transition"
                    >
                      전체 선택
                    </button>
                    <button
                      onClick={() => setSelectedGameIds([])}
                      className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg font-semibold transition"
                    >
                      전체 해제
                    </button>
                  </div>
                </div>

                {/* 경기 카드 리스트 (가로 1열, 최신순) */}
                <div className="space-y-3 max-h-[600px] overflow-y-auto p-2">
                  {[...finishedGames].reverse().map(game => {
                    const scoreA = game.scoreboard?.teamA?.reduce((a, b) => a + b, 0) || 0;
                    const scoreB = game.scoreboard?.teamB?.reduce((a, b) => a + b, 0) || 0;
                    const winner = scoreA > scoreB ? 'A' : scoreA < scoreB ? 'B' : 'draw';
                    const isSelected = selectedGameIds.includes(game.id);

                    const gameDate = game.startTime ? new Date(game.startTime) :
                                    game.createdAt ? new Date(game.createdAt) : new Date();
                    const dateStr = gameDate.toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    });
                    const timeStr = gameDate.toLocaleTimeString('ko-KR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    });

                    return (
                      <div
                        key={game.id}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedGameIds(selectedGameIds.filter(id => id !== game.id));
                          } else {
                            setSelectedGameIds([...selectedGameIds, game.id]);
                          }
                        }}
                        className={`
                          border-4 rounded-xl p-4 cursor-pointer transition-all transform hover:scale-[1.01]
                          flex items-center justify-between gap-4
                          ${isSelected
                            ? 'border-blue-500 bg-blue-50 shadow-lg'
                            : 'border-gray-300 bg-white hover:border-blue-300 hover:shadow-md'
                          }
                        `}
                      >
                        {/* 왼쪽: 경기 정보 */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-lg">
                              {game.teamA?.name || '팀A'} vs {game.teamB?.name || '팀B'}
                            </h3>
                            <div className="text-2xl font-black">
                              <span className={winner === 'A' ? 'text-blue-600' : 'text-gray-600'}>{scoreA}</span>
                              <span className="text-gray-400 mx-1">:</span>
                              <span className={winner === 'B' ? 'text-red-600' : 'text-gray-600'}>{scoreB}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 mb-2">
                            {winner === 'A' && (
                              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-bold">
                                🏆 {game.teamA?.name} 승리
                              </span>
                            )}
                            {winner === 'B' && (
                              <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-bold">
                                🏆 {game.teamB?.name} 승리
                              </span>
                            )}
                            {winner === 'draw' && (
                              <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-bold">
                                ⚖ 무승부
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1">
                              <span>📅</span>
                              <span>{dateStr}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>🕐</span>
                              <span>{timeStr}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <span>⚾</span>
                              <span>{game.innings || 3}이닝</span>
                            </div>
                          </div>
                        </div>

                        {/* 오른쪽: 선택 아이콘 */}
                        <div className="flex-shrink-0">
                          {isSelected ? (
                            <span className="text-4xl animate-bounce">✅</span>
                          ) : (
                            <div className="w-12 h-12 border-4 border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                              ☐
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 선택 완료 버튼 */}
                {selectedGameIds.length > 0 && (
                  <div className="mt-6 flex justify-center">
                    <button
                      onClick={() => setShowSelectedGamesModal(true)}
                      className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-lg transition-all transform hover:scale-105"
                    >
                      ✅ 통합 분석 보기 ({selectedGameIds.length}개 경기)
                    </button>
                  </div>
                )}

                {/* 경기 미선택 안내 */}
                {selectedGameIds.length === 0 && (
                  <div className="mt-6 bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 text-center text-yellow-800">
                    ⚠️ 통합 분석할 경기를 선택해주세요
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* 통합 분석 모달 */}
      {showSelectedGamesModal && (
        <SelectedGamesModal
          selectedGames={finishedGames.filter(g => selectedGameIds.includes(g.id))}
          teams={teams}
          onClose={() => setShowSelectedGamesModal(false)}
        />
      )}
    </div>
  );
};

export default StatsView;
```

---

### **2. SelectedGamesModal.jsx (신규 생성)**

#### **Props**
```javascript
{
  selectedGames: Array,  // 선택된 경기 목록
  teams: Array,          // 팀 목록
  onClose: Function      // 모달 닫기
}
```

#### **완전한 컴포넌트 코드**

```javascript
import { aggregateClassScores, aggregatePlayerStats, calculatePlayerRanking, getMVP, calculatePlayerPoints } from '../utils/statsHelpers';

const SelectedGamesModal = ({ selectedGames, teams, onClose }) => {
  // 1. 반별 점수 집계
  const classScores = aggregateClassScores(selectedGames, teams);
  const classNames = Object.keys(classScores).sort();
  const maxInnings = selectedGames.length > 0
    ? Math.max(...selectedGames.map(g => g.innings || 3))
    : 3;

  // 2. 선수 통계 집계
  const playerStatsMap = aggregatePlayerStats(selectedGames);
  const allPlayersRanking = calculatePlayerRanking(playerStatsMap);
  const mvp = getMVP(allPlayersRanking);

  // 3. 이닝 수 경고
  const inningCounts = [...new Set(selectedGames.map(g => g.innings))];
  const hasMultipleInnings = inningCounts.length > 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 모달 헤더 */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl flex justify-between items-center z-10">
          <div>
            <h2 className="text-3xl font-bold">🏆 선택된 경기 통합 분석</h2>
            <p className="text-sm opacity-90 mt-1">총 {selectedGames.length}개 경기</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition"
          >
            <span className="text-3xl">×</span>
          </button>
        </div>

        {/* 모달 내용 */}
        <div className="p-6 space-y-8">
          {/* 섹션 1: 반별 통합 스코어보드 */}
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl p-6 shadow-lg">
            <h3 className="text-2xl font-bold mb-4 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              🏆 반별 통합 스코어보드
            </h3>

            {/* 이닝 수 경고 */}
            {hasMultipleInnings && (
              <div className="bg-yellow-50 border-2 border-yellow-400 rounded-lg p-4 mb-4 flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div>
                  <div className="font-bold text-yellow-900 mb-1">이닝 수가 다른 경기가 포함되어 있습니다</div>
                  <div className="text-sm text-yellow-800">
                    통합 스코어보드는 가장 긴 경기({Math.max(...inningCounts)}이닝) 기준으로 표시됩니다.
                    짧은 경기의 나머지 이닝은 0점으로 처리됩니다.
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl p-4 overflow-x-auto">
              <table className="w-full text-center border-collapse">
                <thead className="bg-gradient-to-r from-blue-500 to-purple-500 text-white">
                  <tr>
                    <th className="border border-gray-300 p-3 text-lg font-bold">반</th>
                    {Array.from({length: maxInnings}, (_, i) => (
                      <th key={i} className="border border-gray-300 p-3 text-sm font-bold">{i + 1}회</th>
                    ))}
                    <th className="border border-gray-300 p-3 text-lg font-bold bg-yellow-600">총점</th>
                  </tr>
                </thead>
                <tbody>
                  {classNames.map(className => {
                    const classData = classScores[className];
                    const isWinner = classData.totalScore === Math.max(...classNames.map(cn => classScores[cn].totalScore));

                    return (
                      <tr key={className} className={isWinner ? 'bg-yellow-100 font-bold' : 'hover:bg-gray-50'}>
                        <td className="border border-gray-300 p-3 text-xl font-bold">
                          {isWinner && '👑 '}{className}
                        </td>
                        {classData.inningScores.map((score, i) => (
                          <td key={i} className="border border-gray-300 p-3 text-lg font-semibold">
                            {score}
                          </td>
                        ))}
                        <td className="border border-gray-300 p-3 text-2xl font-black text-blue-600">
                          {classData.totalScore}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 섹션 2: 통합 MVP */}
          {mvp && (
            <div className="bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-50 rounded-2xl p-8 border-4 border-yellow-400 shadow-2xl">
              <div className="flex items-center gap-6 mb-6">
                <span className="text-8xl animate-pulse">👑</span>
                <div>
                  <h3 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600">
                    통합 MVP
                  </h3>
                  <p className="text-base text-yellow-800 font-semibold mt-1">
                    {selectedGames.length}개 경기 기준
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-6 shadow-inner border-2 border-yellow-300">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-5xl font-black text-yellow-900 mb-2">{mvp.name}</div>
                    <div className="text-2xl text-gray-600 font-semibold">{mvp.className}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">
                      {mvp.totalPoints}점
                    </div>
                    <div className="text-base text-gray-600 mt-3 space-x-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="text-xl">⚾</span>
                        <span className="font-bold">{mvp.hits}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="text-xl">🏃</span>
                        <span className="font-bold">{mvp.runs}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="text-xl">🛡️</span>
                        <span className="font-bold">{mvp.goodDefense}</span>
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <span className="text-xl">🍪</span>
                        <span className="font-bold">{mvp.bonusCookie}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 섹션 3: 전체 선수 랭킹 */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              📈 전체 선수 랭킹 ({allPlayersRanking.length}명)
            </h3>

            <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-3 mb-4 text-sm text-blue-800">
              💡 선택된 경기에 출전한 모든 선수의 통합 기록입니다. 스크롤하여 전체 순위를 확인하세요.
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-center border-collapse">
                <thead className="bg-gradient-to-r from-blue-500 to-purple-500 text-white sticky top-0 z-10">
                  <tr>
                    <th className="border border-gray-300 p-3 text-sm font-bold">순위</th>
                    <th className="border border-gray-300 p-3 text-sm font-bold">이름</th>
                    <th className="border border-gray-300 p-3 text-sm font-bold">반</th>
                    <th className="border border-gray-300 p-3 text-sm font-bold">⚾ 안타</th>
                    <th className="border border-gray-300 p-3 text-sm font-bold">🏃 득점</th>
                    <th className="border border-gray-300 p-3 text-sm font-bold">🛡️ 수비</th>
                    <th className="border border-gray-300 p-3 text-sm font-bold">🍪 보너스</th>
                    <th className="border border-gray-300 p-3 text-sm font-bold bg-yellow-600">총점</th>
                    <th className="border border-gray-300 p-3 text-sm font-bold">경기수</th>
                  </tr>
                </thead>
                <tbody>
                  {allPlayersRanking.map((player, idx) => {
                    const isMVP = idx === 0;
                    const isTop3 = idx < 3;

                    return (
                      <tr
                        key={player.id}
                        className={
                          isMVP ? 'bg-yellow-100 font-bold' :
                          isTop3 ? 'bg-blue-50' :
                          'hover:bg-gray-50'
                        }
                      >
                        <td className="border border-gray-300 p-3">
                          {isMVP && '👑 '}
                          {idx === 1 && '🥈 '}
                          {idx === 2 && '🥉 '}
                          {idx + 1}위
                        </td>
                        <td className="border border-gray-300 p-3 font-semibold">
                          {player.name}
                        </td>
                        <td className="border border-gray-300 p-3 text-sm">
                          {player.className}
                        </td>
                        <td className="border border-gray-300 p-3">{player.hits}</td>
                        <td className="border border-gray-300 p-3">{player.runs}</td>
                        <td className="border border-gray-300 p-3">{player.goodDefense}</td>
                        <td className="border border-gray-300 p-3">{player.bonusCookie}</td>
                        <td className="border border-gray-300 p-3 text-xl font-black text-blue-600">
                          {player.totalPoints}
                        </td>
                        <td className="border border-gray-300 p-3 text-sm text-gray-600">
                          {player.gamesPlayed}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {allPlayersRanking.length > 10 && (
              <div className="mt-4 text-center text-sm text-gray-500 animate-bounce">
                🔽 아래로 스크롤하여 더 많은 선수 확인
              </div>
            )}
          </div>

          {/* 섹션 4: 경기별 상세 기록 */}
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              📋 경기별 상세 기록
            </h3>

            <div className="space-y-4">
              {selectedGames.map((game, gameIdx) => {
                const teamAPlayers = (game.teamA?.lineup || []).filter(p => p.id);
                const teamBPlayers = (game.teamB?.lineup || []).filter(p => p.id);
                const teamAName = game.teamA?.name || '팀A';
                const teamBName = game.teamB?.name || '팀B';
                const scoreA = game.scoreboard?.teamA?.reduce((a, b) => a + b, 0) || 0;
                const scoreB = game.scoreboard?.teamB?.reduce((a, b) => a + b, 0) || 0;
                const winner = scoreA > scoreB ? 'teamA' : scoreA < scoreB ? 'teamB' : 'draw';

                return (
                  <details key={game.id} className="bg-gray-50 rounded-lg overflow-hidden" open={gameIdx === 0}>
                    <summary className="cursor-pointer p-4 hover:bg-gray-100 transition-colors font-semibold flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <span className="text-lg">🏆</span>
                        <div>
                          <div className="font-bold text-lg">
                            {teamAName} vs {teamBName}
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(game.createdAt).toLocaleDateString('ko-KR', {
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })} • {game.innings}이닝
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-black text-blue-600">
                          {scoreA} : {scoreB}
                        </div>
                        <div className="text-sm text-gray-500">
                          {winner === 'teamA' ? `🏆 ${teamAName} 승리` :
                           winner === 'teamB' ? `🏆 ${teamBName} 승리` :
                           '무승부'}
                        </div>
                      </div>
                    </summary>

                    <div className="p-4 space-y-4">
                      {/* 이닝별 점수 테이블 */}
                      <div className="overflow-x-auto">
                        <table className="w-full text-center border-collapse">
                          <thead className="bg-gradient-to-r from-blue-400 to-purple-400 text-white">
                            <tr>
                              <th className="border border-gray-300 p-2 text-sm font-bold">팀</th>
                              {Array.from({length: game.innings}, (_, i) => (
                                <th key={i} className="border border-gray-300 p-2 text-xs font-bold">{i + 1}회</th>
                              ))}
                              <th className="border border-gray-300 p-2 text-sm font-bold bg-yellow-600">총점</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="hover:bg-gray-50">
                              <td className="border border-gray-300 p-2 font-bold">{teamAName}</td>
                              {Array.from({length: game.innings}, (_, i) => (
                                <td key={i} className="border border-gray-300 p-2">
                                  {game.scoreboard?.teamA?.[i] ?? 0}
                                </td>
                              ))}
                              <td className="border border-gray-300 p-2 text-xl font-black text-blue-600">
                                {scoreA}
                              </td>
                            </tr>
                            <tr className="hover:bg-gray-50">
                              <td className="border border-gray-300 p-2 font-bold">{teamBName}</td>
                              {Array.from({length: game.innings}, (_, i) => (
                                <td key={i} className="border border-gray-300 p-2">
                                  {game.scoreboard?.teamB?.[i] ?? 0}
                                </td>
                              ))}
                              <td className="border border-gray-300 p-2 text-xl font-black text-blue-600">
                                {scoreB}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* 선수별 기록 */}
                      <details className="bg-white rounded-lg overflow-hidden">
                        <summary className="cursor-pointer p-3 hover:bg-gray-50 transition-colors font-semibold text-sm">
                          📝 선수별 기록 보기
                        </summary>
                        <div className="p-3 space-y-4">
                          {/* 팀 A */}
                          <div>
                            <div className="font-bold text-blue-600 mb-2">{teamAName}</div>
                            {teamAPlayers.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-center border-collapse text-xs">
                                  <thead className="bg-blue-100">
                                    <tr>
                                      <th className="border border-gray-300 p-1 font-bold">이름</th>
                                      <th className="border border-gray-300 p-1 font-bold">⚾ 안타</th>
                                      <th className="border border-gray-300 p-1 font-bold">🏃 득점</th>
                                      <th className="border border-gray-300 p-1 font-bold">🛡️ 수비</th>
                                      <th className="border border-gray-300 p-1 font-bold">🍪 보너스</th>
                                      <th className="border border-gray-300 p-1 font-bold bg-yellow-100">총점</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {teamAPlayers.map(player => (
                                      <tr key={player.id} className="hover:bg-gray-50">
                                        <td className="border border-gray-300 p-1 font-semibold">{player.name}</td>
                                        <td className="border border-gray-300 p-1">{player.stats?.hits || 0}</td>
                                        <td className="border border-gray-300 p-1">{player.stats?.runs || 0}</td>
                                        <td className="border border-gray-300 p-1">{player.stats?.goodDefense || 0}</td>
                                        <td className="border border-gray-300 p-1">{player.stats?.bonusCookie || 0}</td>
                                        <td className="border border-gray-300 p-1 font-bold text-blue-600">
                                          {calculatePlayerPoints(player.stats)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">선수 정보 없음</p>
                            )}
                          </div>

                          {/* 팀 B */}
                          <div>
                            <div className="font-bold text-red-600 mb-2">{teamBName}</div>
                            {teamBPlayers.length > 0 ? (
                              <div className="overflow-x-auto">
                                <table className="w-full text-center border-collapse text-xs">
                                  <thead className="bg-red-100">
                                    <tr>
                                      <th className="border border-gray-300 p-1 font-bold">이름</th>
                                      <th className="border border-gray-300 p-1 font-bold">⚾ 안타</th>
                                      <th className="border border-gray-300 p-1 font-bold">🏃 득점</th>
                                      <th className="border border-gray-300 p-1 font-bold">🛡️ 수비</th>
                                      <th className="border border-gray-300 p-1 font-bold">🍪 보너스</th>
                                      <th className="border border-gray-300 p-1 font-bold bg-yellow-100">총점</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {teamBPlayers.map(player => (
                                      <tr key={player.id} className="hover:bg-gray-50">
                                        <td className="border border-gray-300 p-1 font-semibold">{player.name}</td>
                                        <td className="border border-gray-300 p-1">{player.stats?.hits || 0}</td>
                                        <td className="border border-gray-300 p-1">{player.stats?.runs || 0}</td>
                                        <td className="border border-gray-300 p-1">{player.stats?.goodDefense || 0}</td>
                                        <td className="border border-gray-300 p-1">{player.stats?.bonusCookie || 0}</td>
                                        <td className="border border-gray-300 p-1 font-bold text-red-600">
                                          {calculatePlayerPoints(player.stats)}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            ) : (
                              <p className="text-sm text-gray-500">선수 정보 없음</p>
                            )}
                          </div>
                        </div>
                      </details>
                    </div>
                  </details>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SelectedGamesModal;
```

---

## 📝 MainApp.jsx 연결 코드

```javascript
// src/components/MainApp.jsx

import StatsView from './StatsView';

// ... 기존 코드 ...

{/* 📊 통합 통계 뷰 */}
{dashboardView === 'stats' && (
  <StatsView
    finishedGames={finishedGames}
    teams={teams}
    onBack={() => setDashboardView('dashboard')}
  />
)}
```

---

## ⏱️ 구현 체크리스트

### **Phase 1: statsHelpers.js 생성** (30분)
- [ ] `src/utils/statsHelpers.js` 파일 생성
- [ ] `calculatePlayerPoints()` 함수 작성
- [ ] `aggregateClassScores()` 함수 작성
- [ ] `aggregatePlayerStats()` 함수 작성 (간소화 버전)
- [ ] `calculatePlayerRanking()` 함수 작성
- [ ] `getMVP()` 함수 작성
- [ ] `buildGameDetails()` 함수 작성 (선택)

### **Phase 2: StatsView.jsx 생성** (1시간)
- [ ] `src/components/StatsView.jsx` 파일 생성
- [ ] Props, State 정의
- [ ] 헤더 (뒤로가기 버튼)
- [ ] 서브탭 네비게이션 (2개)
- [ ] **경기 기록 탭**:
  - [ ] 경기 목록 (details)
  - [ ] 각 경기 MVP 계산 및 표시
  - [ ] 이닝별 점수 (nested details)
- [ ] **통합 스코어보드 탭**:
  - [ ] 선택 상태 헤더 (전체선택/해제)
  - [ ] 경기 카드 리스트 (가로 1열, 최신순)
  - [ ] 카드 클릭 선택/해제
  - [ ] 선택 완료 버튼

### **Phase 3: SelectedGamesModal.jsx 생성** (1시간 30분)
- [ ] `src/components/SelectedGamesModal.jsx` 파일 생성
- [ ] 모달 헤더 (sticky)
- [ ] **섹션 1: 반별 통합 스코어보드**
  - [ ] `aggregateClassScores()` 호출
  - [ ] 이닝별 점수 테이블
  - [ ] 최다 득점 반 표시 (👑)
  - [ ] 이닝 수 경고 메시지
- [ ] **섹션 2: 통합 MVP**
  - [ ] `getMVP()` 호출
  - [ ] 큰 강조 카드 (그라데이션)
  - [ ] 애니메이션 (pulse)
- [ ] **섹션 3: 전체 선수 랭킹**
  - [ ] `calculatePlayerRanking()` 호출
  - [ ] 스크롤 가능한 테이블
  - [ ] sticky 헤더
  - [ ] 1-3위 배경 강조
- [ ] **섹션 4: 경기별 상세 기록**
  - [ ] details 구조
  - [ ] 이닝별 점수 테이블
  - [ ] 선수별 기록 (nested details)

### **Phase 4: MainApp.jsx 연결** (15분)
- [ ] StatsView import
- [ ] `dashboardView === 'stats'` 조건부 렌더링
- [ ] props 전달 (finishedGames, teams, onBack)

### **Phase 5: 테스트 및 버그 수정** (30분)
- [ ] 완료 경기 10개 이상 데이터 생성
- [ ] 경기 선택/해제 테스트
- [ ] 통합 분석 모달 테스트
- [ ] 전체 선수 랭킹 스크롤 테스트
- [ ] 반응형 디자인 확인
- [ ] 경기 0개일 때 처리

---

## 🚀 예상 소요 시간

| Phase | 작업 | 시간 |
|-------|------|------|
| 1 | statsHelpers.js 생성 | 30분 |
| 2 | StatsView.jsx 생성 | 1시간 |
| 3 | SelectedGamesModal.jsx 생성 | 1시간 30분 |
| 4 | MainApp 연결 | 15분 |
| 5 | 테스트 및 버그 수정 | 30분 |
| **총합** | | **3시간 45분** |

---

## 🎨 스타일 가이드

### **색상 팔레트**
```css
/* MVP 카드 */
bg-gradient-to-br from-yellow-50 via-orange-50 to-yellow-50
border-yellow-400
text-yellow-900

/* 헤더 그라데이션 */
bg-gradient-to-r from-blue-600 to-purple-600
bg-gradient-to-r from-blue-500 to-purple-500

/* 랭킹 배경 */
1위: bg-yellow-100
2-3위: bg-blue-50
4위 이하: hover:bg-gray-50

/* 최다 득점 반 */
bg-yellow-100 font-bold
👑 아이콘
```

### **아이콘 매핑**
```
👑 MVP / 1위
🥈 2위
🥉 3위
⚾ 안타
🏃 득점
🛡️ 수비
🍪 보너스
🏆 승자
⚖ 무승부
📊 통계
📋 기록
📈 랭킹
✅ 선택됨
☐ 미선택
⚠️ 경고
```

---

## ✅ 완료 기준

1. **경기 기록 탭**: 모든 완료 경기 표시, MVP 정확히 계산
2. **통합 스코어보드 탭**: 경기 선택 UI 동작, 최신순 정렬
3. **통합 분석 모달**: 4개 섹션 모두 정상 렌더링
4. **전체 선수 랭킹**: 스크롤 가능, sticky 헤더 동작
5. **반응형**: 모바일/태블릿/데스크톱 모두 정상 표시

---

**이 문서를 기반으로 TODO 순서대로 구현을 진행합니다!** 🚀
