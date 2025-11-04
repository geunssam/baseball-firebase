import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StudentAuthProvider, useStudentAuth } from './contexts/StudentAuthContext';
import { GameProvider } from './contexts/GameContext';
import UnifiedLoginPage from './components/auth/UnifiedLoginPage';
import MainApp from './components/MainApp';
import StudentView from './components/StudentView';
import ShareInvitePage from './components/ShareInvitePage';
import PrivacyConsentGuard from './components/PrivacyConsentGuard';
import { Toaster } from 'react-hot-toast';
import './index.css';

function AppContent() {
  const { user: teacherUser, loading: teacherLoading } = useAuth();
  const { studentData, loading: studentLoading } = useStudentAuth();

  // 둘 다 로딩 중이면 로딩 화면 표시
  if (teacherLoading || studentLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">⚾</div>
          <div className="text-white text-2xl font-bold">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* 공유 초대 페이지 (누구나 접근 가능, 로그인 필요는 컴포넌트 내부에서 처리) */}
      <Route path="/share/:inviteCode" element={<ShareInvitePage />} />

      {/* 학생 뷰 */}
      {studentData && (
        <Route path="*" element={<StudentView />} />
      )}

      {/* 교사 메인 앱 */}
      {teacherUser && (
        <Route path="*" element={
          <PrivacyConsentGuard>
            <MainApp />
          </PrivacyConsentGuard>
        } />
      )}

      {/* 로그인 안 한 경우 */}
      {!teacherUser && !studentData && (
        <Route path="*" element={<UnifiedLoginPage />} />
      )}
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <StudentAuthProvider>
          <GameProvider>
            <Toaster position="top-right" />
            <AppContent />
          </GameProvider>
        </StudentAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
