# 필드형 게임 마스터 보드 - Firebase 풀스택 개발 PRD

## 📋 프로젝트 개요

### 목표
기존 localStorage 기반 야구 스코어보드 웹앱을 Firebase 백엔드와 연동하여 클라우드 기반 풀스택 애플리케이션으로 전환

### 핵심 기능
- **Google OAuth 로그인**: 교사용 구글 계정 인증
- **실시간 데이터 동기화**: Firestore를 통한 실시간 경기 데이터 관리
- **클라우드 저장**: 팀, 경기, 선수 기록의 영구 저장
- **다중 기기 지원**: 여러 기기에서 동일한 데이터 접근
- **Vercel 배포**: 자동 배포 및 호스팅

---

## 🏗️ Phase 1: 프로젝트 초기 설정 (30분)

### 1.1 개발 환경 구축

#### 기술 스택
```
Frontend:
- React 18 (Vite)
- Tailwind CSS
- @dnd-kit (드래그 앤 드롭)
- Chart.js (통계 차트)

Backend:
- Firebase Authentication (Google OAuth)
- Firestore Database (NoSQL)
- Firebase Hosting (선택)

Deployment:
- Vercel (Main)
- GitHub (소스 관리)
```

#### 프로젝트 구조
```
baseball-firebase/
├── src/
│   ├── components/        # React 컴포넌트
│   │   ├── auth/         # 인증 관련 컴포넌트
│   │   ├── game/         # 경기 관련 컴포넌트
│   │   ├── team/         # 팀 관리 컴포넌트
│   │   └── common/       # 공통 컴포넌트
│   ├── contexts/         # React Context (상태 관리)
│   │   ├── AuthContext.jsx
│   │   └── GameContext.jsx
│   ├── config/           # 설정 파일
│   │   └── firebase.js
│   ├── services/         # Firebase 서비스 레이어
│   │   ├── authService.js
│   │   ├── firestoreService.js
│   │   └── gameService.js
│   ├── utils/            # 유틸리티 함수
│   │   ├── badgeSystem.js
│   │   └── playerIdGenerator.js
│   ├── hooks/            # Custom Hooks
│   │   ├── useAuth.js
│   │   └── useFirestore.js
│   └── App.jsx
├── public/
├── .env.local            # 환경 변수 (Git 제외)
├── .env.example          # 환경 변수 예시
├── vercel.json           # Vercel 설정
└── firebase.json         # Firebase 설정
```

### 1.2 필수 패키지 설치

```bash
# 프로젝트 생성
npm create vite@latest baseball-firebase -- --template react

# 핵심 라이브러리
npm install firebase
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install chart.js react-chartjs-2

# UI 라이브러리
npm install -D tailwindcss postcss autoprefixer @tailwindcss/postcss
npx tailwindcss init
```

### 1.3 환경 변수 설정

**`.env.local`** (실제 값은 Firebase Console에서 발급):
```env
VITE_FIREBASE_API_KEY=your_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

**`.env.example`** (Git 커밋용 템플릿):
```env
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

### 1.4 Tailwind CSS 설정

**`tailwind.config.js`**:
```javascript
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

**`src/index.css`**:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

---

## 🔥 Phase 2: Firebase 설정 및 Google OAuth 구현 (1시간)

### 2.1 Firebase 프로젝트 생성

#### Firebase Console 작업 (https://console.firebase.google.com/)

1. **프로젝트 생성**
   - 프로젝트 이름: `baseball-scoreboard-prod`
   - Google Analytics: 선택사항 (비활성화 가능)

2. **웹 앱 추가**
   - 앱 닉네임: `Baseball Scoreboard Web`
   - Firebase Hosting 체크 (선택사항)
   - 설정 정보 복사 → `.env.local`에 저장

3. **Authentication 활성화**
   - Authentication → Sign-in method
   - **Google** 로그인 제공업체 활성화
   - 프로젝트 지원 이메일 설정 (본인 Gmail)
   - 승인된 도메인 추가:
     - `localhost` (자동 추가됨)
     - `vercel.app` (배포 후 추가)
     - 커스텀 도메인 (있을 경우)

4. **Firestore Database 생성**
   - Firestore Database → 데이터베이스 만들기
   - **테스트 모드**로 시작 (개발 중)
   - 위치: `asia-northeast3 (Seoul)` 선택
   - 규칙은 나중에 수정

5. **보안 규칙 설정** (초기 개발용)
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       // 인증된 사용자만 자신의 데이터 접근 가능
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```

### 2.2 Firebase 설정 파일 작성

