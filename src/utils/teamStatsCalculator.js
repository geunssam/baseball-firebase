/**
 * teamStatsCalculator.js
 * 팀별 통계를 계산하는 유틸리티 함수
 * classStatsCalculator의 로직을 팀 단위로 재사용
 */

import { collection, getDocs, getDoc, doc } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * 단일 팀의 통계를 계산
 * @param {string} teacherId - 선생님 ID
 * @param {Array} teamPlayers - 팀 라인업 선수 배열 (player.id 또는 player.playerId 포함)
 * @returns {Promise<Object>} - { totalHits, totalRuns, totalDefense, totalCookie, totalBadges }
 */
export const calculateTeamStats = async (teacherId, teamPlayers) => {
  try {
    if (!teamPlayers || teamPlayers.length === 0) {
      return {
        totalHits: 0,
        totalRuns: 0,
        totalDefense: 0,
        totalCookie: 0,
        totalBadges: 0
      };
    }

    // 병렬 처리로 속도 개선
    const promises = teamPlayers.map(async (player) => {
      const playerId = player.playerId || player.id;
      console.log('🔍 [teamStatsCalculator] 선수 처리:', { player, playerId });

      // playerHistory에서 스탯 가져오기 (진행 중인 경기 제외)
      const historyDocRef = doc(db, 'users', teacherId, 'playerHistory', playerId);
      const historySnap = await getDoc(historyDocRef);

      // students 컬렉션에서 배지 정보 가져오기
      const studentDocRef = doc(db, 'users', teacherId, 'students', playerId);
      const studentSnap = await getDoc(studentDocRef);

      let stats = {
        hits: 0,
        runs: 0,
        defense: 0,
        cookie: 0,
        badges: 0
      };

      if (historySnap.exists()) {
        const historyData = historySnap.data();
        const games = historyData.games || [];

        // 완료된 경기만 집계 (진행 중인 경기는 제외)
        // Set을 사용하여 중복 배지 방지
        const uniqueBadges = new Set();

        games.forEach(game => {
          if (game.stats) {
            stats.hits += game.stats.hits || 0;
            stats.runs += game.stats.runs || 0;
            stats.defense += game.stats.goodDefense || 0;
            stats.cookie += game.stats.bonusCookie || 0;
          }

          // 각 게임에서 획득한 배지 집계
          if (game.newBadges && Array.isArray(game.newBadges)) {
            game.newBadges.forEach(badgeId => {
              uniqueBadges.add(badgeId);
            });
          }
        });

        stats.badges = uniqueBadges.size;
        console.log('🏆 [teamStatsCalculator] 배지 집계 완료:', { playerId, badgeCount: stats.badges, uniqueBadges: Array.from(uniqueBadges) });
      }

      return stats;
    });

    const results = await Promise.all(promises);

    // 팀 전체 합계 계산
    const teamTotal = results.reduce((acc, stats) => ({
      totalHits: acc.totalHits + stats.hits,
      totalRuns: acc.totalRuns + stats.runs,
      totalDefense: acc.totalDefense + stats.defense,
      totalCookie: acc.totalCookie + stats.cookie,
      totalBadges: acc.totalBadges + stats.badges
    }), {
      totalHits: 0,
      totalRuns: 0,
      totalDefense: 0,
      totalCookie: 0,
      totalBadges: 0
    });

    console.log('📊 [teamStatsCalculator] 팀 통계 계산 완료:', teamTotal);

    return teamTotal;
  } catch (error) {
    console.error('❌ [teamStatsCalculator] 팀 통계 계산 실패:', error);
    return {
      totalHits: 0,
      totalRuns: 0,
      totalDefense: 0,
      totalCookie: 0,
      totalBadges: 0
    };
  }
};

/**
 * 모든 팀의 통계를 계산
 * @param {string} teacherId - 선생님 ID
 * @param {Array} teams - 전체 팀 배열
 * @returns {Promise<Object>} - { [teamId]: { totalHits, totalRuns, totalDefense, totalCookie, totalBadges } }
 */
export const calculateAllTeamStats = async (teacherId, teams) => {
  try {
    if (!teams || teams.length === 0) {
      return {};
    }

    // 병렬 처리로 모든 팀의 스탯 계산
    const promises = teams.map(async (team) => {
      const teamPlayers = team.players || [];
      const stats = await calculateTeamStats(teacherId, teamPlayers);
      return { teamId: team.id, stats };
    });

    const results = await Promise.all(promises);

    // teamId를 키로 하는 객체로 변환
    const teamStatsObject = {};
    results.forEach(result => {
      if (result) {
        teamStatsObject[result.teamId] = result.stats;
      }
    });

    console.log('📊 [teamStatsCalculator] 모든 팀 통계 계산 완료:', teamStatsObject);

    return teamStatsObject;
  } catch (error) {
    console.error('❌ [teamStatsCalculator] 전체 팀 통계 계산 실패:', error);
    return {};
  }
};
