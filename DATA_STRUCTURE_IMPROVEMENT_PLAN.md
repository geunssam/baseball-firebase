# 데이터 구조 개선 계획

## 📋 목표
기존 기능에 영향 없이 데이터 일관성 확보 및 새로운 컬렉션 추가

---

## 🏗️ Phase 1: classes 컬렉션 추가

### 새로운 컬렉션 구조
```javascript
users/{teacherId}/classes/{classId} = {
  id: classId,
  name: "5학년 1반",
  grade: "5",
  classNum: "1",
  ownerId: teacherId,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### students 컬렉션 수정
```javascript
students/{studentId} = {
  // 기존 필드
  id: studentId,
  name: "김철수",
  className: "5학년 1반",  // 유지 (호환성)
  number: 1,
  gender: "male",
  ownerId: teacherId,
  playerId: studentId,
  studentCode: "QisE0A-abc123",
  createdAt: Timestamp,

  // 새로 추가
  classId: "class123",     // classes 컬렉션 참조
  updatedAt: Timestamp
}
```

### Firestore 보안 규칙 추가
```javascript
// firestore.rules에 추가
match /classes/{classId} {
  allow read: if isOwner(userId);
  allow write: if isOwner(userId);
}
```

---

## 🔧 Phase 2: 기존 학생 데이터 마이그레이션

### 자동 업데이트 항목
1. **number**: 학급별 입력 순서대로 1, 2, 3... 자동 부여
2. **playerId**: 없으면 `studentId`로 설정
3. **gender**: 없으면 `null`로 설정
4. **classId**: className 기반으로 classes 컬렉션에서 찾아서 설정

### 마이그레이션 함수 구현
```javascript
// src/utils/dataMigration.js
export async function migrateStudentData(firestoreService, students) {
  const results = {
    total: students.length,
    updated: 0,
    errors: []
  };

  // 1. className을 기준으로 그룹화
  const studentsByClass = students.reduce((acc, student) => {
    const className = student.className || '미지정';
    if (!acc[className]) acc[className] = [];
    acc[className].push(student);
    return acc;
  }, {});

  // 2. 각 학급별로 처리
  for (const [className, classStudents] of Object.entries(studentsByClass)) {
    try {
      // 2-1. 해당 학급이 classes 컬렉션에 있는지 확인
      const classDoc = await firestoreService.getClassByName(className);
      const classId = classDoc?.id || null;

      // 2-2. 학급 내 학생들을 순서대로 번호 부여
      for (let i = 0; i < classStudents.length; i++) {
        const student = classStudents[i];
        const updates = {};

        // number가 없으면 자동 부여
        if (!student.number) {
          updates.number = i + 1;
        }

        // playerId가 없으면 id로 설정
        if (!student.playerId) {
          updates.playerId = student.id;
        }

        // gender가 없으면 null
        if (!student.gender) {
          updates.gender = null;
        }

        // classId 설정
        if (classId && !student.classId) {
          updates.classId = classId;
        }

        // 업데이트할 내용이 있으면 실행
        if (Object.keys(updates).length > 0) {
          await firestoreService.updateStudent(student.id, updates);
          results.updated++;
        }
      }
    } catch (error) {
      results.errors.push({ className, error: error.message });
    }
  }

  return results;
}
```

### UI 컴포넌트 추가
```javascript
// ClassTeamManagementView.jsx에 마이그레이션 버튼 추가
const handleMigrateData = async () => {
  setIsMigrating(true);
  try {
    const results = await migrateStudentData(firestoreService, students);
    alert(`마이그레이션 완료!\n업데이트: ${results.updated}명\n오류: ${results.errors.length}건`);
  } catch (error) {
    alert('마이그레이션 실패: ' + error.message);
  } finally {
    setIsMigrating(false);
  }
};
```

---

## ⚙️ Phase 3: firestoreService 함수 추가/수정

### 새로 추가할 함수

```javascript
// src/services/firestoreService.js