**`src/config/firebase.js`**:
```javascript
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';

// 환경 변수에서 Firebase 설정 불러오기
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Authentication 초기화
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Google OAuth 설정
googleProvider.setCustomParameters({
  prompt: 'select_account', // 항상 계정 선택 화면 표시
  hd: '*' // 모든 Google 계정 허용 (특정 도메인만 허용하려면 'school.edu')
});

// Firestore 초기화
export const db = getFirestore(app);

// 오프라인 지속성 활성화 (선택사항 - 오프라인 모드 지원)
enableIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    console.warn('오프라인 지속성 실패: 여러 탭에서 열림');
  } else if (err.code === 'unimplemented') {
    console.warn('오프라인 지속성 미지원 브라우저');
  }
});

export default app;
```

### 2.3 인증 서비스 레이어

**`src/services/authService.js`**:
```javascript
import {
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import { auth, googleProvider } from '../config/firebase';

class AuthService {
  // Google 로그인
  async signInWithGoogle() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      console.log('✅ 로그인 성공:', {
        이름: user.displayName,
        이메일: user.email,
        사진: user.photoURL,
        UID: user.uid
      });

      return user;
    } catch (error) {
      console.error('❌ 로그인 실패:', error);

      // 에러 메시지 한글화
      const errorMessages = {
        'auth/popup-closed-by-user': '로그인 창이 닫혔습니다. 다시 시도해주세요.',
        'auth/popup-blocked': '팝업이 차단되었습니다. 팝업 차단을 해제해주세요.',
        'auth/cancelled-popup-request': '로그인이 취소되었습니다.',
        'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
      };

      throw new Error(errorMessages[error.code] || '로그인에 실패했습니다.');
    }
  }

  // 로그아웃
  async signOut() {
    try {
      await signOut(auth);
      console.log('✅ 로그아웃 성공');
    } catch (error) {
      console.error('❌ 로그아웃 실패:', error);
      throw new Error('로그아웃에 실패했습니다.');
    }
  }

  // 현재 사용자 가져오기
  getCurrentUser() {
    return auth.currentUser;
  }

  // 인증 상태 변화 리스너
  onAuthStateChanged(callback) {
    return onAuthStateChanged(auth, callback);
  }
}

export default new AuthService();
```

### 2.4 인증 Context

**`src/contexts/AuthContext.jsx`**:
```javascript
import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 인증 상태 리스너
  useEffect(() => {
    const unsubscribe = authService.onAuthStateChanged((user) => {
      setUser(user);
      setLoading(false);

      if (user) {
        console.log('👤 사용자 인증됨:', user.displayName);
      } else {
        console.log('👤 사용자 미인증');
      }
    });

    return () => unsubscribe();
  }, []);

  // Google 로그인
  const signInWithGoogle = async () => {
    try {
      setError(null);
      setLoading(true);
      await authService.signInWithGoogle();
    } catch (error) {
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // 로그아웃
  const signOut = async () => {
    try {
      setError(null);
      await authService.signOut();
    } catch (error) {
      setError(error.message);
      throw error;
    }
  };

  const value = {
    user,
    loading,
    error,
    signInWithGoogle,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### 2.5 로그인 컴포넌트

**`src/components/auth/LoginPage.jsx`**:
```javascript
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

