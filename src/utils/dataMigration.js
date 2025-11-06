/**
 * 데이터 마이그레이션 유틸리티
 *
 * 기존 학생 데이터를 새로운 스키마로 마이그레이션
 */

import firestoreService from '../services/firestoreService';

/**
 * 학생 데이터 마이그레이션
 *
 * 누락된 필드를 자동으로 채웁니다:
 * - number: 학급별 입력 순서대로 1, 2, 3... 부여
 * - playerId: 없으면 studentId로 설정
 * - gender: 없으면 null로 설정
 * - classId: className 기반으로 classes 컬렉션에서 찾아서 설정
 *
 * @param {Array} students - 학생 목록
 * @param {Function} onProgress - 진행 상황 콜백 (current, total) => void
 * @returns {Promise<Object>} 마이그레이션 결과
 */
export async function migrateStudentData(students, onProgress) {
  const results = {
    total: students.length,
    updated: 0,
    skipped: 0,
    errors: []
  };

  // 1. className을 기준으로 그룹화
  const studentsByClass = students.reduce((acc, student) => {
    const className = student.className || '미지정';
    if (!acc[className]) acc[className] = [];
    acc[className].push(student);
    return acc;
  }, {});

  console.log('📊 마이그레이션 대상:', {
    총학생수: results.total,
    학급수: Object.keys(studentsByClass).length
  });

  let processed = 0;

  // 2. 각 학급별로 처리
  for (const [className, classStudents] of Object.entries(studentsByClass)) {
    try {
      console.log(`🔄 "${className}" 처리 중... (${classStudents.length}명)`);

      // 2-1. 해당 학급이 classes 컬렉션에 있는지 확인
      const classDoc = await firestoreService.getClassByName(className);
      const classId = classDoc?.id || null;

      if (!classId && className !== '미지정') {
        console.warn(`⚠️ "${className}" 학급이 classes 컬렉션에 없습니다.`);
      }

      // 2-2. 학급 내 학생들을 순서대로 번호 부여
      for (let i = 0; i < classStudents.length; i++) {
        const student = classStudents[i];
        const updates = {};
        let needsUpdate = false;

        // number가 없으면 자동 부여
        if (!student.number) {
          updates.number = i + 1;
          needsUpdate = true;
        }

        // playerId가 없으면 id로 설정
        if (!student.playerId) {
          updates.playerId = student.id;
          needsUpdate = true;
        }

        // gender가 없으면 null
        if (student.gender === undefined) {
          updates.gender = null;
          needsUpdate = true;
        }

        // classId 설정 (학급이 존재하는 경우에만)
        if (classId && !student.classId) {
          updates.classId = classId;
          needsUpdate = true;
        }

        // 업데이트할 내용이 있으면 실행
        if (needsUpdate) {
          try {
            await firestoreService.updateStudent(student.id, updates);
            results.updated++;
            console.log(`  ✅ ${student.name} (${student.id}) 업데이트 완료`);
          } catch (error) {
            results.errors.push({
              student: student.name,
              id: student.id,
              error: error.message
            });
            console.error(`  ❌ ${student.name} 업데이트 실패:`, error.message);
          }
        } else {
          results.skipped++;
        }

        processed++;
        if (onProgress) {
          onProgress(processed, results.total);
        }
      }

      console.log(`✅ "${className}" 완료`);
    } catch (error) {
      results.errors.push({
        className,
        error: error.message
      });
      console.error(`❌ "${className}" 처리 실패:`, error);
    }
  }

  console.log('✅ 마이그레이션 완료:', results);
  return results;
}

/**
 * 학급 자동 생성
 *
 * students의 className을 기반으로 classes 컬렉션에 학급 자동 생성
 *
 * @param {Array} students - 학생 목록
 * @returns {Promise<Object>} 생성 결과
 */
export async function autoCreateClasses(students) {
  const results = {
    created: 0,
    skipped: 0,
    errors: []
  };

  // 1. 고유한 학급명 추출
  const classNames = [...new Set(students.map(s => s.className).filter(Boolean))];

  console.log('📊 학급 자동 생성 대상:', classNames);

  // 2. 각 학급별로 처리
  for (const className of classNames) {
    try {
      // 2-1. 이미 존재하는지 확인
      const existingClass = await firestoreService.getClassByName(className);

      if (existingClass) {
        console.log(`⏭️ "${className}" 이미 존재함`);
        results.skipped++;
        continue;
      }

      // 2-2. 학년/반 추출 (예: "5학년 1반" → grade: "5", classNum: "1")
      const match = className.match(/(\d+)학년\s*(\d+)반/);
      const grade = match ? match[1] : null;
      const classNum = match ? match[2] : null;

      // 2-3. 학급 생성
      const classId = await firestoreService.createClass({
        name: className,
        grade,
        classNum
      });

      results.created++;
      console.log(`✅ "${className}" 생성 완료 (ID: ${classId})`);

    } catch (error) {
      results.errors.push({
        className,
        error: error.message
      });
      console.error(`❌ "${className}" 생성 실패:`, error);
    }
  }

  console.log('✅ 학급 자동 생성 완료:', results);
  return results;
}

/**
 * 전체 마이그레이션 실행
 *
 * 1. 학급 자동 생성
 * 2. 학생 데이터 마이그레이션
 *
 * @param {Array} students - 학생 목록
 * @param {Function} onProgress - 진행 상황 콜백
 * @returns {Promise<Object>} 전체 결과
 */
export async function runFullMigration(students, onProgress) {
  console.log('🚀 전체 마이그레이션 시작');

  const results = {
    classes: null,
    students: null
  };

  try {
    // Step 1: 학급 자동 생성
    console.log('\n📝 Step 1: 학급 자동 생성');
    results.classes = await autoCreateClasses(students);

    // Step 2: 학생 데이터 마이그레이션
    console.log('\n📝 Step 2: 학생 데이터 마이그레이션');
    results.students = await migrateStudentData(students, onProgress);

    console.log('\n✅ 전체 마이그레이션 완료!');
    console.log('결과:', {
      학급생성: `${results.classes.created}개 (건너뜀: ${results.classes.skipped})`,
      학생업데이트: `${results.students.updated}명 (건너뜀: ${results.students.skipped})`,
      오류: results.classes.errors.length + results.students.errors.length
    });

    return results;
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
    throw error;
  }
}
