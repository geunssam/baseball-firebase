import { AuthProvider, useAuth } from './contexts/AuthContext';
import { StudentAuthProvider, useStudentAuth } from './contexts/StudentAuthContext';
import { GameProvider } from './contexts/GameContext';
import UnifiedLoginPage from './components/auth/UnifiedLoginPage';
import MainApp from './components/MainApp';
import StudentView from './components/StudentView';
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

  // 학생으로 로그인한 경우
  if (studentData) {
    return <StudentView />;
  }

  // 교사로 로그인한 경우
  if (teacherUser) {
    return (
      <PrivacyConsentGuard>
        <MainApp />
      </PrivacyConsentGuard>
    );
  }

  // 로그인 안 한 경우 통합 로그인 페이지 표시
  return <UnifiedLoginPage />;
}

function App() {
  return (
    <AuthProvider>
      <StudentAuthProvider>
        <GameProvider>
          <Toaster position="top-right" />
          <AppContent />
        </GameProvider>
      </StudentAuthProvider>
    </AuthProvider>
  );
}

export default App;
