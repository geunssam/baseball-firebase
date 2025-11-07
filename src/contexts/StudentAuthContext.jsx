import { createContext, useContext, useState, useEffect } from 'react';
import { collection, collectionGroup, query, where, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

const StudentAuthContext = createContext();

export function StudentAuthProvider({ children }) {
  const [studentData, setStudentData] = useState(null); // { id, name, studentCode, className, teacherId }
  const [loading, setLoading] = useState(true);

  // 🔹 컴포넌트 마운트 시 localStorage에서 학생 정보 복원
  useEffect(() => {
    console.log('🔄 StudentAuthContext: Initializing...');
    const savedStudent = localStorage.getItem('studentData');
    if (savedStudent) {
      try {
        const parsed = JSON.parse(savedStudent);
        console.log('✅ StudentAuthContext: Restored student from localStorage:', parsed.name);
        setStudentData(parsed);
      } catch (error) {
        console.error('❌ Failed to parse studentData from localStorage:', error);
        localStorage.removeItem('studentData');
      }
    } else {
      console.log('ℹ️ StudentAuthContext: No saved student in localStorage');
    }
    console.log('✅ StudentAuthContext: Initialization complete, setting loading to false');
    setLoading(false);
  }, []);

  /**
   * 🔹 학생 코드로 로그인
   * @param {string} studentCode - 학생 코드 (예: "abc123-159001")
   * @returns {Promise<{success: boolean, student?: object, error?: string}>}
   */
  const loginWithStudentCode = async (studentCode) => {
    console.log('🔵 StudentAuthContext: loginWithStudentCode called with:', studentCode);
    try {
      console.log('🔵 StudentAuthContext: Setting loading to true');
      setLoading(true);

      // students 컬렉션에서 studentCode로 검색
      // 모든 유저의 students를 검색해야 하므로 collectionGroup 사용
      console.log('🔍 StudentAuthContext: Querying Firestore for student_code:', studentCode.trim());

      // 모든 선생님의 students 컬렉션에서 검색
      const studentsRef = collectionGroup(db, 'students');
      const q = query(
        studentsRef,
        where('studentCode', '==', studentCode.trim())
      );

      const querySnapshot = await getDocs(q);

      console.log('🔍 StudentAuthContext: Query result size:', querySnapshot.size);

      if (querySnapshot.empty) {
        throw new Error('학생 코드가 일치하지 않습니다. 다시 확인해주세요.');
      }

      // 첫 번째 결과 사용
      const studentDoc = querySnapshot.docs[0];
      const studentDataFromDB = studentDoc.data();

      console.log('🔍 StudentAuthContext: Student data:', studentDataFromDB);

      // 학생 데이터 구성
      const student = {
        id: studentDoc.id,
        name: studentDataFromDB.name,
        studentCode: studentDataFromDB.studentCode,
        className: studentDataFromDB.className,
        teacherId: studentDataFromDB.ownerId, // 선생님 ID
        playerId: studentDataFromDB.playerId || studentDoc.id, // player ID (stats 조회용)
      };

      console.log('✅ StudentAuthContext: Login successful, student data:', student);

      // localStorage에 저장 (새로고침 시에도 유지)
      localStorage.setItem('studentData', JSON.stringify(student));
      console.log('✅ StudentAuthContext: Saved to localStorage');

      setStudentData(student);
      console.log('✅ StudentAuthContext: setStudentData called');

      return { success: true, student };

    } catch (error) {
      console.error('❌ StudentAuthContext: Login failed:', error);
      return { success: false, error: error.message };
    } finally {
      console.log('✅ StudentAuthContext: Setting loading to false in finally block');
      setLoading(false);
    }
  };

  // �� 로그아웃
  const logout = () => {
    localStorage.removeItem('studentData');
    setStudentData(null);
    console.log('✅ Student logged out');
  };

  const value = {
    studentData,
    loading,
    loginWithStudentCode,
    logout,
    isLoggedIn: !!studentData,
  };

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
}

// 🔹 Custom Hook
export function useStudentAuth() {
  const context = useContext(StudentAuthContext);
  if (!context) {
    throw new Error('useStudentAuth must be used within StudentAuthProvider');
  }
  return context;
}