const LoginPage = () => {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      setError(null);
      await signInWithGoogle();
    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        {/* 로고 영역 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">⚾</div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            필드형 게임 마스터 보드
          </h1>
          <p className="text-gray-600">
            교사용 야구 스코어보드 & 기록 관리 시스템
          </p>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Google 로그인 버튼 */}
        <button
          onClick={handleGoogleSignIn}
          disabled={isLoading}
          className="w-full bg-white border-2 border-gray-300 rounded-lg px-6 py-4 flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
        >
          {isLoading ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-gray-700 font-semibold">로그인 중...</span>
            </div>
          ) : (
            <>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt="Google"
                className="w-6 h-6"
              />
              <span className="text-gray-700 font-semibold text-lg">
                Google 계정으로 로그인
              </span>
            </>
          )}
        </button>

        {/* 안내 메시지 */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="text-sm text-gray-600 space-y-2">
            <p className="flex items-start gap-2">
              <span className="text-blue-500">✓</span>
              <span>교사용 Google 계정으로 로그인하세요</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-blue-500">✓</span>
              <span>모든 데이터는 클라우드에 안전하게 저장됩니다</span>
            </p>
            <p className="flex items-start gap-2">
              <span className="text-blue-500">✓</span>
              <span>여러 기기에서 동일한 계정으로 접근 가능합니다</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center text-xs text-gray-400">
          로그인하면 서비스 이용약관 및 개인정보 보호정책에 동의하게 됩니다
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
```

---

## 🗄️ Phase 3: Firestore 데이터 구조 및 서비스 레이어 (1.5시간)

### 3.1 Firestore 데이터베이스 구조

```
users/ (컬렉션)
  └── {userId} (문서 - Google UID)
       ├── profile (서브컬렉션)
       │    └── info (문서)
       │         ├── displayName: string
       │         ├── email: string
       │         ├── photoURL: string
       │         ├── createdAt: timestamp
       │         └── lastLoginAt: timestamp
       │
       ├── teams (서브컬렉션)
       │    └── {teamId} (문서)
       │         ├── id: string
       │         ├── name: string (예: "6학년 1반")
       │         ├── players: array
       │         │    └── { id, name, number }
       │         ├── createdAt: timestamp
       │         └── updatedAt: timestamp
       │
       ├── games (서브컬렉션) - 진행 중인 경기
       │    └── {gameId} (문서)
       │         ├── id: string
       │         ├── status: string ("live" | "finished")
       │         ├── teamAId: string
       │         ├── teamBId: string
       │         ├── teamA: object
       │         │    ├── name: string
       │         │    └── lineup: array
       │         ├── teamB: object
       │         ├── scoreboard: object
       │         ├── currentInning: number
       │         ├── innings: number
       │         ├── isTopInning: boolean
       │         ├── strikes: number
       │         ├── balls: number
       │         ├── outs: number
       │         ├── bases: object
       │         ├── createdAt: timestamp
       │         └── updatedAt: timestamp
       │
       ├── finishedGames (서브컬렉션) - 종료된 경기
       │    └── {gameId} (문서)
       │         ├── [games와 동일한 구조]
       │         └── finishedAt: timestamp
       │
       ├── playerBadges (서브컬렉션)
       │    └── {playerId} (문서)
       │         ├── playerId: string
       │         ├── badges: array [badgeId1, badgeId2, ...]
       │         └── updatedAt: timestamp
       │
       ├── playerHistory (서브컬렉션)
       │    └── {playerId} (문서)
       │         ├── playerId: string
       │         ├── games: array
       │         │    └── {
       │         │         gameId,
       │         │         date,
       │         │         stats: { hits, runs, goodDefense, bonusCookie }
       │         │       }
       │         └── updatedAt: timestamp
       │
       └── settings (서브컬렉션)
            └── config (문서)
                 ├── defaultInnings: number
                 ├── usePositions: boolean
                 ├── positions: array
                 ├── options: object
                 └── updatedAt: timestamp
```

### 3.2 Firestore 서비스 레이어

**`src/services/firestoreService.js`**:
```javascript
import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../config/firebase';

class FirestoreService {
  constructor(userId) {
    if (!userId) {
      throw new Error('userId is required for FirestoreService');
    }
    this.userId = userId;
    this.userRef = doc(db, 'users', userId);
  }

  // ============================================
  // 사용자 프로필 관리
  // ============================================

  async createOrUpdateProfile(userData) {
    const profileRef = doc(this.userRef, 'profile', 'info');
    await setDoc(profileRef, {
      displayName: userData.displayName,
      email: userData.email,
      photoURL: userData.photoURL,
      lastLoginAt: serverTimestamp(),
      createdAt: serverTimestamp()
    }, { merge: true });
  }

  async getProfile() {
    const profileRef = doc(this.userRef, 'profile', 'info');
    const profileSnap = await getDoc(profileRef);
    return profileSnap.exists() ? profileSnap.data() : null;
  }

  // ============================================
  // 팀 관리 (CRUD)
  // ============================================

  async createTeam(teamData) {
    const teamsRef = collection(this.userRef, 'teams');
    const newTeamRef = doc(teamsRef);

    await setDoc(newTeamRef, {
      ...teamData,
      id: newTeamRef.id,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return newTeamRef.id;
  }

  async getTeams() {
    const teamsRef = collection(this.userRef, 'teams');
    const q = query(teamsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async updateTeam(teamId, teamData) {
    const teamRef = doc(this.userRef, 'teams', teamId);
    await updateDoc(teamRef, {
      ...teamData,
      updatedAt: serverTimestamp()
    });
  }

  async deleteTeam(teamId) {
    const teamRef = doc(this.userRef, 'teams', teamId);
    await deleteDoc(teamRef);
  }

  // 팀 실시간 리스너
  subscribeToTeams(callback) {
    const teamsRef = collection(this.userRef, 'teams');
    const q = query(teamsRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const teams = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(teams);
    }, (error) => {
      console.error('팀 리스너 에러:', error);
    });
  }

  // ============================================
  // 경기 관리 (CRUD)
  // ============================================

  async createGame(gameData) {
    const gamesRef = collection(this.userRef, 'games');
    const newGameRef = doc(gamesRef);

    await setDoc(newGameRef, {
      ...gameData,
      id: newGameRef.id,
      status: 'live',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return newGameRef.id;
  }

  async getGames() {
    const gamesRef = collection(this.userRef, 'games');
    const q = query(gamesRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  async getGame(gameId) {
    const gameRef = doc(this.userRef, 'games', gameId);
    const gameSnap = await getDoc(gameRef);

    if (gameSnap.exists()) {
      return { id: gameSnap.id, ...gameSnap.data() };
    }
    return null;
  }

  async updateGame(gameId, gameData) {
    const gameRef = doc(this.userRef, 'games', gameId);
    await updateDoc(gameRef, {
      ...gameData,
      updatedAt: serverTimestamp()
    });
  }

  async finishGame(gameId) {
    // 1. 현재 경기 데이터 가져오기
    const gameRef = doc(this.userRef, 'games', gameId);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
      throw new Error('경기를 찾을 수 없습니다');
    }

    const gameData = gameSnap.data();

    // 2. finishedGames에 복사
    const finishedGameRef = doc(this.userRef, 'finishedGames', gameId);
    await setDoc(finishedGameRef, {
      ...gameData,
      status: 'finished',
      finishedAt: serverTimestamp()
    });

    // 3. games에서 삭제
    await deleteDoc(gameRef);

    return gameData;
  }

  async getFinishedGames() {
    const finishedGamesRef = collection(this.userRef, 'finishedGames');
    const q = query(finishedGamesRef, orderBy('finishedAt', 'desc'));
    const snapshot = await getDocs(q);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  }

  // 경기 실시간 리스너 (모든 경기)
  subscribeToGames(callback) {
    const gamesRef = collection(this.userRef, 'games');
    const q = query(gamesRef, orderBy('createdAt', 'desc'));

    return onSnapshot(q, (snapshot) => {
      const games = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(games);
    }, (error) => {
      console.error('경기 리스너 에러:', error);
    });
  }

  // 특정 경기 실시간 리스너
  subscribeToGame(gameId, callback) {
    const gameRef = doc(this.userRef, 'games', gameId);

    return onSnapshot(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        callback({ id: snapshot.id, ...snapshot.data() });
      } else {
        callback(null);
      }
    }, (error) => {
      console.error('경기 리스너 에러:', error);
    });
  }

  // ============================================
  // 선수 배지 관리
  // ============================================

  async updatePlayerBadges(playerId, badges) {
    const badgeRef = doc(this.userRef, 'playerBadges', playerId);
    await setDoc(badgeRef, {
      playerId,
      badges,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  async getPlayerBadges(playerId) {
    const badgeRef = doc(this.userRef, 'playerBadges', playerId);
    const badgeSnap = await getDoc(badgeRef);

    if (badgeSnap.exists()) {
      return badgeSnap.data().badges || [];
    }
    return [];
  }

  async getAllPlayerBadges() {
    const badgesRef = collection(this.userRef, 'playerBadges');
    const snapshot = await getDocs(badgesRef);

    const badgesMap = {};
    snapshot.docs.forEach(doc => {
      badgesMap[doc.id] = doc.data().badges || [];
    });

    return badgesMap;
  }

  // ============================================
  // 선수 히스토리 관리
  // ============================================

  async updatePlayerHistory(playerId, gameRecord) {
    const historyRef = doc(this.userRef, 'playerHistory', playerId);
    const historySnap = await getDoc(historyRef);

    let games = [];
    if (historySnap.exists()) {
      games = historySnap.data().games || [];
    }

    games.push(gameRecord);

    await setDoc(historyRef, {
      playerId,
      games,
      updatedAt: serverTimestamp()
    });
  }

  async getPlayerHistory(playerId) {
    const historyRef = doc(this.userRef, 'playerHistory', playerId);
    const historySnap = await getDoc(historyRef);

    if (historySnap.exists()) {
      return historySnap.data().games || [];
    }
    return [];
  }

  async getAllPlayerHistory() {
    const historyRef = collection(this.userRef, 'playerHistory');
    const snapshot = await getDocs(historyRef);

    const historyMap = {};
    snapshot.docs.forEach(doc => {
      historyMap[doc.id] = doc.data().games || [];
    });

    return historyMap;
  }

  // ============================================
  // 설정 관리
  // ============================================

  async getSettings() {
    const settingsRef = doc(this.userRef, 'settings', 'config');
    const settingsSnap = await getDoc(settingsRef);

    return settingsSnap.exists() ? settingsSnap.data() : null;
  }

  async updateSettings(settings) {
    const settingsRef = doc(this.userRef, 'settings', 'config');
    await setDoc(settingsRef, {
      ...settings,
      updatedAt: serverTimestamp()
    }, { merge: true });
  }

  // ============================================
  // 일괄 작업 (Batch)
  // ============================================

  async batchUpdatePlayerData(players) {
    const batch = writeBatch(db);

    players.forEach(({ playerId, badges, history }) => {
      if (badges) {
        const badgeRef = doc(this.userRef, 'playerBadges', playerId);
        batch.set(badgeRef, {
          playerId,
          badges,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }

      if (history) {
        const historyRef = doc(this.userRef, 'playerHistory', playerId);
        batch.set(historyRef, {
          playerId,
          games: history,
          updatedAt: serverTimestamp()
        }, { merge: true });
      }
    });

    await batch.commit();
  }
}

export default FirestoreService;
```

### 3.3 Game Context 수정 (Firebase 통합)

**`src/contexts/GameContext.jsx`**:
```javascript
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import FirestoreService from '../services/firestoreService';
import { generatePlayerId } from '../utils/playerIdGenerator';

const GameContext = createContext();

export const useGame = () => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGame must be used within GameProvider');
  }
  return context;
};

export const GameProvider = ({ children }) => {
  const { user } = useAuth();
  const [firestoreService, setFirestoreService] = useState(null);

  // 전역 상태
  const [teams, setTeams] = useState([]);
  const [games, setGames] = useState([]);
  const [finishedGames, setFinishedGames] = useState([]);
  const [playerBadges, setPlayerBadges] = useState({});
  const [playerHistory, setPlayerHistory] = useState({});
  const [playerRegistry, setPlayerRegistry] = useState({});
  const [settings, setSettings] = useState({
    defaultInnings: 1,
    usePositions: true,
    positions: ['포수', '1루수', '2루수', '3루수', '내야수', '외야수', '자유수비', '직접입력'],
    options: {
      strikes: true,
      balls: false,
      outs: false,
      bases: true
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('저장됨');

  // Firebase 서비스 초기화 및 데이터 로드
  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const initializeFirestore = async () => {
      try {
        const service = new FirestoreService(user.uid);
        setFirestoreService(service);

        // 프로필 생성/업데이트
        await service.createOrUpdateProfile({
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL
        });

        // 초기 데이터 로드
        const [teamsData, gamesData, finishedGamesData, settingsData, badgesData, historyData] =
          await Promise.all([
            service.getTeams(),
            service.getGames(),
            service.getFinishedGames(),
            service.getSettings(),
            service.getAllPlayerBadges(),
            service.getAllPlayerHistory()
          ]);

        setTeams(teamsData);
        setGames(gamesData);
        setFinishedGames(finishedGamesData);
        setPlayerBadges(badgesData);
        setPlayerHistory(historyData);

        if (settingsData) {
          setSettings(settingsData);
        }

        console.log('✅ Firestore 데이터 로드 완료');
        setIsLoading(false);
      } catch (error) {
        console.error('❌ Firestore 초기화 실패:', error);
        setIsLoading(false);
      }
    };

    initializeFirestore();
  }, [user]);

  // 실시간 리스너 설정
  useEffect(() => {
    if (!firestoreService) return;

    // 팀 실시간 동기화
    const unsubscribeTeams = firestoreService.subscribeToTeams((teamsData) => {
      setTeams(teamsData);
    });

    // 경기 실시간 동기화
    const unsubscribeGames = firestoreService.subscribeToGames((gamesData) => {
      setGames(gamesData);
    });

    return () => {
      unsubscribeTeams();
      unsubscribeGames();
    };
  }, [firestoreService]);

  // 선수 레지스트리 헬퍼
  const getOrCreatePlayer = (name, className = null) => {
    const key = className ? `${name}@${className}` : name;

    if (playerRegistry[key]) {
      return {
        id: playerRegistry[key],
        name,
        className,
        isNew: false
      };
    }

    const newId = generatePlayerId();
    setPlayerRegistry(prev => ({
      ...prev,
      [key]: newId
    }));

    return {
      id: newId,
      name,
      className,
      isNew: true
    };
  };

  // 팀 관리 함수
  const createTeam = async (teamData) => {
    if (!firestoreService) return;
    try {
      setSaveStatus('저장 중...');
      const teamId = await firestoreService.createTeam(teamData);
      setSaveStatus('저장됨');
      return teamId;
    } catch (error) {
      console.error('팀 생성 실패:', error);
      setSaveStatus('저장 실패');
      throw error;
    }
  };

  const updateTeam = async (teamId, teamData) => {
    if (!firestoreService) return;
    try {
      setSaveStatus('저장 중...');
      await firestoreService.updateTeam(teamId, teamData);
      setSaveStatus('저장됨');
    } catch (error) {
      console.error('팀 업데이트 실패:', error);
      setSaveStatus('저장 실패');
      throw error;
    }
  };

  const deleteTeam = async (teamId) => {
    if (!firestoreService) return;
    try {
      await firestoreService.deleteTeam(teamId);
    } catch (error) {
      console.error('팀 삭제 실패:', error);
      throw error;
    }
  };

  // 경기 관리 함수
  const createGame = async (gameData) => {
    if (!firestoreService) return;
    try {
      setSaveStatus('저장 중...');
      const gameId = await firestoreService.createGame(gameData);
      setSaveStatus('저장됨');
      return gameId;
    } catch (error) {
      console.error('경기 생성 실패:', error);
      setSaveStatus('저장 실패');
      throw error;
    }
  };

  const updateGame = async (gameId, gameData) => {
    if (!firestoreService) return;
    try {
      await firestoreService.updateGame(gameId, gameData);
    } catch (error) {
      console.error('경기 업데이트 실패:', error);
      throw error;
    }
  };

  const finishGame = async (gameId) => {
    if (!firestoreService) return;
    try {
      const gameData = await firestoreService.finishGame(gameId);

      // 선수 히스토리 업데이트
      const allPlayers = [
        ...(gameData.teamA?.lineup || []),
        ...(gameData.teamB?.lineup || [])
      ];

      for (const player of allPlayers) {
        if (player.id && player.stats) {
          await firestoreService.updatePlayerHistory(player.id, {
            gameId,
            date: new Date().toISOString(),
            stats: player.stats
          });
        }
      }

      return gameData;
    } catch (error) {
      console.error('경기 종료 실패:', error);
      throw error;
    }
  };

  // 설정 업데이트
  const updateSettings = async (newSettings) => {
    if (!firestoreService) return;
    try {
      await firestoreService.updateSettings(newSettings);
      setSettings(newSettings);
    } catch (error) {
      console.error('설정 업데이트 실패:', error);
      throw error;
    }
  };

  const value = {
    user,
    firestoreService,
    teams,
    setTeams,
    games,
    setGames,
    finishedGames,
    setFinishedGames,
    playerBadges,
    setPlayerBadges,
    playerHistory,
    setPlayerHistory,
    playerRegistry,
    setPlayerRegistry,
    settings,
    setSettings,
    saveStatus,
    isLoading,
    getOrCreatePlayer,
    createTeam,
    updateTeam,
    deleteTeam,
    createGame,
    updateGame,
    finishGame,
    updateSettings
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">⚾</div>
          <div className="text-white text-2xl font-bold">데이터 로딩 중...</div>
        </div>
      </div>
    );
  }

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};
```

---

## 🎨 Phase 4: 핵심 컴포넌트 마이그레이션 (2시간)

### 4.1 복사할 핵심 파일 목록

기존 프로젝트에서 다음 파일들을 복사:

```bash
# Utils (유틸리티 함수)
src/utils/badgeSystem.js
src/utils/badgeHelpers.js
src/utils/badgeProgress.js
src/utils/playerIdGenerator.js

# Components (UI 컴포넌트)
src/components/BadgeManagementModal.jsx
src/components/BadgeProgressIndicator.jsx
src/components/CreateGameModal.jsx
src/components/LineupModal.jsx
src/components/ClassCard.jsx
src/components/BadgeSelector.jsx
src/components/TeamCard.jsx
src/components/PlayerBadgeOrderModal.jsx
src/components/TeamBadgeCard.jsx
src/components/BadgeCreator.jsx
src/components/AllBadgesModal.jsx
```

### 4.2 LiveGame 컴포넌트 수정 (Firebase 연동)

**`src/components/LiveGame.jsx`** (기존 파일 기반, Firebase 연동 추가):

```javascript
// 주요 수정 사항:
// 1. onUpdate 대신 firestoreService.updateGame 사용
// 2. 실시간 리스너로 게임 상태 동기화
// 3. 배지/히스토리 업데이트를 Firestore에 저장

import { useState, useEffect, useRef } from 'react';
import { useGame } from '../contexts/GameContext';
// ... 나머지 import

const LiveGame = ({ gameId }) => {
  const { firestoreService, games } = useGame();
  const [game, setGame] = useState(null);

  // 실시간 게임 데이터 리스너
  useEffect(() => {
    if (!firestoreService || !gameId) return;

    const unsubscribe = firestoreService.subscribeToGame(gameId, (gameData) => {
      setGame(gameData);
    });

    return () => unsubscribe();
  }, [firestoreService, gameId]);

  // 경기 업데이트 함수
  const updateGameData = async (updatedGame) => {
    try {
      await firestoreService.updateGame(gameId, updatedGame);
      // 상태는 실시간 리스너가 자동으로 업데이트
    } catch (error) {
      console.error('경기 업데이트 실패:', error);
      alert('경기 업데이트에 실패했습니다.');
    }
  };

  // 선수 스탯 업데이트 (배지 체크 포함)
  const updatePlayerStat = async (isTeamA, playerIndex, stat, delta) => {
    if (!game) return;

    const newGame = { ...game };
    const team = isTeamA ? newGame.teamA : newGame.teamB;
    const player = team.lineup[playerIndex];

    if (!player.stats) {
      player.stats = { hits: 0, runs: 0, goodDefense: 0, bonusCookie: 0 };
    }

    const oldValue = player.stats[stat] || 0;
    const newValue = Math.max(0, oldValue + delta);
    player.stats[stat] = newValue;

    // 배지 체크 및 업데이트
    if (delta > 0 && player.id) {
      const totalStats = calculatePlayerTotalStatsRealtime(player);
      const currentBadges = await firestoreService.getPlayerBadges(player.id);
      const newBadges = checkNewBadges(totalStats, currentBadges);

      if (newBadges.length > 0) {
        const updatedBadges = [...currentBadges, ...newBadges.map(b => b.id)];
        await firestoreService.updatePlayerBadges(player.id, updatedBadges);
        showBadgePopup(player.name, newBadges);
      }
    }

    await updateGameData(newGame);
  };

  // 경기 종료
  const handleFinishGame = async () => {
    if (!confirm('경기를 종료하시겠습니까?')) return;

    try {
      await firestoreService.finishGame(gameId);
      alert('경기가 종료되었습니다!');
      // 경기 목록 페이지로 이동
    } catch (error) {
      console.error('경기 종료 실패:', error);
      alert('경기 종료에 실패했습니다.');
    }
  };

  // ... 나머지 기존 코드 유지

  return (
    // ... 기존 JSX 유지
  );
};

export default LiveGame;
```

### 4.3 App.jsx 수정 (라우팅 및 인증)

**`src/App.jsx`**:
```javascript
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { GameProvider } from './contexts/GameContext';
import LoginPage from './components/auth/LoginPage';
import MainApp from './components/MainApp';
import './index.css';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">⚾</div>
          <div className="text-white text-2xl font-bold">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  return (
    <GameProvider>
      <MainApp />
    </GameProvider>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
```

---

## 🚀 Phase 5: Vercel 배포 설정 (30분)

### 5.1 Vercel 프로젝트 설정

#### GitHub 연동 방식 (추천)

1. **GitHub Repository 생성**
```bash
cd /Users/iwongeun/Desktop/필드형게임\ 마스터\ 보드/baseball-firebase

git init
git add .
git commit -m "Initial commit: Firebase 풀스택 프로젝트"

# GitHub에서 새 repository 생성 후
git remote add origin https://github.com/YOUR_USERNAME/baseball-firebase.git
git branch -M main
git push -u origin main
```

2. **Vercel 배포**
   - https://vercel.com 접속
   - "Import Project" 클릭
   - GitHub repository 선택
   - Framework Preset: **Vite** 자동 감지
   - Environment Variables 설정:
     ```
     VITE_FIREBASE_API_KEY=
     VITE_FIREBASE_AUTH_DOMAIN=
     VITE_FIREBASE_PROJECT_ID=
     VITE_FIREBASE_STORAGE_BUCKET=
     VITE_FIREBASE_MESSAGING_SENDER_ID=
     VITE_FIREBASE_APP_ID=
     ```
   - Deploy 클릭

3. **배포 URL 확인**
   - 배포 완료 후 `https://your-project.vercel.app` URL 발급
   - Firebase Console → Authentication → Settings → Authorized domains에 추가

#### CLI 방식 (대안)

```bash
# Vercel CLI 설치
npm i -g vercel

# 로그인
vercel login

# 배포
vercel

# 프로덕션 배포
vercel --prod
```

### 5.2 vercel.json 설정

**`vercel.json`**:
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ],
  "headers": [
    {
      "source": "/assets/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

### 5.3 .gitignore 업데이트

```gitignore
# dependencies
node_modules/

# production
dist/
build/

# environment variables
.env
.env.local
.env.production.local

# Vercel
.vercel

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
```

---

## 📱 Phase 6: PWA 설정 (선택사항, 30분)

### 6.1 PWA 플러그인 설치

```bash
npm install -D vite-plugin-pwa
```

### 6.2 vite.config.js 수정

**`vite.config.js`**:
```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: '필드형 게임 마스터 보드',
        short_name: '야구 스코어보드',
        description: '교사용 야구 경기 기록 및 관리 시스템',
        theme_color: '#3b82f6',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ]
});
```

---

## 🧪 Phase 7: 테스트 및 최적화 (1시간)

### 7.1 기능 테스트 체크리스트

- [ ] Google 로그인/로그아웃
- [ ] 팀 생성/수정/삭제
- [ ] 경기 생성 및 시작
- [ ] 실시간 스코어 업데이트
- [ ] 선수 기록 입력
- [ ] 배지 획득 시스템
- [ ] 경기 종료 및 히스토리 저장
- [ ] 다중 기기 동기화
- [ ] 오프라인 모드 (Firestore 캐시)

### 7.2 성능 최적화

1. **Firestore 쿼리 최적화**
   - 인덱스 생성 (복합 쿼리용)
   - 페이지네이션 적용 (많은 데이터)

2. **번들 크기 최적화**
```bash
npm run build
# dist 폴더 크기 확인
npx vite-bundle-visualizer
```

3. **Firebase 비용 최적화**
   - 불필요한 실시간 리스너 제거
   - 배치 작업 활용

### 7.3 보안 강화

**Firestore 보안 규칙 (프로덕션용)**:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 인증 확인 함수
    function isSignedIn() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // 사용자 데이터
    match /users/{userId} {
      allow read, write: if isOwner(userId);

      // 하위 컬렉션도 동일한 규칙 적용
      match /{document=**} {
        allow read, write: if isOwner(userId);
      }
    }
  }
}
```

---

## 📊 Phase 8: 모니터링 및 유지보수 (진행 중)

### 8.1 Firebase 사용량 모니터링

- Firebase Console → Usage 확인
- Firestore 읽기/쓰기 횟수 모니터링
- Authentication 사용자 수 확인

### 8.2 에러 로깅

**Sentry 설치 (선택사항)**:
```bash
npm install @sentry/react @sentry/vite-plugin
```

### 8.3 백업 전략

1. **Firestore 자동 백업** (Firebase 콘솔에서 설정)
2. **수동 내보내기** 기능 유지 (JSON 다운로드)

---

## 🎯 마일스톤 및 타임라인

| Phase | 작업 내용 | 예상 시간 | 우선순위 |
|-------|----------|---------|---------|
| 1 | 프로젝트 초기 설정 | 30분 | 🔴 필수 |
| 2 | Firebase & Google OAuth | 1시간 | 🔴 필수 |
| 3 | Firestore 서비스 레이어 | 1.5시간 | 🔴 필수 |
| 4 | 컴포넌트 마이그레이션 | 2시간 | 🔴 필수 |
| 5 | Vercel 배포 | 30분 | 🔴 필수 |
| 6 | PWA 설정 | 30분 | 🟡 선택 |
| 7 | 테스트 및 최적화 | 1시간 | 🟢 권장 |
| 8 | 모니터링 설정 | 30분 | 🟢 권장 |

**총 예상 시간**: 7-8시간 (선택 사항 제외 시 6시간)

---

## 🔄 마이그레이션 전략

### localStorage → Firestore 마이그레이션

기존 localStorage 데이터를 Firestore로 이동하려면:

**`src/utils/migrateLocalStorage.js`**:
```javascript
export async function migrateLocalStorageToFirestore(firestoreService) {
  const localData = localStorage.getItem('baseballAppData');
  if (!localData) return;

  try {
    const data = JSON.parse(localData);

    // 팀 마이그레이션
    for (const team of data.teams || []) {
      await firestoreService.createTeam(team);
    }

    // 설정 마이그레이션
    if (data.settings) {
      await firestoreService.updateSettings(data.settings);
    }

    // 배지 마이그레이션
    for (const [playerId, badges] of Object.entries(data.playerBadges || {})) {
      await firestoreService.updatePlayerBadges(playerId, badges);
    }

    console.log('✅ 마이그레이션 완료');

    // 백업 후 삭제
    localStorage.setItem('baseballAppData_backup', localData);
    localStorage.removeItem('baseballAppData');
  } catch (error) {
    console.error('❌ 마이그레이션 실패:', error);
  }
}
```

---

## 📚 참고 문서

- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Firestore 보안 규칙](https://firebase.google.com/docs/firestore/security/get-started)
- [Vercel 배포 가이드](https://vercel.com/docs)
- [Vite 환경 변수](https://vitejs.dev/guide/env-and-mode.html)

---

## ✅ 다음 단계

1. Firebase 프로젝트 생성
2. `.env.local` 파일 설정
3. Phase 1부터 순차적으로 진행
4. 각 Phase 완료 후 Git 커밋
5. Vercel 배포 및 테스트

**준비되셨으면 Phase 1부터 시작하겠습니다!** 🚀
