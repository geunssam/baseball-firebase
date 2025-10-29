import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useStudentAuth } from '../../contexts/StudentAuthContext';

export default function UnifiedLoginPage() {
  const [loginType, setLoginType] = useState('teacher'); // 'teacher' | 'student'

  // 교사 로그인 상태
  const { user, signInWithGoogle } = useAuth();
  const [teacherLoading, setTeacherLoading] = useState(false);
  const [teacherError, setTeacherError] = useState(null);

  // 학생 로그인 상태
  const { loginWithStudentCode } = useStudentAuth();
  const [studentCode, setStudentCode] = useState('');
  const [studentError, setStudentError] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);

  // 🔹 교사 Google 로그인 핸들러
  const handleGoogleLogin = async () => {
    try {
      setTeacherLoading(true);
      setTeacherError(null);

      await signInWithGoogle();
      // 성공 시 App.jsx에서 자동으로 MainApp으로 리디렉션됨
    } catch (err) {
      setTeacherError('로그인 중 오류가 발생했습니다.');
      setTeacherLoading(false);
      console.error('Login error:', err);
    }
  };

  // 🔹 학생 코드 로그인 핸들러
  const handleStudentLogin = async (e) => {
    e.preventDefault();

    if (!studentCode.trim()) {
      setStudentError('학생 코드를 입력해주세요.');
      return;
    }

    setStudentError('');
    setStudentLoading(true);

    try {
      const result = await loginWithStudentCode(studentCode);

      if (!result.success) {
        setStudentError(result.error || '로그인에 실패했습니다.');
      }
      // 성공 시 App.jsx에서 자동으로 StudentView로 전환됨
    } catch (err) {
      console.error('❌ Login error:', err);
      setStudentError('로그인 중 오류가 발생했습니다.');
    } finally {
      setStudentLoading(false);
    }
  };

  const handleStudentInputChange = (e) => {
    setStudentCode(e.target.value);
    if (studentError) setStudentError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full">
        {/* 공통 헤더 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⚾</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            필드형 게임 마스터 보드
          </h1>
          <p className="text-gray-600">
            체육 수업을 더욱 재미있게!
          </p>
        </div>

        {/* 탭 선택기 */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setLoginType('teacher')}
            className={`flex-1 py-3 rounded-xl font-bold transition-all duration-300 ${
              loginType === 'teacher'
                ? 'bg-blue-500 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🏫 교사
          </button>
          <button
            onClick={() => setLoginType('student')}
            className={`flex-1 py-3 rounded-xl font-bold transition-all duration-300 ${
              loginType === 'student'
                ? 'bg-green-500 text-white shadow-lg scale-105'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            👨‍🎓 학생
          </button>
        </div>

        {/* 조건부 로그인 UI */}
        <div className="space-y-4">
          {loginType === 'teacher' ? (
            /* 교사 로그인 */
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={teacherLoading}
                className="w-full bg-white border-2 border-gray-300 hover:border-blue-500 hover:shadow-lg text-gray-700 font-bold py-4 px-6 rounded-xl transition duration-200 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {teacherLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                    <span>로그인 중...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    <span>Google로 로그인</span>
                  </>
                )}
              </button>

              {teacherError && (
                <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded-xl">
                  <p className="font-semibold">❌ 로그인 실패</p>
                  <p className="text-sm mt-1">{teacherError}</p>
                </div>
              )}

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-500">교사 계정으로 로그인하여</p>
                <p className="text-sm text-gray-500">학급과 팀을 관리하세요</p>
              </div>
            </>
          ) : (
            /* 학생 로그인 */
            <>
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div>
                  <label
                    htmlFor="studentCode"
                    className="block text-sm font-semibold text-gray-700 mb-2"
                  >
                    학생 코드
                  </label>
                  <input
                    id="studentCode"
                    type="text"
                    value={studentCode}
                    onChange={handleStudentInputChange}
                    placeholder="예: abc123-456789"
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-lg"
                    disabled={studentLoading}
                    autoFocus
                  />
                </div>

                {studentError && (
                  <div className="bg-red-50 border-2 border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
                    ❌ {studentError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={studentLoading || !studentCode.trim()}
                  className={`w-full py-3 px-6 rounded-lg font-bold text-white text-lg transition-all ${
                    studentLoading || !studentCode.trim()
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 shadow-lg hover:shadow-xl'
                  }`}
                >
                  {studentLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      로그인 중...
                    </span>
                  ) : (
                    '로그인'
                  )}
                </button>
              </form>

              <div className="mt-6 text-sm text-gray-600 space-y-2">
                <p className="flex items-start gap-2">
                  <span className="text-green-500">💡</span>
                  <span>학생 코드는 선생님께서 제공해주십니다.</span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="text-green-500">💡</span>
                  <span>학생 코드를 잊어버렸다면 선생님께 문의하세요.</span>
                </p>
              </div>
            </>
          )}
        </div>

        {/* 푸터 */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-400">
            © 2025 필드형 게임 마스터 보드
          </p>
        </div>
      </div>
    </div>
  );
}
