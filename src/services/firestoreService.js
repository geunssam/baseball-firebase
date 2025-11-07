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
  Timestamp,
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
    this.db = db;
    this.currentUser = null;
    this.unsubscribers = []; // 리스너 정리용
    this.listeners = {}; // 리스너 저장소 (classes, students, teams 등)
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
      const userId = this.getCurrentUserId();
      const teamsRef = this.getUserCollection('teams');
      console.log('📡 [FirestoreService] subscribeToTeams 시작, userId:', userId);

      // 생성 시간 순서대로 정렬하여 팀 목록 가져오기
      const q = query(teamsRef, orderBy('createdAt', 'asc'));

      // 1. 내 팀 리스너
      const unsubscribeMyTeams = onSnapshot(q, async (snapshot) => {
        console.log('📡 [FirestoreService] 내 팀 onSnapshot 콜백, snapshot.size:', snapshot.size);
        const myTeams = [];
        snapshot.forEach((doc) => {
          console.log('📡 [FirestoreService] 내 팀 문서:', doc.id, doc.data());
          myTeams.push({
            id: doc.id,
            ...doc.data(),
            isShared: false, // 내 팀은 공유된 것이 아님
            ownerId: userId
          });
        });

        // 2. 공유받은 팀 가져오기
        try {
          const sharedItems = await getSharedWithMe();
          const sharedTeams = [];

          // sharedItems에서 type='team'인 항목들을 찾아서 실제 팀 데이터 조회
          for (const sharedItem of sharedItems) {
            if (!sharedItem.items) continue;

            for (const item of sharedItem.items) {
              if (item.type !== 'team') continue;

              // 소유자의 팀 데이터 가져오기
              const sharedTeam = await getSharedTeam(sharedItem.ownerId, item.id);

              if (sharedTeam) {
                sharedTeams.push({
                  ...sharedTeam,
                  isShared: true,
                  shareId: sharedItem.shareId,
                  ownerId: sharedItem.ownerId,
                  ownerName: sharedItem.ownerName,
                  permission: sharedItem.permission
                });
              }
            }
          }

          console.log(`🔄 팀 동기화: 내 팀 ${myTeams.length}개 + 공유받은 팀 ${sharedTeams.length}개`);

          // 내 팀 + 공유받은 팀 합쳐서 콜백 호출
          callback([...myTeams, ...sharedTeams]);
        } catch (error) {
          console.error('❌ 공유받은 팀 로드 실패:', error);
          // 공유 팀 로드 실패해도 내 팀은 보여주기
          callback(myTeams);
        }
      }, (error) => {
        console.error('❌ 팀 리스너 오류:', error);
        console.error('❌ 에러 코드:', error.code);
        console.error('❌ 에러 메시지:', error.message);
        callback([]);
      });

      this.unsubscribers.push(unsubscribeMyTeams);
      return unsubscribeMyTeams;
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

      // classId 처리: className이 있으면 해당 학급 찾기
      let classId = studentData.classId || null;
      if (!classId && studentData.className) {
        const classDoc = await this.getClassByName(studentData.className);
        classId = classDoc?.id || null;
      }

      const student = {
        ...studentData,
        ownerId: userId,
        playerId: newStudentRef.id, // playerId = studentId (stats 조회용)
        studentCode, // 학생 로그인 코드
        gender: studentData.gender || null, // 성별: 'male', 'female', null
        classId, // 학급 ID (classes 컬렉션 참조)
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

  // ============================================
  // 학급 (Classes) 관리
  // ============================================

  /**
   * 학급 생성
   * @param {Object} classData - 학급 정보
   * @returns {Promise<string>} 생성된 학급 ID
   */
  async createClass(classData) {
    try {
      const userId = this.getCurrentUserId();
      const classesRef = this.getUserCollection('classes');
      const newClassRef = doc(classesRef);

      const classDoc = {
        ...classData,
        ownerId: userId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      await setDoc(newClassRef, classDoc);
      console.log('✅ 학급 생성 완료:', newClassRef.id, classData.name);
      return newClassRef.id;
    } catch (error) {
      console.error('❌ 학급 생성 실패:', error);
      throw new Error('학급 생성에 실패했습니다.');
    }
  }

  /**
   * 모든 학급 가져오기
   * @returns {Promise<Array>} 학급 목록
   */
  async getClasses() {
    try {
      const classesRef = this.getUserCollection('classes');
      const snapshot = await getDocs(classesRef);

      const classes = [];
      snapshot.forEach((doc) => {
        classes.push({ id: doc.id, ...doc.data() });
      });

      console.log(`✅ 학급 ${classes.length}개 로드 완료`);
      return classes;
    } catch (error) {
      console.error('❌ 학급 로드 실패:', error);
      throw new Error('학급 목록을 불러오는데 실패했습니다.');
    }
  }

  /**
   * 학급 목록 실시간 동기화
   * @param {Function} callback - 학급 목록이 업데이트될 때 호출될 콜백 함수
   * @returns {Function} unsubscribe 함수
   */
  subscribeToClasses(callback) {
    try {
      const classesRef = this.getUserCollection('classes');
      const q = query(classesRef, orderBy('createdAt', 'asc'));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const classes = [];
        snapshot.forEach((doc) => {
          classes.push({ id: doc.id, ...doc.data() });
        });

        console.log(`🔄 학급 동기화: ${classes.length}개`);
        callback(classes);
      }, (error) => {
        console.error('❌ 학급 리스너 오류:', error);
        callback([]);
      });

      this.listeners.classes = unsubscribe;
      return unsubscribe;
    } catch (error) {
      console.error('❌ 학급 동기화 실패:', error);
      throw new Error('학급 동기화에 실패했습니다.');
    }
  }

  /**
   * 학급 정보 업데이트
   * @param {string} classId - 학급 ID
   * @param {Object} updates - 업데이트할 데이터
   */
  async updateClass(classId, updates) {
    try {
      const classRef = this.getUserDoc('classes', classId);
      await updateDoc(classRef, {
        ...updates,
        updatedAt: serverTimestamp()
      });
      console.log('✅ 학급 업데이트 완료:', classId);
    } catch (error) {
      console.error('❌ 학급 업데이트 실패:', error);
      throw new Error('학급 업데이트에 실패했습니다.');
    }
  }

  /**
   * 학급 삭제
   * @param {string} classId - 학급 ID
   */
  async deleteClass(classId) {
    try {
      const classRef = this.getUserDoc('classes', classId);
      await deleteDoc(classRef);
      console.log('✅ 학급 삭제 완료:', classId);
    } catch (error) {
      console.error('❌ 학급 삭제 실패:', error);
      throw new Error('학급 삭제에 실패했습니다.');
    }
  }

  /**
   * 학급명으로 학급 찾기
   * @param {string} className - 학급 이름
   * @returns {Promise<Object|null>} 학급 문서 또는 null
   */
  async getClassByName(className) {
    try {
      const classesRef = this.getUserCollection('classes');
      const q = query(classesRef, where('name', '==', className), limit(1));
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return null;
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('❌ 학급 조회 실패:', error);
      return null;
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

      // 생성 시간 순서대로 정렬하여 학생 목록 가져오기 (입력 순서 = 번호순)
      const q = query(studentsRef, orderBy('createdAt', 'asc'));

      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const students = [];

        // 학생 데이터와 배지 정보를 함께 불러오기
        for (const doc of snapshot.docs) {
          const studentData = { id: doc.id, ...doc.data() };

          // 배지 정보 불러오기
          try {
            const badgesDocRef = this.getUserDoc('playerBadges', studentData.playerId || doc.id);
            const badgesSnapshot = await getDoc(badgesDocRef);

            if (badgesSnapshot.exists()) {
              studentData.badges = badgesSnapshot.data().badges || [];
            } else {
              studentData.badges = [];
            }
          } catch (error) {
            console.warn(`⚠️ 배지 불러오기 실패 (${studentData.name}):`, error);
            studentData.badges = [];
          }

          students.push(studentData);
        }

        console.log(`🔄 학생 동기화: ${students.length}명 (배지 포함, 학급명·번호순 정렬)`);
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

      // 1.5. 각 선수의 newBadges 계산 (경기 종료 시점에 즉시 계산)
      console.log('🎖️ [finishGame] 배지 계산 시작...');
      const { BADGES } = await import('../utils/badgeSystem.js');
      const { calculatePlayerTotalStats } = await import('../utils/badgeSystem.js');

      const allPlayersForBadges = [
        ...(finalGameData.teamA?.players || []),
        ...(finalGameData.teamB?.players || [])
      ];

      // 각 player의 newBadges를 실시간 계산
      const playersWithBadges = await Promise.all(
        allPlayersForBadges.map(async (player) => {
          const playerId = player.playerId || player.id;
          if (!playerId) return player;

          try {
            // 1. playerHistory 조회 (과거 경기 기록)
            const historyRef = this.getUserDoc('playerHistory', playerId);
            const historyDoc = await getDoc(historyRef);

            if (!historyDoc.exists()) {
              console.warn(`⚠️ ${player.name} (${playerId}) playerHistory 없음`);
              return player;
            }

            const history = historyDoc.data();
            const games = history.games || [];

            // 2. 현재 경기를 제외한 과거 경기들 (아직 현재 경기 stats는 업데이트 안됨)
            const pastGames = games.filter(g => g.gameId !== gameId);

            // 3. 과거 경기만으로 누적 통계 계산 (= 이번 경기 시작 전 통계)
            const pastStats = calculatePlayerTotalStats(pastGames, 0);

            // 4. 이번 경기 포함 누적 통계 계산
            const currentGameStats = player.stats || {
              hits: 0, runs: 0, homerun: 0,
              goodDefense: 0, bonusCookie: 0
            };

            const totalStatsAfterThisGame = {
              totalHits: pastStats.totalHits + (currentGameStats.hits || 0),
              totalRuns: pastStats.totalRuns + (currentGameStats.runs || 0),
              totalHomerun: pastStats.totalHomerun + (currentGameStats.homerun || 0),
              totalGoodDefense: pastStats.totalGoodDefense + (currentGameStats.goodDefense || 0),
              totalBonusCookie: pastStats.totalBonusCookie + (currentGameStats.bonusCookie || 0),
              totalPoints: pastStats.totalPoints + (currentGameStats.hits || 0) + (currentGameStats.runs || 0) + (currentGameStats.goodDefense || 0) + (currentGameStats.bonusCookie || 0),
              gamesPlayed: pastStats.gamesPlayed + 1,
              mvpCount: pastStats.mvpCount || 0,
              hasPerfectGame: pastStats.hasPerfectGame || false
            };

            // 5. 이번 경기 전까지 보유한 배지 목록 (playerBadges에서 조회)
            let previousBadges = [];
            try {
              const badgeRef = this.getUserDoc('playerBadges', playerId);
              const badgeDoc = await getDoc(badgeRef);
              if (badgeDoc.exists()) {
                previousBadges = badgeDoc.data().badges || [];
              }
            } catch (err) {
              console.warn(`⚠️ ${player.name} playerBadges 조회 실패:`, err);
            }

            // 6. 이번 경기 종료 후 획득해야 할 배지 계산
            const currentBadges = [];
            for (const badge of Object.values(BADGES)) {
              if (badge.condition && badge.condition(totalStatsAfterThisGame)) {
                currentBadges.push(badge.id);
              }
            }

            // 7. 새로 획득한 배지 = 현재 배지 - 이전 배지
            const newBadges = currentBadges.filter(badgeId => !previousBadges.includes(badgeId));

            if (newBadges.length > 0) {
              console.log(`🏅 ${player.name} - 이번 경기에서 새 배지 ${newBadges.length}개 획득:`, newBadges);
            }

            // 8. player 객체에 badges(경기 시작 전)와 newBadges(신규) 모두 추가
            return {
              ...player,
              badges: previousBadges,     // ✅ 경기 시작 전 배지 목록
              newBadges: newBadges        // ✅ 이번 경기에서 새로 획득한 배지
            };
          } catch (err) {
            console.error(`❌ ${player.name} (${playerId}) 배지 계산 실패:`, err);
            return player;
          }
        })
      );

      console.log('✅ [finishGame] 배지 계산 완료');

      // teamA, teamB의 players 배열 업데이트
      const updatedFinalGameData = {
        ...finalGameData,
        teamA: {
          ...finalGameData.teamA,
          players: playersWithBadges.slice(0, finalGameData.teamA?.players?.length || 0)
        },
        teamB: {
          ...finalGameData.teamB,
          players: playersWithBadges.slice(finalGameData.teamA?.players?.length || 0)
        }
      };

      // 2. finishedGames 컬렉션에 저장 (newBadges 포함)
      const finishedGameRef = this.getUserDoc('finishedGames', gameId);
      batch.set(finishedGameRef, {
        ...updatedFinalGameData,
        id: gameId,
        ownerId: userId,
        status: 'finished',
        finishedAt: serverTimestamp(),
      });

      // 3. 선수 히스토리 업데이트 (경기 시작 시 생성된 기록을 업데이트)
      // playersWithBadges 사용 (newBadges 포함된 배열)
      const allPlayersWithTeam = [
        ...playersWithBadges.slice(0, finalGameData.teamA?.players?.length || 0).map(p => ({ ...p, team: finalGameData.teamA.name })),
        ...playersWithBadges.slice(finalGameData.teamA?.players?.length || 0).map(p => ({ ...p, team: finalGameData.teamB.name }))
      ];

      for (const player of allPlayersWithTeam) {
        const playerId = player.playerId || player.id;
        if (!playerId) continue;

        const historyRef = this.getUserDoc('playerHistory', playerId);
        const historyDoc = await getDoc(historyRef);

        if (historyDoc.exists()) {
          const existingHistory = historyDoc.data();

          // 해당 gameId의 기록을 찾아서 stats와 newBadges 업데이트
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
                },
                newBadges: player.newBadges || []  // ✅ newBadges 추가
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

      // 🎯 배지 컬렉션도 업데이트 (경기 종료 시점의 최종 배지 목록 저장)
      for (const player of allPlayersWithTeam) {
        const playerId = player.playerId || player.id;
        if (!playerId || !player.newBadges || player.newBadges.length === 0) continue;

        try {
          const badgeRef = this.getUserDoc('playerBadges', playerId);
          const badgeDoc = await getDoc(badgeRef);

          // 기존 badgeDetails 배열 가져오기 (없으면 빈 배열)
          const existingBadgeDetails = badgeDoc.exists() ? (badgeDoc.data().badgeDetails || []) : [];

          // 새로운 배지들을 badgeDetails 형식으로 변환
          const newBadgeDetails = player.newBadges.map(badgeId => ({
            badgeId,
            awardedAt: serverTimestamp(),
            awardType: 'auto',
            gameId: gameId
          }));

          // 중복 제거 (이미 가지고 있는 배지는 추가하지 않음)
          const existingBadgeIds = existingBadgeDetails.map(detail => detail.badgeId);
          const filteredNewBadgeDetails = newBadgeDetails.filter(
            detail => !existingBadgeIds.includes(detail.badgeId)
          );

          // 합치기
          const updatedBadgeDetails = [...existingBadgeDetails, ...filteredNewBadgeDetails];

          batch.set(badgeRef, {
            playerId,
            badgeDetails: updatedBadgeDetails,
            playerName: player.name,
            updatedAt: serverTimestamp()
          }, { merge: true });

          console.log(`✅ ${player.name} playerBadges 업데이트: ${filteredNewBadgeDetails.length}개 추가`);
        } catch (err) {
          console.error(`❌ ${player.name} playerBadges 업데이트 실패:`, err);
        }
      }

      await batch.commit();
      console.log('✅ 경기 종료, 히스토리 업데이트, 배지 동기화 완료:', gameId);
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
   * 🔧 [일회용 마이그레이션] 기존 finishedGames에 badges 필드 추가
   * 이미 종료된 경기 데이터에 각 선수의 경기 종료 시점 전체 배지 목록(badges)을 추가
   * @param {Function} onProgress - 진행 상황 콜백 함수
   * @param {boolean} forceRecalculate - 기존 badges 필드가 있어도 강제로 재계산 (기본값: false)
   * @returns {Promise<Object>} 마이그레이션 결과 통계
   */
  async migrateBadgesFieldToFinishedGames(onProgress, forceRecalculate = false) {
    try {
      console.log('');
      console.log('==================================================');
      console.log('🔄 [badges 필드 마이그레이션] 시작...');
      console.log('==================================================');

      const userId = this.getCurrentUserId();

      // 1. 모든 finishedGames 조회
      const finishedGamesRef = this.getUserCollection('finishedGames');
      const snapshot = await getDocs(finishedGamesRef);

      console.log(`📊 총 ${snapshot.size}개의 완료된 경기 발견`);

      if (snapshot.size === 0) {
        console.log('⚠️ 마이그레이션할 경기가 없습니다.');
        return {
          totalGames: 0,
          updatedCount: 0,
          skippedCount: 0,
          errorCount: 0
        };
      }

      let updatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      let processedCount = 0;

      // 2. 각 경기 처리
      for (const gameDoc of snapshot.docs) {
        processedCount++;
        const gameId = gameDoc.id;
        const gameData = gameDoc.data();

        try {
          console.log(`\n📌 [${processedCount}/${snapshot.size}] 경기 ${gameId} 처리 중...`);

          // 진행 상황 콜백 호출
          if (onProgress) {
            onProgress(`경기 ${processedCount}/${snapshot.size} 처리 중...`);
          }

          const allPlayers = [
            ...(gameData.teamA?.players || []),
            ...(gameData.teamB?.players || [])
          ];

          // 강제 재계산이 아닌 경우, 이미 badges 필드가 있는 경기는 건너뛰기
          if (!forceRecalculate) {
            const alreadyHasBadges = allPlayers.every(p => p.badges !== undefined);
            if (alreadyHasBadges) {
              console.log(`⏭️ 경기 ${gameId}: 이미 badges 필드 존재 - 건너뜀`);
              skippedCount++;
              continue;
            }
          } else {
            console.log(`🔄 경기 ${gameId}: 강제 재계산 모드 - badges 필드 덮어쓰기`);
          }

          // 3. 각 선수의 badges 계산
          const updatedPlayers = await Promise.all(
            allPlayers.map(async (player) => {
              const playerId = player.playerId || player.id;
              if (!playerId) {
                console.warn(`⚠️ playerId 없음:`, player.name);
                return { ...player, badges: [] };
              }

              try {
                // playerHistory에서 해당 선수의 경기 기록 조회
                const historyRef = this.getUserDoc('playerHistory', playerId);
                const historyDoc = await getDoc(historyRef);

                if (!historyDoc.exists()) {
                  console.warn(`⚠️ ${player.name} (${playerId}) playerHistory 없음`);
                  return { ...player, badges: [] };
                }

                const history = historyDoc.data();
                const games = history.games || [];

                // 경기를 날짜순으로 정렬
                const sortedGames = [...games].sort((a, b) => {
                  const dateA = new Date(a.date);
                  const dateB = new Date(b.date);
                  return dateA - dateB;
                });

                // 해당 gameId 이전까지의 누적 배지 계산 (해당 경기는 제외)
                let cumulativeBadges = [];
                for (const game of sortedGames) {
                  // 해당 게임에 도달하면 중단 (이 게임의 newBadges는 포함하지 않음)
                  if (game.gameId === gameId) {
                    break;
                  }

                  if (game.newBadges && game.newBadges.length > 0) {
                    cumulativeBadges = [...cumulativeBadges, ...game.newBadges];
                  }
                }

                // 중복 제거
                const uniqueBadges = [...new Set(cumulativeBadges)];

                console.log(`  ✅ ${player.name}: ${uniqueBadges.length}개 배지 계산 완료`);

                return {
                  ...player,
                  badges: uniqueBadges
                };
              } catch (err) {
                console.error(`  ❌ ${player.name} (${playerId}) 배지 계산 실패:`, err);
                return { ...player, badges: [] };
              }
            })
          );

          // 4. finishedGames 업데이트
          const teamAPlayersCount = gameData.teamA?.players?.length || 0;
          const updatedGameData = {
            ...gameData,
            teamA: {
              ...gameData.teamA,
              players: updatedPlayers.slice(0, teamAPlayersCount)
            },
            teamB: {
              ...gameData.teamB,
              players: updatedPlayers.slice(teamAPlayersCount)
            }
          };

          const gameRef = this.getUserDoc('finishedGames', gameId);
          await updateDoc(gameRef, updatedGameData);

          updatedCount++;
          console.log(`✅ 경기 ${gameId} 업데이트 완료`);
        } catch (error) {
          errorCount++;
          console.error(`❌ 경기 ${gameId} 처리 실패:`, error);
        }
      }

      console.log('');
      console.log('==================================================');
      console.log('🎉 [badges 필드 마이그레이션] 완료!');
      console.log(`📊 총 경기 수: ${snapshot.size}`);
      console.log(`✅ 업데이트됨: ${updatedCount}`);
      console.log(`⏭️ 건너뜀: ${skippedCount}`);
      console.log(`❌ 오류: ${errorCount}`);
      console.log('==================================================');
      console.log('');

      return {
        totalGames: snapshot.size,
        updatedCount,
        skippedCount,
        errorCount
      };
    } catch (error) {
      console.error('❌ [badges 필드 마이그레이션] 실패:', error);
      throw new Error('badges 필드 마이그레이션에 실패했습니다: ' + error.message);
    }
  }

  /**
   * 🔧 [일회용 마이그레이션] 기존 finishedGames에 newBadges 추가
   * 이미 종료된 경기 데이터에 newBadges를 추가하는 마이그레이션 함수
   * @returns {Promise<Object>} 마이그레이션 결과 통계
   */
  async migrateFinishedGamesWithBadges() {
    try {
      const userId = this.getCurrentUserId();
      console.log('🔄 [마이그레이션] 시작...');

      // 1. 모든 finishedGames 조회
      const finishedGamesRef = this.getUserCollection('finishedGames');
      const snapshot = await getDocs(finishedGamesRef);

      console.log(`📊 [마이그레이션] 총 ${snapshot.size}개 경기 발견`);

      let processedCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      let totalBadgesAdded = 0;

      // 2. 각 경기 처리
      for (const gameDoc of snapshot.docs) {
        const gameId = gameDoc.id;
        const gameData = gameDoc.data();

        try {
          console.log(`\n🎮 [마이그레이션] 경기 ${processedCount + 1}/${snapshot.size} 처리 중... (ID: ${gameId})`);

          // 모든 선수 추출
          const allPlayers = [
            ...(gameData.teamA?.players || []),
            ...(gameData.teamB?.players || [])
          ];

          let gameUpdated = false;
          let badgesAddedInGame = 0;

          // 각 선수의 newBadges 조회
          const updatedPlayers = await Promise.all(
            allPlayers.map(async (player) => {
              const playerId = player.playerId || player.id;

              // 이미 newBadges가 있으면 건너뛰기
              if (player.newBadges && player.newBadges.length > 0) {
                console.log(`  ⏭️  선수 ${player.name}: 이미 배지 있음 (${player.newBadges.length}개)`);
                return player;
              }

              if (!playerId) {
                console.log(`  ⚠️  선수 ${player.name}: playerId 없음`);
                return player;
              }

              try {
                // playerHistory에서 해당 경기의 newBadges 조회
                const historyRef = this.getUserDoc('playerHistory', playerId);
                const historyDoc = await getDoc(historyRef);

                if (historyDoc.exists()) {
                  const history = historyDoc.data();
                  const gameRecord = history.games?.find(g => g.gameId === gameId);

                  if (gameRecord?.newBadges && gameRecord.newBadges.length > 0) {
                    console.log(`  ✅ 선수 ${player.name}: ${gameRecord.newBadges.length}개 배지 추가`);
                    gameUpdated = true;
                    badgesAddedInGame += gameRecord.newBadges.length;
                    return {
                      ...player,
                      newBadges: gameRecord.newBadges
                    };
                  } else {
                    console.log(`  ℹ️  선수 ${player.name}: 획득 배지 없음`);
                  }
                }
              } catch (err) {
                console.warn(`  ⚠️  선수 ${player.name} (${playerId}) newBadges 조회 실패:`, err.message);
              }

              return player;
            })
          );

          // 3. 업데이트가 필요하면 finishedGames 업데이트
          if (gameUpdated) {
            const teamAPlayersCount = gameData.teamA?.players?.length || 0;
            const updatedGameData = {
              ...gameData,
              teamA: {
                ...gameData.teamA,
                players: updatedPlayers.slice(0, teamAPlayersCount)
              },
              teamB: {
                ...gameData.teamB,
                players: updatedPlayers.slice(teamAPlayersCount)
              }
            };

            const gameRef = this.getUserDoc('finishedGames', gameId);
            await updateDoc(gameRef, updatedGameData);

            updatedCount++;
            totalBadgesAdded += badgesAddedInGame;
            console.log(`✅ 경기 업데이트 완료 (${badgesAddedInGame}개 배지 추가)`);
          } else {
            skippedCount++;
            console.log(`⏭️  경기 건너뜀 (업데이트 불필요)`);
          }

          processedCount++;
        } catch (err) {
          errorCount++;
          console.error(`❌ 경기 ${gameId} 처리 실패:`, err);
        }
      }

      const result = {
        totalGames: snapshot.size,
        processedCount,
        updatedCount,
        skippedCount,
        errorCount,
        totalBadgesAdded
      };

      console.log('\n' + '='.repeat(50));
      console.log('🎉 [마이그레이션] 완료!');
      console.log('='.repeat(50));
      console.log(`📊 총 경기 수: ${result.totalGames}`);
      console.log(`✅ 업데이트됨: ${result.updatedCount}`);
      console.log(`⏭️  건너뜀: ${result.skippedCount}`);
      console.log(`❌ 오류: ${result.errorCount}`);
      console.log(`🏅 추가된 배지: ${result.totalBadgesAdded}개`);
      console.log('='.repeat(50));

      return result;
    } catch (error) {
      console.error('❌ [마이그레이션] 실패:', error);
      throw new Error('마이그레이션에 실패했습니다: ' + error.message);
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

  /**
   * 선수의 특정 배지 삭제
   * @param {string} playerId - 선수 ID
   * @param {string} badgeId - 삭제할 배지 ID
   * @returns {Promise<void>}
   */
  async removePlayerBadge(playerId, badgeId) {
    try {
      // 1. 현재 선수의 배지 데이터 가져오기
      const badgeRef = this.getUserDoc('playerBadges', playerId);
      const badgeDoc = await getDoc(badgeRef);

      if (!badgeDoc.exists()) {
        console.warn(`⚠️ ${playerId}의 배지 데이터가 없습니다.`);
        return;
      }

      const badgeData = badgeDoc.data();
      const currentBadgeDetails = badgeData.badgeDetails || [];

      // 2. badgeDetails 배열에서 해당 배지 제거
      const updatedBadgeDetails = currentBadgeDetails.filter(detail => detail.badgeId !== badgeId);

      if (updatedBadgeDetails.length === currentBadgeDetails.length) {
        console.warn(`⚠️ ${playerId}는 ${badgeId} 배지를 가지고 있지 않습니다.`);
        return;
      }

      // 3. Firestore 업데이트
      await updateDoc(badgeRef, {
        badgeDetails: updatedBadgeDetails,
        updatedAt: serverTimestamp()
      });

      console.log(`✅ 배지 삭제 완료: ${playerId}의 ${badgeId} 배지 제거`);
    } catch (error) {
      console.error('❌ 배지 삭제 실패:', error);
      throw new Error('배지 삭제에 실패했습니다.');
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

  /**
   * 경기 기본 설정 저장
   * @param {Object} settings - 경기 기본 설정 데이터
   */
  async saveGameDefaultSettings(settings) {
    try {
      const settingsRef = this.getUserDoc('settings', 'gameDefaults');
      await setDoc(settingsRef, {
        ...settings,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      console.log('✅ 경기 기본 설정 저장 완료:', settings);
    } catch (error) {
      console.error('❌ 경기 기본 설정 저장 실패:', error);
      throw new Error('경기 기본 설정 저장에 실패했습니다.');
    }
  }

  /**
   * 경기 기본 설정 가져오기
   * @returns {Promise<Object|null>} 경기 기본 설정 데이터 또는 null
   */
  async getGameDefaultSettings() {
    try {
      const settingsRef = this.getUserDoc('settings', 'gameDefaults');
      const settingsDoc = await getDoc(settingsRef);

      if (!settingsDoc.exists()) {
        console.log('📭 저장된 경기 기본 설정 없음');
        return null;
      }

      const data = settingsDoc.data();
      console.log('✅ 경기 기본 설정 로드:', data);
      return data;
    } catch (error) {
      console.error('❌ 경기 기본 설정 로드 실패:', error);
      throw new Error('경기 기본 설정을 불러오는데 실패했습니다.');
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

      if (games.length === 0) {
        console.log(`⚠️ ${playerId} 경기 기록 없음`);
        const badgeRef = this.getUserDoc('playerBadges', playerId);
        await setDoc(badgeRef, {
          playerId,
          badges: [],
          updatedAt: serverTimestamp()
        });
        return;
      }

      // 🔹 경기를 날짜순으로 정렬 (오래된 순서부터)
      const sortedGames = [...games].sort((a, b) => {
        const dateA = new Date(a.date);
        const dateB = new Date(b.date);
        return dateA - dateB;
      });

      let previousBadges = []; // 이전까지 획득한 배지 목록
      const updatedGames = []; // newBadges가 추가된 경기 목록

      // 🔹 각 경기마다 순회하면서 새로 획득한 배지 찾기
      for (let i = 0; i < sortedGames.length; i++) {
        const currentGame = sortedGames[i];

        // 해당 경기까지의 누적 통계 계산
        const gamesUpToNow = sortedGames.slice(0, i + 1);
        const cumulativeStats = calculatePlayerTotalStats(gamesUpToNow, 0);

        // 현재까지 획득한 배지 계산
        const currentBadges = [];
        for (const badge of Object.values(BADGES)) {
          if (badge.condition && badge.condition(cumulativeStats)) {
            currentBadges.push(badge.id);
          }
        }

        // 새로 획득한 배지 찾기 (이전 배지 목록과 비교)
        const newBadges = currentBadges.filter(badgeId => !previousBadges.includes(badgeId));

        // 경기 데이터에 newBadges 추가
        updatedGames.push({
          ...currentGame,
          newBadges: newBadges
        });

        // 다음 경기를 위해 이전 배지 목록 업데이트
        previousBadges = [...currentBadges];

        if (newBadges.length > 0) {
          console.log(`🎖️ ${playerId} - 경기 ${currentGame.gameId} (${currentGame.date}): 새 배지 ${newBadges.length}개 획득`);
        }
      }

      // 🔹 playerHistory 업데이트 (newBadges 포함)
      await setDoc(historyRef, {
        ...historyData,
        games: updatedGames,
        updatedAt: serverTimestamp()
      });

      // 🔹 playerBadges 컬렉션에 최종 배지 목록 저장
      const badgeRef = this.getUserDoc('playerBadges', playerId);
      await setDoc(badgeRef, {
        playerId,
        badges: previousBadges, // 최종 배지 목록
        updatedAt: serverTimestamp()
      });

      console.log(`✅ ${playerId} 배지 업데이트 완료: ${previousBadges.length}개 (경기별 newBadges 기록 포함)`);
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

  // ============================================
  // 개인정보 처리 동의 관련 함수
  // ============================================

  /**
   * 개인정보 처리 동의 기록 조회
   * @param {string} teacherId - 교사 ID (Google UID)
   * @param {string} version - 처리방침 버전
   * @returns {Promise<Object|null>} 동의 기록 또는 null
   */
  async checkPrivacyConsent(teacherId, version) {
    try {
      console.log('🔍 [checkPrivacyConsent] 조회 시작:', { teacherId, version });

      // privacy_consents 컬렉션에서 해당 버전의 동의 기록 조회
      // 문서 ID: {teacherId}_{version}
      const consentId = `${teacherId}_${version}`;
      const consentDoc = await getDoc(doc(this.db, 'privacy_consents', consentId));

      if (!consentDoc.exists()) {
        console.log('ℹ️ [checkPrivacyConsent] 동의 기록 없음 (정상)');
        return null;
      }

      const data = { id: consentDoc.id, ...consentDoc.data() };
      console.log('✅ [checkPrivacyConsent] 동의 기록 있음:', data);
      return data;
    } catch (error) {
      console.error('❌ [checkPrivacyConsent] 예외 발생:', error);
      throw error;
    }
  }

  /**
   * 개인정보 처리 동의 저장 (교사)
   * @param {Object} params - 동의 정보
   * @param {string} params.teacherId - 교사 ID (Google UID)
   * @param {string} params.teacherEmail - 교사 이메일
   * @param {string} params.consentType - 동의 유형 ('teacher')
   * @param {string} params.version - 처리방침 버전
   * @param {boolean} params.termsAgreed - 이용약관 동의 여부
   * @param {boolean} params.dataCollectionAgreed - 개인정보 수집 동의 여부
   * @param {boolean} params.marketingAgreed - 마케팅 동의 여부 (선택)
   * @returns {Promise<Object>} 저장된 동의 기록
   */
  async savePrivacyConsent({
    teacherId,
    teacherEmail,
    consentType = 'teacher',
    version,
    termsAgreed,
    dataCollectionAgreed,
    marketingAgreed = false,
  }) {
    try {
      console.log('📝 [savePrivacyConsent] 저장 시작:', {
        teacherId,
        teacherEmail,
        consentType,
        version,
      });

      // IP 주소 및 User Agent 수집
      const ipAddress = null; // 클라이언트에서는 IP 직접 수집 불가
      const userAgent = navigator.userAgent;

      // privacy_consents 컬렉션에 저장
      // 문서 ID: {teacherId}_{version}
      const consentId = `${teacherId}_${version}`;
      const consentData = {
        consentType,
        teacherId,
        teacherEmail,
        privacyPolicyVersion: version,
        termsAgreed,
        dataCollectionAgreed,
        marketingAgreed,
        ipAddress,
        userAgent,
        consentDate: Timestamp.now(),
        metadata: {
          lastUpdated: Timestamp.now(),
          updatedBy: 'system',
        },
      };

      // set with merge: true를 사용하여 upsert 구현
      await setDoc(doc(this.db, 'privacy_consents', consentId), consentData, { merge: true });

      console.log('✅ [savePrivacyConsent] 저장 완료:', consentId);
      return { id: consentId, ...consentData };
    } catch (error) {
      console.error('❌ [savePrivacyConsent] 예외 발생:', error);
      throw error;
    }
  }
}

// 싱글톤 인스턴스 생성
const firestoreService = new FirestoreService();

export default firestoreService;

// ========================================
// 커스텀 배지 관련 함수들 (Phase 1)
// ========================================

/**
 * 커스텀 배지 저장
 * @param {string} teacherId - 교사 UID
 * @param {Object} badge - 배지 객체
 * @returns {Promise<Object>} 저장 결과
 */
export async function saveCustomBadge(teacherId, badge) {
  try {
    const badgeRef = doc(db, 'users', teacherId, 'customBadges', badge.id);

    const badgeData = {
      id: badge.id,
      name: badge.name,
      icon: badge.icon,
      tier: badge.tier || 1,
      badgeType: 'custom',
      conditionType: badge.conditionType || 'manual',
      conditionData: badge.conditionData || null,
      description: badge.description || '',
      isActive: true,
      displayOrder: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(badgeRef, badgeData, { merge: true });
    return { success: true, data: badgeData };
  } catch (error) {
    console.error('커스텀 배지 저장 실패:', error);
    return { success: false, error };
  }
}

/**
 * 커스텀 배지 목록 불러오기
 * @param {string} teacherId - 교사 UID
 * @returns {Promise<Array>} 커스텀 배지 목록
 */
export async function loadCustomBadges(teacherId) {
  try {
    const badgesRef = collection(db, 'users', teacherId, 'customBadges');
    const q = query(badgesRef, where('isActive', '==', true));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('커스텀 배지 불러오기 실패:', error);
    return [];
  }
}

/**
 * 커스텀 배지 삭제
 * @param {string} teacherId - 교사 UID
 * @param {string} badgeId - 배지 ID
 * @returns {Promise<Object>} 삭제 결과
 */
export async function deleteCustomBadge(teacherId, badgeId) {
  try {
    const badgeRef = doc(db, 'users', teacherId, 'customBadges', badgeId);
    await deleteDoc(badgeRef);
    return { success: true };
  } catch (error) {
    console.error('커스텀 배지 삭제 실패:', error);
    return { success: false, error };
  }
}

/**
 * 수동 배지 부여
 * @param {string} teacherId - 교사 UID
 * @param {string} playerId - 학생 ID
 * @param {string} badgeId - 배지 ID
 * @param {string} note - 수여 사유
 * @returns {Promise<Object>} 부여 결과
 */
export async function awardManualBadge(teacherId, playerId, badgeId, note = '') {
  try {
    const badgeRef = doc(db, 'users', teacherId, 'playerBadges', playerId);

    // 기존 배지 목록 가져오기
    const badgeDoc = await getDoc(badgeRef);
    const currentBadgeDetails = badgeDoc.exists() ? (badgeDoc.data().badgeDetails || []) : [];

    // 중복 체크
    const hasBadge = currentBadgeDetails.some(detail => detail.badgeId === badgeId);
    if (hasBadge) {
      return { success: false, error: '이미 보유한 배지입니다' };
    }

    // 새 배지 상세 정보 생성
    const newBadgeDetail = {
      badgeId,
      awardedAt: serverTimestamp(),
      awardedBy: teacherId,
      awardType: 'manual',
      note
    };

    // 배지 추가
    await setDoc(badgeRef, {
      badgeDetails: [...currentBadgeDetails, newBadgeDetail],
      updatedAt: serverTimestamp()
    }, { merge: true });

    return { success: true };
  } catch (error) {
    console.error('수동 배지 부여 실패:', error);
    return { success: false, error };
  }
}

/**
 * 학생의 전체 경기 기록 (상세 정보 포함)
 * @param {string} teacherId - 교사 UID
 * @param {string} playerId - 학생 ID
 * @returns {Promise<Array>} 경기 기록 배열
 */
export async function getPlayerDetailedHistory(teacherId, playerId) {
  try {
    console.log('🔍 [getPlayerDetailedHistory] 시작');
    console.log('  - teacherId:', teacherId);
    console.log('  - playerId:', playerId);

    // 1. playerHistory에서 games 배열 가져오기
    const historyRef = doc(db, 'users', teacherId, 'playerHistory', playerId);
    console.log('  - historyRef 경로:', `users/${teacherId}/playerHistory/${playerId}`);

    const historyDoc = await getDoc(historyRef);
    console.log('  - historyDoc.exists():', historyDoc.exists());

    if (!historyDoc.exists()) {
      console.log(`⚠️ ${playerId} playerHistory 문서가 존재하지 않음`);
      return [];
    }

    const historyData = historyDoc.data();
    console.log('  - historyData:', historyData);

    const games = historyData.games || [];
    console.log('  - games 배열 길이:', games.length);

    if (games.length === 0) {
      console.log('⚠️ games 배열이 비어있음');
      return [];
    }

    console.log('  - 첫 번째 게임:', games[0]);

    // 2. 각 gameId로 finishedGames 조회
    const detailedGames = await Promise.all(
      games.map(async (game) => {
        try {
          const gameRef = doc(db, 'users', teacherId, 'finishedGames', game.gameId);
          const gameDoc = await getDoc(gameRef);

          if (!gameDoc.exists()) {
            console.warn(`⚠️ 경기 ${game.gameId} 데이터 없음 (삭제된 경기) - playerHistory 기본 정보 사용`);
            // 경기가 삭제되었어도 학생의 기록은 유지 (playerHistory 기본 정보 사용)
            return {
              gameId: game.gameId,
              date: game.date,
              team: '(삭제된 경기)',
              score: {
                our: 0,
                opponent: 0
              },
              result: 'unknown',
              stats: game.stats || {
                hits: 0,
                runs: 0,
                goodDefense: 0,
                bonusCookie: 0
              },
              newBadges: game.newBadges || [],
              isDeleted: true // 삭제된 경기 표시용
            };
          }

          const gameData = gameDoc.data();

          // 3. 해당 플레이어의 팀과 스탯 찾기
          // teamA와 teamB 모두에서 찾아봄 (lineup 또는 players 필드)
          const teamAPlayers = gameData.teamA?.lineup || gameData.teamA?.players || [];
          const teamBPlayers = gameData.teamB?.lineup || gameData.teamB?.players || [];

          const playerInTeamA = teamAPlayers.find(p =>
            (p.playerId || p.id) === playerId
          );
          const playerInTeamB = teamBPlayers.find(p =>
            (p.playerId || p.id) === playerId
          );

          const playerData = playerInTeamA || playerInTeamB;
          const playerTeam = playerInTeamA ? gameData.teamA.name : gameData.teamB.name;

          // 4. 승패 계산
          const isTeamA = !!playerInTeamA;
          const teamScore = isTeamA
            ? gameData.scoreBoard?.teamATotal || 0
            : gameData.scoreBoard?.teamBTotal || 0;
          const opponentScore = isTeamA
            ? gameData.scoreBoard?.teamBTotal || 0
            : gameData.scoreBoard?.teamATotal || 0;
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
            stats: playerData?.stats || game.stats || {
              hits: 0,
              runs: 0,
              goodDefense: 0,
              bonusCookie: 0
            },
            newBadges: game.newBadges || [], // playerHistory에 저장된 newBadges 사용
            // 추가 정보 (나중에 필요하면 사용)
            inningDetails: [],
            highlights: []
          };
        } catch (err) {
          console.error(`❌ 경기 ${game.gameId} 처리 실패:`, err);
          return null;
        }
      })
    );

    // null 제거 및 최신순 정렬
    const validGames = detailedGames.filter(g => g !== null);
    validGames.sort((a, b) => new Date(b.date) - new Date(a.date));

    console.log(`✅ ${playerId} 상세 경기 기록 ${validGames.length}개 로드 완료`);
    return validGames;
  } catch (error) {
    console.error('❌ getPlayerDetailedHistory 실패:', error);
    return [];
  }
}

/**
 * 모든 학생의 배지 재계산
 * @param {string} teacherId - 선생님 ID
 * @param {Function} onProgress - 진행 상황 콜백 (선택)
 * @returns {Promise<{success: number, failed: number, total: number}>}
 */
export async function recalculateAllStudentBadges(teacherId, onProgress) {
  try {
    console.log('🔄 모든 학생 배지 재계산 시작...');

    // 1. 모든 학생 조회
    const studentsRef = collection(db, 'users', teacherId, 'students');
    const studentsSnapshot = await getDocs(studentsRef);

    const students = studentsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    console.log(`📊 총 ${students.length}명의 학생 발견`);

    if (students.length === 0) {
      console.log('⚠️ 재계산할 학생이 없습니다.');
      return { success: 0, failed: 0, total: 0 };
    }

    // 2. FirestoreService 인스턴스 생성
    const firestoreService = new FirestoreService();

    // 3. 각 학생의 배지 재계산
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < students.length; i++) {
      const student = students[i];
      const playerId = student.playerId || student.id;

      try {
        console.log(`🔄 [${i + 1}/${students.length}] ${student.name} (${playerId}) 배지 재계산 중...`);

        await firestoreService.updatePlayerBadgesFromHistory(playerId);

        successCount++;
        console.log(`✅ [${i + 1}/${students.length}] ${student.name} 완료`);

        // 진행 상황 콜백 호출
        if (onProgress) {
          onProgress({
            current: i + 1,
            total: students.length,
            studentName: student.name,
            success: successCount,
            failed: failedCount
          });
        }
      } catch (error) {
        failedCount++;
        console.error(`❌ [${i + 1}/${students.length}] ${student.name} 실패:`, error);
      }

      // 너무 빠르게 실행되지 않도록 짧은 딜레이 (Firestore 부하 방지)
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ 배지 재계산 완료!`);
    console.log(`   - 성공: ${successCount}명`);
    console.log(`   - 실패: ${failedCount}명`);
    console.log(`   - 총: ${students.length}명`);

    return {
      success: successCount,
      failed: failedCount,
      total: students.length
    };
  } catch (error) {
    console.error('❌ 배지 재계산 중 오류 발생:', error);
    throw error;
  }
}

/**
 * 학급별 랭킹 가져오기
 * @param {string} teacherId - 교사 ID
 * @returns {Promise<Array>} 학급별 랭킹 데이터
 */
export async function getClassRankings(teacherId) {
  try {
    console.log('🏆 [getClassRankings] 학급별 랭킹 계산 시작');

    // 모든 학급 가져오기
    const classesRef = collection(db, 'users', teacherId, 'classes');
    const classesSnapshot = await getDocs(classesRef);

    const classRankings = [];

    for (const classDoc of classesSnapshot.docs) {
      const classData = classDoc.data();
      const className = classData.name;

      // 해당 학급의 모든 학생 가져오기
      const studentsRef = collection(db, 'users', teacherId, 'students');
      const q = query(studentsRef, where('className', '==', className));
      const studentsSnapshot = await getDocs(q);

      let totalPoints = 0;
      const studentCount = studentsSnapshot.size;

      // 각 학생의 포인트 합산
      for (const studentDoc of studentsSnapshot.docs) {
        const studentData = studentDoc.data();
        totalPoints += studentData.totalPoints || 0;
      }

      classRankings.push({
        className,
        totalPoints,
        studentCount,
        avgPoints: studentCount > 0 ? Math.round(totalPoints / studentCount) : 0
      });
    }

    // 총점 기준으로 내림차순 정렬
    classRankings.sort((a, b) => b.totalPoints - a.totalPoints);

    console.log('✅ [getClassRankings] 학급별 랭킹:', classRankings);
    return classRankings;

  } catch (error) {
    console.error('❌ [getClassRankings] 학급별 랭킹 계산 실패:', error);
    throw error;
  }
}

/**
 * 경기 기본 설정 저장
 * @param {Object} settings - 경기 기본 설정 데이터
 * @returns {Promise<void>}
 */
export async function saveGameDefaultSettings(settings) {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('로그인이 필요합니다.');
    }

    const settingsRef = doc(db, 'users', userId, 'settings', 'gameDefaults');
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    console.log('✅ 경기 기본 설정 저장 완료:', settings);
  } catch (error) {
    console.error('❌ 경기 기본 설정 저장 실패:', error);
    throw new Error('경기 기본 설정 저장에 실패했습니다.');
  }
}

/**
 * 경기 기본 설정 가져오기
 * @returns {Promise<Object|null>} 경기 기본 설정 데이터 또는 null
 */
export async function getGameDefaultSettings() {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('로그인이 필요합니다.');
    }

    const settingsRef = doc(db, 'users', userId, 'settings', 'gameDefaults');
    const settingsDoc = await getDoc(settingsRef);

    if (!settingsDoc.exists()) {
      console.log('📭 저장된 경기 기본 설정 없음');
      return null;
    }

    const data = settingsDoc.data();
    console.log('✅ 경기 기본 설정 로드:', data);
    return data;
  } catch (error) {
    console.error('❌ 경기 기본 설정 로드 실패:', error);
    throw new Error('경기 기본 설정을 불러오는데 실패했습니다.');
  }
}

// ============================================
// 공유 시스템 (Phase 3)
// ============================================

/**
 * 공유 링크 생성
 * @param {Array} items - [{type: 'class'|'team', id: string, name: string, count: number}]
 * @param {string} permission - 'viewer' | 'editor'
 * @returns {Promise<Object>} { shareId, inviteCode, shareUrl }
 */
export async function createShareLink(items, permission = 'viewer') {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('로그인이 필요합니다.');
    }

    const userDoc = await getDoc(doc(db, 'users', userId));
    const userName = userDoc.data()?.displayName || userDoc.data()?.email || '익명';

    // UUID 기반 고유 토큰 생성
    const { v4: uuidv4 } = await import('uuid');
    const inviteCode = uuidv4();

    // shares 컬렉션에 저장
    const shareRef = doc(db, 'shares', inviteCode);
    await setDoc(shareRef, {
      ownerId: userId,
      ownerName: userName,
      items: items.map(item => ({
        type: item.type,
        id: item.id,
        name: item.name,
        count: item.count
      })),
      inviteCode,
      permissions: {
        viewers: permission === 'viewer' ? [] : [],
        editors: permission === 'editor' ? [] : [],
        owners: [userId]
      },
      defaultPermission: permission, // 신규 참여자 기본 권한
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // 초대 링크 생성
    const shareUrl = `${window.location.origin}/share/${inviteCode}`;
    console.log('✅ 공유 링크 생성:', shareUrl);

    return {
      shareId: inviteCode,
      inviteCode,
      shareUrl
    };
  } catch (error) {
    console.error('❌ 공유 링크 생성 실패:', error);
    throw new Error('공유 링크 생성에 실패했습니다.');
  }
}

/**
 * 공유 정보 조회
 * @param {string} inviteCode - 초대 코드
 * @returns {Promise<Object>} 공유 정보
 */
export async function getShareData(inviteCode) {
  try {
    const shareRef = doc(db, 'shares', inviteCode);
    const shareDoc = await getDoc(shareRef);

    if (!shareDoc.exists()) {
      throw new Error('유효하지 않은 초대 링크입니다.');
    }

    const shareData = shareDoc.data();
    const defaultPermission = shareData.defaultPermission || 'viewer';

    console.log('✅ 공유 정보 로드:', shareData);

    return {
      shareId: inviteCode,
      ownerId: shareData.ownerId,
      ownerName: shareData.ownerName,
      items: shareData.items,
      permission: defaultPermission,
      createdAt: shareData.createdAt
    };
  } catch (error) {
    console.error('❌ 공유 정보 로드 실패:', error);
    throw error;
  }
}

/**
 * 초대 수락 (공유 참여)
 * @param {string} inviteCode - 초대 코드
 * @returns {Promise<void>}
 */
export async function joinByInvite(inviteCode) {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('로그인이 필요합니다.');
    }

    const shareData = await getShareData(inviteCode);

    // 자기 자신의 공유는 수락 불가
    if (shareData.ownerId === userId) {
      throw new Error('본인이 생성한 공유는 수락할 수 없습니다.');
    }

    // 1. shares 문서의 permissions에 사용자 추가
    const shareRef = doc(db, 'shares', inviteCode);
    const shareDoc = await getDoc(shareRef);
    const permissions = shareDoc.data().permissions;

    // 권한별로 사용자 추가
    if (shareData.permission === 'viewer') {
      if (!permissions.viewers.includes(userId)) {
        permissions.viewers.push(userId);
      }
    } else if (shareData.permission === 'editor') {
      if (!permissions.editors.includes(userId)) {
        permissions.editors.push(userId);
      }
    }

    await updateDoc(shareRef, {
      permissions,
      updatedAt: serverTimestamp()
    });

    // 2. 사용자의 sharedWithMe에 추가
    const userShareRef = doc(db, 'users', userId, 'sharedWithMe', inviteCode);
    await setDoc(userShareRef, {
      shareId: inviteCode,
      ownerId: shareData.ownerId,
      ownerName: shareData.ownerName,
      items: shareData.items,
      permission: shareData.permission,
      joinedAt: serverTimestamp(),
      lastAccessedAt: serverTimestamp()
    });

    console.log('✅ 공유 참여 완료');
  } catch (error) {
    console.error('❌ 공유 참여 실패:', error);
    throw error;
  }
}

/**
 * 공유받은 항목 조회
 * @returns {Promise<Array>} 공유받은 항목 목록
 */
export async function getSharedWithMe() {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('로그인이 필요합니다.');
    }

    const sharedRef = collection(db, 'users', userId, 'sharedWithMe');
    const sharedSnapshot = await getDocs(sharedRef);

    const sharedItems = [];
    sharedSnapshot.forEach(doc => {
      sharedItems.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log('✅ 공유받은 항목 로드:', sharedItems.length + '개');
    return sharedItems;
  } catch (error) {
    console.error('❌ 공유받은 항목 로드 실패:', error);
    throw error;
  }
}

/**
 * 공유받은 학급의 학생 조회
 * @param {string} ownerId - 원 소유자 UID
 * @param {string} classId - 학급 ID (className)
 * @returns {Promise<Array>} 학생 목록
 */
export async function getSharedClassStudents(ownerId, classId) {
  try {
    const studentsRef = collection(db, 'users', ownerId, 'students');
    const q = query(studentsRef, where('className', '==', classId));
    const studentsSnapshot = await getDocs(q);

    const students = [];
    studentsSnapshot.forEach(doc => {
      students.push({
        id: doc.id,
        ...doc.data()
      });
    });

    console.log(`✅ 공유 학급(${classId}) 학생 로드: ${students.length}명`);
    return students;
  } catch (error) {
    console.error('❌ 공유 학급 학생 로드 실패:', error);
    throw error;
  }
}

/**
 * 공유받은 팀의 선수 조회
 * @param {string} ownerId - 원 소유자 UID
 * @param {string} teamId - 팀 ID
 * @returns {Promise<Object>} 팀 정보 (선수 포함)
 */
export async function getSharedTeam(ownerId, teamId) {
  try {
    const teamRef = doc(db, 'users', ownerId, 'teams', teamId);
    const teamDoc = await getDoc(teamRef);

    if (!teamDoc.exists()) {
      throw new Error('팀을 찾을 수 없습니다.');
    }

    const teamData = {
      id: teamDoc.id,
      ...teamDoc.data()
    };

    console.log(`✅ 공유 팀(${teamData.name}) 로드`);
    return teamData;
  } catch (error) {
    console.error('❌ 공유 팀 로드 실패:', error);
    throw error;
  }
}

/**
 * 공유받은 학급으로 경기 생성 (원 소유자 계정에 저장)
 * @param {string} ownerId - 원 소유자 UID
 * @param {Object} gameData - 경기 데이터
 * @returns {Promise<string>} 생성된 경기 ID
 */
export async function createGameForOwner(ownerId, gameData) {
  try {
    const currentUserId = auth.currentUser?.uid;
    if (!currentUserId) {
      throw new Error('로그인이 필요합니다.');
    }

    const gamesRef = collection(db, 'users', ownerId, 'games');
    const gameDocRef = doc(gamesRef);

    await setDoc(gameDocRef, {
      ...gameData,
      id: gameDocRef.id,
      createdBy: currentUserId, // 실제 진행자 UID
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log(`✅ 경기 생성 완료 (소유자: ${ownerId}, ID: ${gameDocRef.id})`);
    return gameDocRef.id;
  } catch (error) {
    console.error('❌ 경기 생성 실패:', error);
    throw error;
  }
}

/**
 * 공유 권한 변경
 * @param {string} shareId - 공유 ID
 * @param {string} targetUserId - 대상 사용자 UID
 * @param {string} newPermission - 새 권한 ('viewer' | 'editor' | 'owner')
 * @returns {Promise<void>}
 */
export async function updateSharePermission(shareId, targetUserId, newPermission) {
  try {
    const shareRef = doc(db, 'shares', shareId);
    const shareDoc = await getDoc(shareRef);

    if (!shareDoc.exists()) {
      throw new Error('공유를 찾을 수 없습니다.');
    }

    const permissions = shareDoc.data().permissions;

    // 기존 권한에서 제거
    permissions.viewers = permissions.viewers.filter(uid => uid !== targetUserId);
    permissions.editors = permissions.editors.filter(uid => uid !== targetUserId);
    permissions.owners = permissions.owners.filter(uid => uid !== targetUserId);

    // 새 권한에 추가
    if (newPermission === 'viewer') {
      permissions.viewers.push(targetUserId);
    } else if (newPermission === 'editor') {
      permissions.editors.push(targetUserId);
    } else if (newPermission === 'owner') {
      permissions.owners.push(targetUserId);
    }

    await updateDoc(shareRef, {
      permissions,
      updatedAt: serverTimestamp()
    });

    // 사용자의 sharedWithMe도 업데이트
    const userShareRef = doc(db, 'users', targetUserId, 'sharedWithMe', shareId);
    await updateDoc(userShareRef, {
      permission: newPermission,
      updatedAt: serverTimestamp()
    });

    console.log('✅ 권한 변경 완료');
  } catch (error) {
    console.error('❌ 권한 변경 실패:', error);
    throw error;
  }
}

/**
 * 사용자를 공유에서 제거
 * @param {string} shareId - 공유 ID
 * @param {string} targetUserId - 제거할 사용자 UID
 * @returns {Promise<void>}
 */
export async function removeUserFromShare(shareId, targetUserId) {
  try {
    // 1. shares 문서의 permissions에서 제거
    const shareRef = doc(db, 'shares', shareId);
    const shareDoc = await getDoc(shareRef);
    const permissions = shareDoc.data().permissions;

    permissions.viewers = permissions.viewers.filter(uid => uid !== targetUserId);
    permissions.editors = permissions.editors.filter(uid => uid !== targetUserId);
    permissions.owners = permissions.owners.filter(uid => uid !== targetUserId);

    await updateDoc(shareRef, {
      permissions,
      updatedAt: serverTimestamp()
    });

    // 2. 사용자의 sharedWithMe에서 삭제
    const userShareRef = doc(db, 'users', targetUserId, 'sharedWithMe', shareId);
    await deleteDoc(userShareRef);

    console.log('✅ 공유 해제 완료');
  } catch (error) {
    console.error('❌ 공유 해제 실패:', error);
    throw error;
  }
}

/**
 * 학생의 배지 순서 업데이트
 * @param {string} teacherId - 선생님 ID
 * @param {string} playerId - 학생 ID
 * @param {string[]} badgeOrder - 배지 ID 배열 (순서대로)
 * @returns {Promise<void>}
 */
export async function updatePlayerBadgeOrder(teacherId, playerId, badgeOrder) {
  try {
    const playerBadgesRef = doc(db, 'users', teacherId, 'playerBadges', playerId);
    await updateDoc(playerBadgesRef, {
      badges: badgeOrder,
      updatedAt: serverTimestamp()
    });
    console.log('✅ 배지 순서 업데이트 완료');
  } catch (error) {
    console.error('❌ 배지 순서 업데이트 실패:', error);
    throw error;
  }
}

/**
 * 종료된 경기에 배지 정보 마이그레이션
 * @returns {Promise<Object>} 마이그레이션 결과 통계
 */
export async function migrateFinishedGamesWithBadges() {
  return await firestoreService.migrateFinishedGamesWithBadges();
}

/**
 * 완료된 경기에 badges 필드 마이그레이션
 * @param {Function} onProgress - 진행 상황 콜백 함수
 * @param {boolean} forceRecalculate - 기존 badges 필드가 있어도 강제로 재계산
 * @returns {Promise<Object>} 마이그레이션 결과 통계
 */
export async function migrateBadgesFieldToFinishedGames(onProgress, forceRecalculate = false) {
  return await firestoreService.migrateBadgesFieldToFinishedGames(onProgress, forceRecalculate);
}

// ============================================
// 쿠키 수여 관리
// ============================================

/**
 * 쿠키 수여 기록 저장 및 학생 총 쿠키 수 업데이트
 * @param {Object} awardData - 수여 데이터
 * @param {string} awardData.studentId - 학생 ID
 * @param {string} awardData.studentName - 학생 이름
 * @param {string} awardData.className - 학급명
 * @param {number} awardData.classNumber - 학급 번호
 * @param {number} awardData.amount - 쿠키 수량
 * @param {string} awardData.memo - 수여 이유
 * @param {string} awardData.awardedAt - 수여 시간 (ISO string)
 * @returns {Promise<string>} 생성된 기록 ID
 */
export async function awardCookie(awardData) {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('로그인이 필요합니다.');
    }

    // 1. cookieAwards 컬렉션에 기록 저장
    const cookieAwardsRef = collection(db, 'users', userId, 'cookieAwards');
    const newAwardRef = doc(cookieAwardsRef);

    const awardRecord = {
      id: newAwardRef.id,
      studentId: awardData.studentId,
      studentName: awardData.studentName,
      className: awardData.className,
      classNumber: awardData.classNumber,
      amount: awardData.amount,
      memo: awardData.memo,
      awardedAt: Timestamp.fromDate(new Date(awardData.awardedAt)),
      awardedBy: userId,
      createdAt: serverTimestamp()
    };

    await setDoc(newAwardRef, awardRecord);

    // 2. 학생의 총 쿠키 수 업데이트
    const studentRef = doc(db, 'users', userId, 'students', awardData.studentId);
    const studentSnap = await getDoc(studentRef);

    if (studentSnap.exists()) {
      const currentCookies = studentSnap.data().totalCookies || 0;
      await updateDoc(studentRef, {
        totalCookies: currentCookies + awardData.amount,
        updatedAt: serverTimestamp()
      });
    }

    console.log('✅ 쿠키 수여 완료:', newAwardRef.id);
    return newAwardRef.id;
  } catch (error) {
    console.error('❌ 쿠키 수여 실패:', error);
    throw error;
  }
}

/**
 * 쿠키 수여 기록 목록 가져오기
 * @param {number} limitCount - 가져올 기록 수 (기본값: 50)
 * @returns {Promise<Array>} 쿠키 수여 기록 배열
 */
export async function getCookieAwards(limitCount = 50) {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('로그인이 필요합니다.');
    }

    const cookieAwardsRef = collection(db, 'users', userId, 'cookieAwards');
    const q = query(cookieAwardsRef, orderBy('awardedAt', 'desc'), limit(limitCount));

    const snapshot = await getDocs(q);
    const awards = [];

    snapshot.forEach((doc) => {
      awards.push({
        id: doc.id,
        ...doc.data(),
        awardedAt: doc.data().awardedAt?.toDate().toISOString() || new Date().toISOString()
      });
    });

    console.log('✅ 쿠키 수여 기록 로드 완료:', awards.length);
    return awards;
  } catch (error) {
    console.error('❌ 쿠키 수여 기록 로드 실패:', error);
    throw error;
  }
}

/**
 * 특정 학생의 쿠키 수여 기록 가져오기
 * @param {string} studentId - 학생 ID
 * @returns {Promise<Array>} 해당 학생의 쿠키 수여 기록 배열
 */
export async function getStudentCookieAwards(studentId) {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('로그인이 필요합니다.');
    }

    const cookieAwardsRef = collection(db, 'users', userId, 'cookieAwards');
    const q = query(
      cookieAwardsRef,
      where('studentId', '==', studentId),
      orderBy('awardedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const awards = [];

    snapshot.forEach((doc) => {
      awards.push({
        id: doc.id,
        ...doc.data(),
        awardedAt: doc.data().awardedAt?.toDate().toISOString() || new Date().toISOString()
      });
    });

    console.log('✅ 학생 쿠키 수여 기록 로드 완료:', awards.length);
    return awards;
  } catch (error) {
    console.error('❌ 학생 쿠키 수여 기록 로드 실패:', error);
    throw error;
  }
}

/**
 * 쿠키 수여 기록 실시간 리스닝
 * @param {Function} callback - 데이터 변경 시 호출될 콜백 함수
 * @param {number} limitCount - 가져올 기록 수 (기본값: 50)
 * @returns {Function} unsubscribe 함수
 */
export function listenToCookieAwards(callback, limitCount = 50) {
  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('로그인이 필요합니다.');
    }

    const cookieAwardsRef = collection(db, 'users', userId, 'cookieAwards');
    const q = query(cookieAwardsRef, orderBy('awardedAt', 'desc'), limit(limitCount));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const awards = [];
      snapshot.forEach((doc) => {
        awards.push({
          id: doc.id,
          ...doc.data(),
          awardedAt: doc.data().awardedAt?.toDate().toISOString() || new Date().toISOString()
        });
      });

      callback(awards);
    }, (error) => {
      console.error('❌ 쿠키 수여 기록 리스닝 오류:', error);
    });

    return unsubscribe;
  } catch (error) {
    console.error('❌ 쿠키 수여 기록 리스닝 실패:', error);
    throw error;
  }
}
