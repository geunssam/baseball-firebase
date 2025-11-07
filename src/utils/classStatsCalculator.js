/**
 * classStatsCalculator.js
 * 학급별 통계를 계산하는 유틸리티 함수
 * ClassRankingWidget의 로직을 재사용 가능하게 분리
 */

import { collection, getDocs, getDoc, doc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * 모든 학급의 통계를 계산
 * @param {string} teacherId - 선생님 ID
 * @returns {Promise<Object>} - { [className]: { totalHits, totalRuns, totalDefense, totalCookie, studentCount } }
 */
export const calculateAllClassStats = async (teacherId) => {
  try {
    // 모든 학생 가져오기
    const studentsRef = collection(db, 'users', teacherId, 'students');
    const studentsSnapshot = await getDocs(studentsRef);

    // 진행 중인 경기 한 번만 조회 (성능 개선)
    let activeGames = [];
    try {
      const activeGamesRef = collection(db, 'users', teacherId, 'games');
      const activeGamesQuery = query(activeGamesRef, where('status', '==', 'playing'));
      const activeGamesSnapshot = await getDocs(activeGamesQuery);
      activeGames = activeGamesSnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.warn('⚠️ 진행 중인 경기 조회 실패:', error);
    }

    // 학급별로 그룹화
    const classMap = new Map();

    // 병렬 처리로 속도 개선
    const promises = studentsSnapshot.docs.map(async (studentDoc) => {
      const studentData = studentDoc.data();
      const className = studentData.className;

      if (!className) return null;

      // playerHistory에서 스탯 가져오기
      const historyDocRef = doc(db, 'users', teacherId, 'playerHistory', studentData.playerId || studentDoc.id);
      const historySnap = await getDoc(historyDocRef);

      let stats = {
        hits: 0,
        runs: 0,
        defense: 0,
        cookie: 0
      };

      if (historySnap.exists()) {
        const games = historySnap.data().games || [];
        games.forEach(game => {
          stats.hits += game.stats?.hits || 0;
          stats.runs += game.stats?.runs || 0;
          stats.defense += game.stats?.goodDefense || 0;
          stats.cookie += game.stats?.bonusCookie || 0;
        });
      }

      // 진행 중인 경기 스탯 추가
      activeGames.forEach(game => {
        const allPlayers = [
          ...(game.teamA?.lineup || []),
          ...(game.teamB?.lineup || [])
        ];

        const currentPlayer = allPlayers.find(
          p => (p.id === (studentData.playerId || studentDoc.id) ||
                p.playerId === (studentData.playerId || studentDoc.id))
        );

        if (currentPlayer?.stats) {
          stats.hits += currentPlayer.stats.hits || 0;
          stats.runs += currentPlayer.stats.runs || 0;
          stats.defense += currentPlayer.stats.goodDefense || 0;
          stats.cookie += currentPlayer.stats.bonusCookie || 0;
        }
      });

      return { className, stats };
    });

    const results = await Promise.all(promises);

    // 학급별 집계
    results.forEach(result => {
      if (!result) return;

      const { className, stats } = result;

      if (!classMap.has(className)) {
        classMap.set(className, {
          totalHits: 0,
          totalRuns: 0,
          totalDefense: 0,
          totalCookie: 0,
          studentCount: 0
        });
      }

      const classData = classMap.get(className);
      classData.totalHits += stats.hits;
      classData.totalRuns += stats.runs;
      classData.totalDefense += stats.defense;
      classData.totalCookie += stats.cookie;
      classData.studentCount += 1;
    });

    // Map을 Object로 변환
    const classStatsObject = {};
    classMap.forEach((value, key) => {
      classStatsObject[key] = value;
    });

    console.log('📊 [classStatsCalculator] 학급별 통계 계산 완료:', classStatsObject);

    return classStatsObject;
  } catch (error) {
    console.error('❌ [classStatsCalculator] 학급 통계 계산 실패:', error);
    return {};
  }
};

/**
 * 특정 학급의 통계만 계산
 * @param {string} teacherId - 선생님 ID
 * @param {string} className - 학급 이름
 * @returns {Promise<Object>} - { totalHits, totalRuns, totalDefense, totalCookie, studentCount }
 */
export const calculateClassStats = async (teacherId, className) => {
  const allStats = await calculateAllClassStats(teacherId);
  return allStats[className] || {
    totalHits: 0,
    totalRuns: 0,
    totalDefense: 0,
    totalCookie: 0,
    studentCount: 0
  };
};

/**
 * 개별 학생들의 통계를 계산
 * @param {string} teacherId - 선생님 ID
 * @param {Array} students - 학생 배열
 * @returns {Promise<Object>} - { [studentId]: { hits, runs, defense, cookie } }
 */
export const calculateStudentStats = async (teacherId, students) => {
  try {
    if (!students || students.length === 0) {
      return {};
    }

    // 진행 중인 경기 한 번만 조회 (성능 개선)
    let activeGames = [];
    try {
      const activeGamesRef = collection(db, 'users', teacherId, 'games');
      const activeGamesQuery = query(activeGamesRef, where('status', '==', 'playing'));
      const activeGamesSnapshot = await getDocs(activeGamesQuery);
      activeGames = activeGamesSnapshot.docs.map(doc => doc.data());
    } catch (error) {
      console.warn('⚠️ 진행 중인 경기 조회 실패:', error);
    }

    // 병렬 처리로 속도 개선
    const promises = students.map(async (student) => {
      const studentId = student.id;
      const playerId = student.playerId || studentId;

      // playerHistory에서 스탯 가져오기
      const historyDocRef = doc(db, 'users', teacherId, 'playerHistory', playerId);
      const historySnap = await getDoc(historyDocRef);

      let stats = {
        hits: 0,
        runs: 0,
        defense: 0,
        cookie: 0
      };

      if (historySnap.exists()) {
        const games = historySnap.data().games || [];
        games.forEach(game => {
          stats.hits += game.stats?.hits || 0;
          stats.runs += game.stats?.runs || 0;
          stats.defense += game.stats?.goodDefense || 0;
          stats.cookie += game.stats?.bonusCookie || 0;
        });
      }

      // 진행 중인 경기 스탯 추가
      activeGames.forEach(game => {
        const allPlayers = [
          ...(game.teamA?.lineup || []),
          ...(game.teamB?.lineup || [])
        ];

        const currentPlayer = allPlayers.find(
          p => (p.id === playerId || p.playerId === playerId)
        );

        if (currentPlayer?.stats) {
          stats.hits += currentPlayer.stats.hits || 0;
          stats.runs += currentPlayer.stats.runs || 0;
          stats.defense += currentPlayer.stats.goodDefense || 0;
          stats.cookie += currentPlayer.stats.bonusCookie || 0;
        }
      });

      return { studentId, stats };
    });

    const results = await Promise.all(promises);

    // 학생 ID를 키로 하는 객체로 변환
    const studentStatsObject = {};
    results.forEach(result => {
      if (result) {
        studentStatsObject[result.studentId] = result.stats;
      }
    });

    console.log('📊 [classStatsCalculator] 개별 학생 통계 계산 완료');

    return studentStatsObject;
  } catch (error) {
    console.error('❌ [classStatsCalculator] 개별 학생 통계 계산 실패:', error);
    return {};
  }
};