/**
 * 학급 생성
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
    console.log('✅ 학급 생성 완료:', newClassRef.id);
    return newClassRef.id;
  } catch (error) {
    console.error('❌ 학급 생성 실패:', error);
    throw new Error('학급 생성에 실패했습니다.');
  }
}

/**
 * 학급 목록 조회
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
 * 학급 실시간 동기화
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
```

### 수정할 함수

```javascript
// createStudent 수정
async createStudent(studentData) {
  try {
    const userId = this.getCurrentUserId();
    const studentsRef = this.getUserCollection('students');
    const newStudentRef = doc(studentsRef);

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
      playerId: newStudentRef.id,
      studentCode,
      gender: studentData.gender || null,
      classId,  // 추가
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
```

---

## 🎨 Phase 4: UI 수정

### GameContext.jsx 수정
```javascript
// classes 상태 추가
const [classes, setClasses] = useState([]);

// subscribeToClasses 호출
useEffect(() => {
  if (!user) return;

  const unsubscribeClasses = firestoreService.subscribeToClasses((classesData) => {
    setClasses(classesData);
  });

  return () => {
    unsubscribeClasses?.();
  };
}, [user]);

// Context에 classes 추가
return (
  <GameContext.Provider value={{
    // ... 기존 값들
    classes,
    createClass: firestoreService.createClass.bind(firestoreService),
    updateClass: firestoreService.updateClass.bind(firestoreService),
    deleteClass: firestoreService.deleteClass.bind(firestoreService)
  }}>
    {children}
  </GameContext.Provider>
);
```

### ClassTeamManagementView.jsx 수정
```javascript
const { students, teams, classes, createClass, createStudent, ... } = useGame();

// 학급 생성 핸들러 수정
const handleCreateClass = async () => {
  if (!newClassName.trim()) {
    alert('학급 이름을 입력하세요.');
    return;
  }

  try {
    // classes 컬렉션에 저장
    const [grade, classNum] = newClassName.split('학년 ');
    const classId = await createClass({
      name: newClassName,
      grade: grade || null,
      classNum: classNum?.replace('반', '') || null
    });

    setNewClassName('');
    setShowCreateClassModal(false);

    // 바로 학생 추가 모달 열기
    setTargetClass(newClassName);
    setShowAddStudentsModal(true);
  } catch (error) {
    alert('학급 생성에 실패했습니다: ' + error.message);
  }
};

// 학급 목록 표시 로직 수정
// 옵션 1: classes 컬렉션 우선 사용
const displayClasses = useMemo(() => {
  if (classes.length > 0) {
    // classes 컬렉션이 있으면 그것 사용
    return classes.map(c => ({
      ...c,
      students: students.filter(s => s.classId === c.id || s.className === c.name)
    }));
  } else {
    // 없으면 기존 방식 (className 그룹화)
    const studentsByClass = students.reduce((acc, student) => {
      const className = student.className || '미지정';
      if (!acc[className]) acc[className] = [];
      acc[className].push(student);
      return acc;
    }, {});

    return Object.entries(studentsByClass).map(([name, students]) => ({
      name,
      students
    }));
  }
}, [classes, students]);
```

---

## 🔒 Phase 5: teams.players 구조는 현재 유지

### 결정 사항
- **teams.players 배열은 변경하지 않음**
- 전체 정보 복사 방식 유지
- 12개 파일 수정 회피
- 향후 점진적 개선으로 미룸

### 이유
1. 대규모 리팩토링 (11-14시간) 회피
2. 높은 리스크 회피
3. 현재 기능에 영향 없음
4. 조회 성능 유지

---

## ✅ Phase 6: 테스트 체크리스트

### 학급 관리
- [ ] 학급 생성 (classes 컬렉션에 저장 확인)
- [ ] 학급 목록 표시
- [ ] 학급 이름 변경
- [ ] 학급 삭제
- [ ] 실시간 동기화

### 학생 관리
- [ ] 학생 일괄 추가 (classId, number 자동 부여)
- [ ] 학생 개별 추가
- [ ] 학생 정보 수정
- [ ] 학생 삭제
- [ ] 학생 목록 표시 (배지 포함)

### 팀 관리
- [ ] 팀 생성
- [ ] 팀에 학생 추가 (players 배열에 전체 정보 복사)
- [ ] 라인업 편성
- [ ] 팀 정보 수정
- [ ] 팀 삭제

### 경기 진행
- [ ] 경기 생성 (팀 선택)
- [ ] 경기 진행 (타순, 기록)
- [ ] 이닝별 라인업 변경
- [ ] 경기 종료
- [ ] 경기 기록 저장 (playerHistory)

### 배지 시스템
- [ ] 경기 중 자동 배지 수여
- [ ] 수동 배지 수여
- [ ] 배지 목록 표시
- [ ] 학생별 배지 조회

### 기록 조회
- [ ] 학생 개인 기록
- [ ] 팀별 통계
- [ ] 학급별 랭킹

---

## 📊 예상 작업 시간

| Phase | 작업 내용 | 예상 시간 |
|-------|----------|----------|
| Phase 1 | classes 컬렉션 추가 | 30분 |
| Phase 2 | 데이터 마이그레이션 함수 | 30분 |
| Phase 3 | firestoreService 함수 추가 | 1시간 |
| Phase 4 | UI 수정 | 1-2시간 |
| Phase 5 | teams.players 유지 | 0분 |
| Phase 6 | 테스트 | 30분-1시간 |
| **총계** | | **3.5-5시간** |

---

## 🎯 핵심 전략

1. **점진적 개선**: teams.players는 나중에 개선
2. **호환성 유지**: className과 classId 모두 저장
3. **안전한 마이그레이션**: UI에서 수동 실행, 진행 상황 표시
4. **롤백 가능**: 기존 필드 유지로 언제든 되돌리기 가능

---

## 🚀 다음 단계 (향후 개선)

### 우선순위 낮음
1. teams.players 정규화 (playerId만 저장)
2. games/finishedGames 정규화
3. 공유 시스템과 classes 통합
4. 학급 메타데이터 확장 (담임, 교실, 학년도 등)

---

## 📝 참고 사항

### 데이터 구조 비교

**Before (현재)**
```
students
  - className: "5학년 1반"  // 문자열로만 관리
  - number: 없음 (일부)
  - playerId: 없음 (일부)
```

**After (개선)**
```
classes
  - id: "class123"
  - name: "5학년 1반"

students
  - className: "5학년 1반"  // 호환성 유지
  - classId: "class123"     // 새로 추가
  - number: 1               // 자동 부여
  - playerId: studentId     // 자동 설정
```

### 영향받는 파일
1. `firestore.rules` - classes 규칙 추가
2. `firestoreService.js` - classes CRUD 함수 추가
3. `GameContext.jsx` - classes 상태 추가
4. `ClassTeamManagementView.jsx` - UI 로직 수정
5. `dataMigration.js` - 새로 생성

### 영향받지 않는 기능
- ✅ 팀 관리 (teams.players 유지)
- ✅ 경기 진행 (기존 로직 유지)
- ✅ 배지 시스템 (playerId 기반 유지)
- ✅ 학생 기록 (playerHistory 유지)
- ✅ 공유 시스템 (기존 로직 유지)
