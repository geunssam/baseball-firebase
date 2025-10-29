import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch,
  orderBy,
  limit
} from 'firebase/firestore';
import { db, auth } from '../config/firebase';

/**
 * FirestoreService
 *
 * 이 클래스는 Firestore와의 모든 통신을 담당합니다.
 *
 * 주요 기능:
 * - 팀 관리 (CRUD)
 * - 경기 관리 (생성, 업데이트, 종료)
 * - 선수 배지 관리
 * - 선수 히스토리 관리
 * - 설정 관리
 * - 실시간 리스너 (팀, 경기 동기화)
 */

class FirestoreService {
  constructor() {
    this.currentUser = null;
    this.unsubscribers = []; // 리스너 정리용
  }

  /**
   * 현재 로그인한 사용자 ID 가져오기
   */
  getCurrentUserId() {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('로그인이 필요합니다.');
    }
    return user.uid;
  }

  /**
   * 사용자별 컬렉션 참조 가져오기
   * 예: users/userId/teams
   */
  getUserCollection(collectionName) {
    const userId = this.getCurrentUserId();
    return collection(db, 'users', userId, collectionName);
  }

  /**
   * 사용자별 문서 참조 가져오기
   * 예: users/userId/teams/teamId
   */
  getUserDoc(collectionName, docId) {
    const userId = this.getCurrentUserId();
    return doc(db, 'users', userId, collectionName, docId);
  }

  // ============================================
  // 팀 관리 (CRUD + 실시간 리스너)
  // ============================================

  /**
   * 새 팀 생성
   * @param {Object} teamData - 팀 데이터 (name, grade, classNum, players 등)
   * @returns {Promise<string>} 생성된 팀 ID
   */
  async createTeam(teamData) {
    try {
      const userId = this.getCurrentUserId();
      const teamsRef = this.getUserCollection('teams');
      const newTeamRef = doc(teamsRef); // 자동 ID 생성

      const team = {
        ...teamData,
        id: newTeamRef.id,
        ownerId: userId,
        grade: teamData.grade || null, // 학년 (선택사항)
        classNum: teamData.classNum || null, // 반 (선택사항)
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      await setDoc(newTeamRef, team);
      console.log('✅ 팀 생성 완료:', newTeamRef.id);
      return newTeamRef.id;
    } catch (error) {
      console.error('❌ 팀 생성 실패:', error);
      throw new Error('팀 생성에 실패했습니다.');
    }
  }

  /**
   * 모든 팀 가져오기
   * @returns {Promise<Array>} 팀 목록
   */
  async getTeams() {
    try {
      const teamsRef = this.getUserCollection('teams');
      const snapshot = await getDocs(teamsRef);

      const teams = [];
      snapshot.forEach((doc) => {
        teams.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ 팀 ${teams.length}개 로드 완료`);
      return teams;
    } catch (error) {
      console.error('❌ 팀 로드 실패:', error);
      throw new Error('팀 목록을 불러오는데 실패했습니다.');
    }
  }

  /**
   * 특정 팀 가져오기
   * @param {string} teamId - 팀 ID
   * @returns {Promise<Object>} 팀 데이터
   */
  async getTeam(teamId) {
    try {
      const teamRef = this.getUserDoc('teams', teamId);
      const teamDoc = await getDoc(teamRef);

      if (!teamDoc.exists()) {
        throw new Error('팀을 찾을 수 없습니다.');
      }

      return { id: teamDoc.id, ...teamDoc.data() };
    } catch (error) {
      console.error('❌ 팀 로드 실패:', error);
      throw new Error('팀을 불러오는데 실패했습니다.');
    }
  }

  /**
   * 팀 정보 업데이트
   * @param {string} teamId - 팀 ID
   * @param {Object} updates - 업데이트할 데이터
   */
  async updateTeam(teamId, updates) {
    try {
      const teamRef = this.getUserDoc('teams', teamId);
      await updateDoc(teamRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      console.log('✅ 팀 업데이트 완료:', teamId);
    } catch (error) {
      console.error('❌ 팀 업데이트 실패:', error);
      throw new Error('팀 업데이트에 실패했습니다.');
    }
  }

  /**
   * 팀 삭제
   * @param {string} teamId - 팀 ID
   */
  async deleteTeam(teamId) {
    try {
      const teamRef = this.getUserDoc('teams', teamId);
      await deleteDoc(teamRef);

      console.log('✅ 팀 삭제 완료:', teamId);
    } catch (error) {
      console.error('❌ 팀 삭제 실패:', error);
      throw new Error('팀 삭제에 실패했습니다.');
    }
  }

  /**
   * 팀 목록 실시간 동기화
   * @param {Function} callback - 팀 목록이 변경될 때 호출되는 함수
   * @returns {Function} unsubscribe 함수
   */
  subscribeToTeams(callback) {
    try {
      const teamsRef = this.getUserCollection('teams');
      console.log('📡 [FirestoreService] subscribeToTeams 시작, userId:', this.getCurrentUserId());

      // 생성 시간 순서대로 정렬하여 팀 목록 가져오기
      const q = query(teamsRef, orderBy('createdAt', 'asc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        console.log('📡 [FirestoreService] onSnapshot 콜백 호출됨, snapshot.size:', snapshot.size);
        const teams = [];
        snapshot.forEach((doc) => {
          console.log('📡 [FirestoreService] 팀 문서:', doc.id, doc.data());
          teams.push({ id: doc.id, ...doc.data() });
        });

        console.log(`🔄 팀 동기화: ${teams.length}개 (생성 시간순 정렬)`);
        callback(teams);
      }, (error) => {
        console.error('❌ 팀 리스너 오류:', error);
        console.error('❌ 에러 코드:', error.code);
        console.error('❌ 에러 메시지:', error.message);
        callback([]);
      });

      this.unsubscribers.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('❌ 팀 리스너 생성 실패:', error);
      throw new Error('실시간 동기화 설정에 실패했습니다.');
    }
  }

  // ============================================
  // 학생 관리 (전역 학생 풀)
  // ============================================

  /**
   * 새 학생 생성
   * @param {Object} studentData - 학생 데이터 { name, className }
   * @returns {Promise<string>} 생성된 학생 ID
   */
  async createStudent(studentData) {
    try {
      const userId = this.getCurrentUserId();
      const studentsRef = this.getUserCollection('students');
      const newStudentRef = doc(studentsRef);

      // 학생 코드 생성: teacherId(앞 6자리) + studentId(뒤 6자리)
      const { generateStudentCode } = await import('../utils/studentCodeGenerator.js');
      const studentCode = generateStudentCode(userId, newStudentRef.id);

      const student = {
        ...studentData,
        ownerId: userId,
        playerId: newStudentRef.id, // playerId = studentId (stats 조회용)
        studentCode, // 학생 로그인 코드
        createdAt: serverTimestamp(),
      };

      await setDoc(newStudentRef, student);
      console.log('✅ 학생 생성 완료:', newStudentRef.id, '학생 코드:', studentCode);
      return newStudentRef.id;
    } catch (error) {
      console.error('❌ 학생 생성 실패:', error);
      throw new Error('학생 생성에 실패했습니다.');
    }
  }

  /**
   * 모든 학생 가져오기
   * @returns {Promise<Array>} 학생 목록
   */
  async getStudents() {
    try {
      const studentsRef = this.getUserCollection('students');
      const snapshot = await getDocs(studentsRef);

      const students = [];
      snapshot.forEach((doc) => {
        students.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ 학생 ${students.length}명 로드 완료`);
      return students;
    } catch (error) {
      console.error('❌ 학생 로드 실패:', error);
      throw new Error('학생 목록을 불러오는데 실패했습니다.');
    }
  }

  /**
   * 학생 정보 업데이트
   * @param {string} studentId - 학생 ID
   * @param {Object} updates - 업데이트할 데이터
   */
  async updateStudent(studentId, updates) {
    try {
      const studentRef = this.getUserDoc('students', studentId);
      await updateDoc(studentRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      console.log('✅ 학생 업데이트 완료:', studentId);
    } catch (error) {
      console.error('❌ 학생 업데이트 실패:', error);
      throw new Error('학생 정보 업데이트에 실패했습니다.');
    }
  }

  /**
   * 학생 삭제 (캐스케이드 삭제)
   * @param {string} studentId - 학생 ID
   */
  async deleteStudent(studentId) {
    try {
      const batch = writeBatch(db);

      // 1. students 문서 삭제
      const studentRef = this.getUserDoc('students', studentId);
      batch.delete(studentRef);

      // 2. playerHistory 삭제
      const historyRef = this.getUserDoc('playerHistory', studentId);
      batch.delete(historyRef);

      // 3. playerBadges 삭제
      const badgesRef = this.getUserDoc('playerBadges', studentId);
      batch.delete(badgesRef);

      await batch.commit();
      console.log('✅ 학생 및 관련 데이터 삭제 완료:', studentId);

      // 4. 모든 팀의 players 배열에서 해당 선수 제거 (비동기)
      setTimeout(async () => {
        try {
          const teamsRef = this.getUserCollection('teams');
          const teamsSnapshot = await getDocs(teamsRef);

          const teamUpdateBatch = writeBatch(db);
          let needsUpdate = false;

          teamsSnapshot.forEach((teamDoc) => {
            const teamData = teamDoc.data();
            if (teamData.players && teamData.players.length > 0) {
              const filteredPlayers = teamData.players.filter(
                p => (p.id || p.playerId) !== studentId
              );

              if (filteredPlayers.length !== teamData.players.length) {
                const teamRef = this.getUserDoc('teams', teamDoc.id);
                teamUpdateBatch.update(teamRef, { players: filteredPlayers });
                needsUpdate = true;
              }
            }
          });

          if (needsUpdate) {
            await teamUpdateBatch.commit();
            console.log('✅ 팀 명단에서 학생 제거 완료:', studentId);
          }
        } catch (error) {
          console.error('❌ 팀 명단 업데이트 실패:', error);
        }
      }, 100);

    } catch (error) {
      console.error('❌ 학생 삭제 실패:', error);
      throw new Error('학생 삭제에 실패했습니다.');
    }
  }

  /**
   * 학생 목록 실시간 동기화
   * @param {Function} callback - 학생 목록이 변경될 때 호출되는 함수
   * @returns {Function} unsubscribe 함수
   */
  subscribeToStudents(callback) {
    try {
      const studentsRef = this.getUserCollection('students');
      console.log('📡 [FirestoreService] subscribeToStudents 시작');

      // 생성 시간 순서대로 정렬하여 학생 목록 가져오기
      const q = query(studentsRef, orderBy('createdAt', 'asc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const students = [];
        snapshot.forEach((doc) => {
          students.push({ id: doc.id, ...doc.data() });
        });

        console.log(`🔄 학생 동기화: ${students.length}명 (생성 시간순 정렬)`);
        callback(students);
      }, (error) => {
        console.error('❌ 학생 리스너 오류:', error);
        callback([]);
      });

      this.unsubscribers.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('❌ 학생 리스너 생성 실패:', error);
      throw new Error('실시간 동기화 설정에 실패했습니다.');
    }
  }

  // ============================================
  // 경기 관리
  // ============================================

  /**
   * 새 경기 생성
   * @param {Object} gameData - 경기 데이터
   * @returns {Promise<string>} 생성된 경기 ID
   */
  async createGame(gameData) {
    try {
      const userId = this.getCurrentUserId();
      const gamesRef = this.getUserCollection('games');
      const newGameRef = doc(gamesRef);

      const game = {
        ...gameData,
        id: newGameRef.id,
        ownerId: userId,
        status: 'playing', // 'playing' | 'finished'
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      // 배치 작업 시작
      const batch = writeBatch(db);

      // 경기 생성
      batch.set(newGameRef, game);

      // 모든 라인업 선수들의 playerHistory 초기화 (경기 시작 시 출전 기록)
      const allPlayers = [
        ...(gameData.teamA?.lineup || []).map(p => ({ ...p, team: gameData.teamA.name })),
        ...(gameData.teamB?.lineup || []).map(p => ({ ...p, team: gameData.teamB.name }))
      ];

      for (const player of allPlayers) {
        const playerId = player.playerId || player.id;
        if (!playerId) continue;

        const historyRef = this.getUserDoc('playerHistory', playerId);
        const historyDoc = await getDoc(historyRef);

        const existingHistory = historyDoc.exists() ? historyDoc.data() : { games: [] };

        batch.set(historyRef, {
          playerId,
          playerName: player.name,
          games: [
            ...existingHistory.games,
            {
              gameId: newGameRef.id,
              date: new Date().toISOString(), // serverTimestamp() 대신 ISO 문자열 사용
              stats: {
                hits: 0,
                single: 0,
                double: 0,
                triple: 0,
                homerun: 0,
                runs: 0,
                bonusCookie: 0,
                goodDefense: 0
              },
              team: player.team,
            }
          ],
          updatedAt: serverTimestamp(),
        });
      }

      // 배치 커밋
      await batch.commit();
      console.log('✅ 경기 생성 및 선수 출전 기록 초기화 완료:', newGameRef.id);

      // 각 선수의 배지 즉시 재계산 (경기 생성 완료 전 완료)
      const playerIds = allPlayers.map(p => p.playerId || p.id).filter(Boolean);
      console.log(`🔄 ${playerIds.length}명의 배지 재계산 시작...`);

      // 병렬 처리로 모든 선수의 배지를 동시에 계산
      await Promise.all(
        playerIds.map(playerId =>
          this.updatePlayerBadgesFromHistory(playerId).catch(err => {
            console.warn(`⚠️ ${playerId} 배지 재계산 실패:`, err);
          })
        )
      );

      console.log('✅ 배지 재계산 완료');
      return newGameRef.id;
    } catch (error) {
      console.error('❌ 경기 생성 실패:', error);
      throw new Error('경기 생성에 실패했습니다.');
    }
  }

  /**
   * 진행 중인 모든 경기 가져오기
   * @returns {Promise<Array>} 경기 목록
   */
  async getGames() {
    try {
      const gamesRef = this.getUserCollection('games');
      const snapshot = await getDocs(gamesRef);

      const games = [];
      snapshot.forEach((doc) => {
        games.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ 경기 ${games.length}개 로드 완료`);
      return games;
    } catch (error) {
      console.error('❌ 경기 로드 실패:', error);
      throw new Error('경기 목록을 불러오는데 실패했습니다.');
    }
  }

  /**
   * 특정 경기 가져오기
   * @param {string} gameId - 경기 ID
   * @returns {Promise<Object>} 경기 데이터
   */
  async getGame(gameId) {
    try {
      const gameRef = this.getUserDoc('games', gameId);
      const gameDoc = await getDoc(gameRef);

      if (!gameDoc.exists()) {
        throw new Error('경기를 찾을 수 없습니다.');
      }

      return { id: gameDoc.id, ...gameDoc.data() };
    } catch (error) {
      console.error('❌ 경기 로드 실패:', error);
      throw new Error('경기를 불러오는데 실패했습니다.');
    }
  }

  /**
   * 경기 정보 업데이트 (스코어, 선수 스탯 등)
   * @param {string} gameId - 경기 ID
   * @param {Object} updates - 업데이트할 데이터
   */
  async updateGame(gameId, updates) {
    try {
      const gameRef = this.getUserDoc('games', gameId);
      await updateDoc(gameRef, {
        ...updates,
        updatedAt: serverTimestamp(),
      });

      console.log('✅ 경기 업데이트 완료:', gameId);
    } catch (error) {
      console.error('❌ 경기 업데이트 실패:', error);
      throw new Error('경기 업데이트에 실패했습니다.');
    }
  }

  /**
   * 경기 종료 및 히스토리 저장
   * @param {string} gameId - 경기 ID
   * @param {Object} finalGameData - 최종 경기 데이터
   */
  async finishGame(gameId, finalGameData) {
    try {
      const userId = this.getCurrentUserId();
      const batch = writeBatch(db);

      // 1. games 컬렉션에서 삭제
      const gameRef = this.getUserDoc('games', gameId);
      batch.delete(gameRef);

      // 2. finishedGames 컬렉션에 저장
      const finishedGameRef = this.getUserDoc('finishedGames', gameId);
      batch.set(finishedGameRef, {
        ...finalGameData,
        id: gameId,
        ownerId: userId,
        status: 'finished',
        finishedAt: serverTimestamp(),
      });

      // 3. 선수 히스토리 업데이트 (경기 시작 시 생성된 기록을 업데이트)
      const allPlayers = [
        ...(finalGameData.teamA?.players || []).map(p => ({ ...p, team: finalGameData.teamA.name })),
        ...(finalGameData.teamB?.players || []).map(p => ({ ...p, team: finalGameData.teamB.name }))
      ];

      for (const player of allPlayers) {
        const playerId = player.playerId || player.id;
        if (!playerId) continue;

        const historyRef = this.getUserDoc('playerHistory', playerId);
        const historyDoc = await getDoc(historyRef);

        if (historyDoc.exists()) {
          const existingHistory = historyDoc.data();

          // 해당 gameId의 기록을 찾아서 stats 업데이트
          const updatedGames = existingHistory.games.map(game => {
            if (game.gameId === gameId) {
              return {
                ...game,
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
              };
            }
            return game;
          });

          batch.set(historyRef, {
            ...existingHistory,
            games: updatedGames,
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
      console.log('✅ 경기 종료 및 히스토리 업데이트 완료:', gameId);

      // 각 선수의 배지 재계산
      setTimeout(async () => {
        try {
          const playerIds = allPlayers.map(p => p.playerId || p.id).filter(Boolean);
          console.log(`🔄 경기 종료 후 ${playerIds.length}명의 배지 재계산 시작...`);

          for (const playerId of playerIds) {
            try {
              await this.updatePlayerBadgesFromHistory(playerId);
            } catch (err) {
              console.warn(`⚠️ ${playerId} 배지 재계산 실패:`, err);
            }
          }

          console.log('✅ 경기 종료 후 배지 재계산 완료');
        } catch (error) {
          console.error('❌ 배지 재계산 실패:', error);
        }
      }, 100);
    } catch (error) {
      console.error('❌ 경기 종료 실패:', error);
      throw new Error('경기 종료에 실패했습니다.');
    }
  }

  /**
   * 경기 삭제 (완료된 경기 삭제용)
   * @param {string} gameId - 경기 ID
   */
  async deleteGame(gameId) {
    try {
      // 완료된 경기는 finishedGames 컬렉션에 저장되어 있음
      const finishedGameRef = this.getUserDoc('finishedGames', gameId);
      await deleteDoc(finishedGameRef);
      console.log('✅ 완료된 경기 삭제 완료:', gameId);
    } catch (error) {
      console.error('❌ 경기 삭제 실패:', error);
      throw new Error('경기 삭제에 실패했습니다.');
    }
  }

  /**
   * 진행 중인 경기 삭제 (선수 스탯 복원 포함)
   * @param {string} gameId - 경기 ID
   * @param {Object} gameData - 삭제할 경기 데이터
   */
  async deleteInProgressGame(gameId, gameData) {
    try {
      const batch = writeBatch(db);

      // 1. games 컬렉션에서 경기 삭제
      const gameRef = this.getUserDoc('games', gameId);
      batch.delete(gameRef);

      // 2. 모든 라인업 선수들의 playerHistory에서 해당 경기 기록 제거
      const allPlayers = [
        ...(gameData.teamA?.lineup || []),
        ...(gameData.teamB?.lineup || [])
      ];

      for (const player of allPlayers) {
        const playerId = player.playerId || player.id;
        if (!playerId) continue;

        const historyRef = this.getUserDoc('playerHistory', playerId);
        const historyDoc = await getDoc(historyRef);

        if (historyDoc.exists()) {
          const existingHistory = historyDoc.data();

          // 해당 gameId의 기록을 제거
          const updatedGames = existingHistory.games.filter(game => game.gameId !== gameId);

          batch.set(historyRef, {
            ...existingHistory,
            games: updatedGames,
            updatedAt: serverTimestamp(),
          });
        }
      }

      await batch.commit();
      console.log('✅ 진행 중인 경기 삭제 완료:', gameId);

      // 3. 각 선수의 배지 재계산
      setTimeout(async () => {
        try {
          const playerIds = allPlayers.map(p => p.playerId || p.id).filter(Boolean);
          console.log(`🔄 경기 삭제 후 ${playerIds.length}명의 배지 재계산 시작...`);

          for (const playerId of playerIds) {
            try {
              await this.updatePlayerBadgesFromHistory(playerId);
            } catch (err) {
              console.warn(`⚠️ ${playerId} 배지 재계산 실패:`, err);
            }
          }

          console.log('✅ 경기 삭제 후 배지 재계산 완료');
        } catch (error) {
          console.error('❌ 배지 재계산 실패:', error);
        }
      }, 100);
    } catch (error) {
      console.error('❌ 진행 중인 경기 삭제 실패:', error);
      throw new Error('진행 중인 경기 삭제에 실패했습니다.');
    }
  }

  /**
   * 특정 경기 실시간 동기화
   * @param {string} gameId - 경기 ID
   * @param {Function} callback - 경기 데이터가 변경될 때 호출되는 함수
   * @returns {Function} unsubscribe 함수
   */
  subscribeToGame(gameId, callback) {
    try {
      const gameRef = this.getUserDoc('games', gameId);

      const unsubscribe = onSnapshot(gameRef, (doc) => {
        if (doc.exists()) {
          console.log('🔄 경기 동기화:', gameId);
          callback({ id: doc.id, ...doc.data() });
        } else {
          console.warn('⚠️ 경기가 삭제되었습니다:', gameId);
          callback(null);
        }
      }, (error) => {
        console.error('❌ 경기 리스너 오류:', error);
        callback(null);
      });

      this.unsubscribers.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('❌ 경기 리스너 생성 실패:', error);
      throw new Error('실시간 동기화 설정에 실패했습니다.');
    }
  }

  /**
   * 진행 중인 모든 경기 실시간 동기화
   * @param {Function} callback - 경기 목록이 변경될 때 호출되는 함수
   * @returns {Function} unsubscribe 함수
   */
  subscribeToGames(callback) {
    try {
      const gamesRef = this.getUserCollection('games');

      const unsubscribe = onSnapshot(gamesRef, (snapshot) => {
        const games = [];
        snapshot.forEach((doc) => {
          games.push({ id: doc.id, ...doc.data() });
        });

        console.log(`🔄 경기 목록 동기화: ${games.length}개`);
        callback(games);
      }, (error) => {
        console.error('❌ 경기 목록 리스너 오류:', error);
        callback([]);
      });

      this.unsubscribers.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('❌ 경기 목록 리스너 생성 실패:', error);
      throw new Error('실시간 동기화 설정에 실패했습니다.');
    }
  }

  // ============================================
  // 선수 배지 관리
  // ============================================

  /**
   * 선수 배지 저장/업데이트
   * @param {string} playerId - 선수 ID
   * @param {Object} badgeData - 배지 데이터
   */
  async savePlayerBadges(playerId, badgeData) {
    try {
      const badgeRef = this.getUserDoc('playerBadges', playerId);
      await setDoc(badgeRef, {
        playerId,
        ...badgeData,
        updatedAt: serverTimestamp(),
      }, { merge: true }); // 기존 데이터와 병합

      console.log('✅ 선수 배지 저장 완료:', playerId);
    } catch (error) {
      console.error('❌ 선수 배지 저장 실패:', error);
      throw new Error('배지 저장에 실패했습니다.');
    }
  }

  /**
   * 선수 배지 가져오기
   * @param {string} playerId - 선수 ID
   * @returns {Promise<Object>} 배지 데이터
   */
  async getPlayerBadges(playerId) {
    try {
      const badgeRef = this.getUserDoc('playerBadges', playerId);
      const badgeDoc = await getDoc(badgeRef);

      if (!badgeDoc.exists()) {
        return { playerId, badges: [] };
      }

      return { id: badgeDoc.id, ...badgeDoc.data() };
    } catch (error) {
      console.error('❌ 선수 배지 로드 실패:', error);
      throw new Error('배지를 불러오는데 실패했습니다.');
    }
  }

  /**
   * 모든 선수 배지 가져오기
   * @returns {Promise<Array>} 배지 목록
   */
  async getAllPlayerBadges() {
    try {
      const badgesRef = this.getUserCollection('playerBadges');
      const snapshot = await getDocs(badgesRef);

      const badges = [];
      snapshot.forEach((doc) => {
        badges.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ 배지 ${badges.length}개 로드 완료`);
      return badges;
    } catch (error) {
      console.error('❌ 배지 로드 실패:', error);
      throw new Error('배지 목록을 불러오는데 실패했습니다.');
    }
  }

  // ============================================
  // 선수 히스토리 관리
  // ============================================

  /**
   * 선수 히스토리 가져오기
   * @param {string} playerId - 선수 ID
   * @returns {Promise<Object>} 히스토리 데이터
   */
  async getPlayerHistory(playerId) {
    try {
      const historyRef = this.getUserDoc('playerHistory', playerId);
      const historyDoc = await getDoc(historyRef);

      if (!historyDoc.exists()) {
        return { playerId, games: [] };
      }

      return { id: historyDoc.id, ...historyDoc.data() };
    } catch (error) {
      console.error('❌ 선수 히스토리 로드 실패:', error);
      throw new Error('히스토리를 불러오는데 실패했습니다.');
    }
  }

  /**
   * 종료된 경기 목록 가져오기
   * @param {number} limitCount - 가져올 경기 수 (기본: 10)
   * @returns {Promise<Array>} 종료된 경기 목록
   */
  async getFinishedGames(limitCount = 10) {
    try {
      const finishedGamesRef = this.getUserCollection('finishedGames');
      const q = query(finishedGamesRef, orderBy('finishedAt', 'desc'), limit(limitCount));
      const snapshot = await getDocs(q);

      const games = [];
      snapshot.forEach((doc) => {
        games.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ 종료된 경기 ${games.length}개 로드 완료`);
      return games;
    } catch (error) {
      console.error('❌ 종료된 경기 로드 실패:', error);
      throw new Error('종료된 경기를 불러오는데 실패했습니다.');
    }
  }

  /**
   * 종료된 경기 목록 실시간 동기화
   * @param {Function} callback - 경기 목록이 업데이트될 때 호출될 콜백
   * @param {number} limitCount - 가져올 경기 수 (기본: 20)
   * @returns {Function} unsubscribe 함수
   */
  subscribeToFinishedGames(callback, limitCount = 20) {
    try {
      const finishedGamesRef = this.getUserCollection('finishedGames');
      const q = query(finishedGamesRef, orderBy('finishedAt', 'desc'), limit(limitCount));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const games = [];
        snapshot.forEach((doc) => {
          games.push({ id: doc.id, ...doc.data() });
        });

        console.log(`🔄 종료된 경기 목록 동기화: ${games.length}개`);
        callback(games);
      }, (error) => {
        console.error('❌ 종료된 경기 리스너 오류:', error);
        callback([]);
      });

      this.unsubscribers.push(unsubscribe);
      return unsubscribe;
    } catch (error) {
      console.error('❌ 종료된 경기 리스너 설정 실패:', error);
      return () => {}; // 빈 unsubscribe 함수 반환
    }
  }

  // ============================================
  // 설정 관리
  // ============================================

  /**
   * 사용자 설정 저장
   * @param {Object} settings - 설정 데이터
   */
  async saveSettings(settings) {
    try {
      const settingsRef = this.getUserDoc('settings', 'userSettings');
      await setDoc(settingsRef, {
        ...settings,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      console.log('✅ 설정 저장 완료');
    } catch (error) {
      console.error('❌ 설정 저장 실패:', error);
      throw new Error('설정 저장에 실패했습니다.');
    }
  }

  /**
   * 사용자 설정 가져오기
   * @returns {Promise<Object>} 설정 데이터
   */
  async getSettings() {
    try {
      const settingsRef = this.getUserDoc('settings', 'userSettings');
      const settingsDoc = await getDoc(settingsRef);

      if (!settingsDoc.exists()) {
        return {};
      }

      return settingsDoc.data();
    } catch (error) {
      console.error('❌ 설정 로드 실패:', error);
      throw new Error('설정을 불러오는데 실패했습니다.');
    }
  }

  // ============================================
  // 유틸리티 함수
  // ============================================

  /**
   * 모든 리스너 정리
   */
  unsubscribeAll() {
    this.unsubscribers.forEach((unsubscribe) => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    });
    this.unsubscribers = [];
    console.log('✅ 모든 리스너 정리 완료');
  }

  /**
   * 선수 히스토리에서 배지 재계산 및 업데이트
   * @param {string} playerId - 선수 ID
   */
  async updatePlayerBadgesFromHistory(playerId) {
    try {
      const { BADGES } = await import('../utils/badgeSystem.js');
      const { calculatePlayerTotalStats } = await import('../utils/badgeSystem.js');

      // 선수 히스토리 가져오기
      const historyRef = this.getUserDoc('playerHistory', playerId);
      const historyDoc = await getDoc(historyRef);

      if (!historyDoc.exists()) {
        console.log(`⚠️ ${playerId} 히스토리 없음, 빈 배지로 초기화`);
        // 빈 배지 생성
        const badgeRef = this.getUserDoc('playerBadges', playerId);
        await setDoc(badgeRef, {
          playerId,
          badges: [],
          updatedAt: serverTimestamp()
        });
        return;
      }

      const historyData = historyDoc.data();
      const games = historyData.games || [];

      // 누적 통계 계산
      const totalStats = calculatePlayerTotalStats(games, 0); // mvpCount는 별도 관리

      // 획득한 배지 계산
      const earnedBadges = [];
      for (const badge of Object.values(BADGES)) {
        if (badge.condition && badge.condition(totalStats)) {
          earnedBadges.push(badge.id);
        }
      }

      // playerBadges 컬렉션에 저장
      const badgeRef = this.getUserDoc('playerBadges', playerId);
      await setDoc(badgeRef, {
        playerId,
        badges: earnedBadges,
        updatedAt: serverTimestamp()
      });

      console.log(`✅ ${playerId} 배지 업데이트 완료: ${earnedBadges.length}개`);
    } catch (error) {
      console.error(`❌ ${playerId} 배지 업데이트 실패:`, error);
      throw error;
    }
  }

  /**
   * 사용자 프로필 초기화 (최초 로그인 시)
   * @param {Object} userData - 사용자 데이터
   */
  async initializeUserProfile(userData) {
    try {
      const userId = this.getCurrentUserId();
      const profileRef = doc(db, 'users', userId, 'profile', 'info');

      // 이미 프로필이 있는지 확인
      const profileDoc = await getDoc(profileRef);
      if (profileDoc.exists()) {
        console.log('✅ 프로필이 이미 존재합니다.');
        return;
      }

      // 프로필 생성
      await setDoc(profileRef, {
        uid: userId,
        email: userData.email,
        displayName: userData.displayName,
        photoURL: userData.photoURL,
        createdAt: serverTimestamp(),
      });

      console.log('✅ 사용자 프로필 생성 완료');
    } catch (error) {
      console.error('❌ 프로필 생성 실패:', error);
      throw new Error('프로필 생성에 실패했습니다.');
    }
  }
}

// 싱글톤 인스턴스 생성
const firestoreService = new FirestoreService();

export default firestoreService;
