# 필드형 게임 마스터 보드 - Firebase 풀스택 버전

> 교사용 야구 스코어보드 & 기록 관리 시스템 (Google OAuth + Firebase + Vercel)

[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org/)
[![Vercel](https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white)](https://vercel.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

---

## 🎯 프로젝트 현황

### ✅ 현재 완료된 작업 (Phase 1-3)

**Phase 1: 프로젝트 초기 설정** ✅
- [x] Vite + React 프로젝트 생성
- [x] 필수 패키지 설치 (Firebase, DnD Kit, Chart.js, Tailwind)
- [x] Tailwind CSS 설정
- [x] 유틸리티 함수 복사 (배지 시스템, ID 생성기 등)
- [x] 환경 변수 템플릿 (.env.example)

**Phase 2: Firebase 설정 및 Google OAuth** ✅
- [x] Firebase 프로젝트 생성 (`baseball-firebase-d4d8d`)
- [x] Google OAuth 인증 구현
- [x] 로그인 페이지 UI 완성
- [x] AuthContext 및 AuthService 구현
- [x] 오프라인 지속성 활성화

**Phase 3: Firestore 데이터베이스** ✅
- [x] Firestore Database 생성 (Seoul 리전)
- [x] 하이브리드 보안 규칙 설계
- [x] Permission 서비스 레이어 구현

### 🚧 다음 작업 (Phase 4)

**Phase 4: 서비스 레이어 및 컴포넌트 통합** ⏸️
- [ ] FirestoreService 구현 (팀/경기/배지 CRUD)
- [ ] GameContext 작성
- [ ] 기존 컴포넌트 마이그레이션 (LiveGame, CreateGameModal 등)
- [ ] Permission UI (하이브리드 보안 선택 시)

**Phase 5: Vercel 배포** ⬜
**Phase 6: PWA 설정** ⬜ (선택사항)
**Phase 7: 테스트 및 최적화** ⬜
**Phase 8: 모니터링** ⬜

**전체 진행률**: 약 40% 완료

---

## 📊 현재 작동 중인 기능

### ✨ 구현 완료
- ✅ **Google 로그인/로그아웃** - 교사용 구글 계정으로 인증
- ✅ **로딩 화면** - 인증 상태 확인 중 로딩 표시
- ✅ **에러 처리** - 한글 에러 메시지 표시
- ✅ **오프라인 지속성** - IndexedDB를 통한 캐시
- ✅ **권한 요청 시스템** - 교사 간 데이터 공유 준비 완료

### 🚧 개발 중
- ⏳ Firestore CRUD 기능 (팀/경기 관리)
- ⏳ 실시간 스코어보드
- ⏳ 배지 시스템 Firebase 연동

---

## 🚀 빠른 시작

### 1️⃣ 저장소 클론 및 의존성 설치

```bash
cd /Users/iwongeun/Desktop/필드형게임\ 마스터\ 보드/baseball-firebase
npm install
```

### 2️⃣ 환경 변수 설정

`.env.local` 파일이 이미 설정되어 있습니다:
```
VITE_FIREBASE_API_KEY=AIzaSyD...
VITE_FIREBASE_AUTH_DOMAIN=baseball-firebase-d4d8d.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=baseball-firebase-d4d8d
```

### 3️⃣ 개발 서버 실행

```bash
npm run dev
```

서버가 `http://localhost:5174`에서 실행됩니다.

### 4️⃣ Google 로그인 테스트

브라우저에서 로그인 페이지가 나타나면 Google 계정으로 로그인하세요.

---

## 🗂️ 프로젝트 구조

```
baseball-firebase/
├── src/
│   ├── components/          # React 컴포넌트
│   │   ├── auth/           # 인증 관련 컴포넌트
│   │   │   └── LoginPage.jsx  ✅ Google 로그인 UI
│   │   └── MainApp.jsx     ✅ 로그인 후 메인 앱
│   │
│   ├── contexts/           # React Context
│   │   └── AuthContext.jsx  ✅ 인증 상태 관리
│   │
│   ├── services/           # Firebase 서비스 레이어
│   │   ├── authService.js   ✅ Google OAuth 로직
│   │   └── permissionService.js  ✅ 권한 요청 시스템
│   │
│   ├── config/             # 설정 파일
│   │   └── firebase.js      ✅ Firebase 초기화
│   │
│   ├── utils/              # 유틸리티 함수
│   │   ├── badgeSystem.js   ✅ 배지 시스템
│   │   ├── badgeHelpers.js  ✅ 배지 헬퍼
│   │   ├── playerIdGenerator.js  ✅ 선수 ID 생성
│   │   ├── pointSystem.js   ✅ 포인트 시스템
│   │   └── badgeCategories.js  ✅ 배지 카테고리
│   │
│   └── App.jsx             ✅ 루트 컴포넌트
│
├── public/                 # 정적 파일
├── .env.local             ✅ Firebase 환경 변수 (Git 제외)
├── .env.example           ✅ 환경 변수 템플릿
├── firestore.rules        ✅ 하이브리드 보안 규칙
├── vercel.json            ✅ Vercel 배포 설정
├── PRD_FIREBASE_FULLSTACK.md  ✅ 상세 개발 계획 (8 Phase)
├── DEVELOPMENT_STATUS.md  ✅ 개발 현황 체크리스트
└── README.md              ✅ 이 문서
```

---

## 🔥 핵심 기능

### 현재 구현된 기능
- **Google OAuth 로그인** - `signInWithPopup` 방식
- **인증 상태 관리** - AuthContext를 통한 전역 상태
- **오프라인 지속성** - Firestore IndexedDB 캐시
- **로딩 및 에러 처리** - 사용자 친화적인 UI
- **권한 요청 시스템** - 교사 간 데이터 공유 준비

### 향후 구현 예정
- **팀 관리** - 팀 생성/수정/삭제
- **경기 생성** - 두 팀 선택 및 이닝 설정
- **실시간 스코어보드** - 점수, 아웃, 주자 실시간 업데이트
- **선수 기록** - 안타, 득점, 수비 기록
- **배지 시스템** - 실시간 배지 획득 및 표시
- **경기 히스토리** - 종료된 경기 기록 저장
- **다중 기기 동기화** - 여러 기기에서 동일한 데이터 접근

---

## 📖 상세 문서

### 주요 문서
- **[PRD_FIREBASE_FULLSTACK.md](PRD_FIREBASE_FULLSTACK.md)** - 전체 개발 계획 (8 Phase)
- **[DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md)** - 상세 진행 현황 및 체크리스트
- **[firestore.rules](firestore.rules)** - 하이브리드 보안 규칙

### 핵심 파일
- **[src/config/firebase.js](src/config/firebase.js)** - Firebase 초기화 및 설정
- **[src/services/authService.js](src/services/authService.js)** - Google OAuth 로직
- **[src/contexts/AuthContext.jsx](src/contexts/AuthContext.jsx)** - 인증 상태 관리
- **[src/components/auth/LoginPage.jsx](src/components/auth/LoginPage.jsx)** - 로그인 UI

---

## 🛠️ 기술 스택

### Frontend
- **React 18** - UI 라이브러리
- **Vite** - 빌드 도구
- **Tailwind CSS** - 스타일링
- **@dnd-kit** - 드래그 앤 드롭 (라인업 관리)
- **Chart.js** - 통계 차트 (향후 구현)

### Backend
- **Firebase Authentication** - Google OAuth
- **Firestore Database** - NoSQL 데이터베이스 (Seoul 리전)
- **Firebase Hosting** - 선택사항

### Deployment
- **Vercel** - 메인 배포 플랫폼
- **GitHub** - 소스 관리

---

## ⚙️ 개발 명령어

```bash
# 개발 서버 시작 (localhost:5174)
npm run dev

# 프로덕션 빌드
npm run build

# 빌드 결과 미리보기
npm run preview

# ESLint 검사
npm run lint

# Vercel CLI 배포 (설치 필요: npm i -g vercel)
vercel
vercel --prod
```

---

## 🔒 보안 규칙 (Firestore)

### 하이브리드 권한 모델 설계 완료

**기본 원칙**:
- 각 교사는 자신의 데이터만 접근 가능
- 다른 교사에게 권한 요청 가능
- 데이터 소유자가 권한 승인/거부 결정
- 읽기 전용 또는 읽기/쓰기 권한 세분화

**데이터 구조**:
```
users/{userId}/
  ├── profile/              (소유자만 쓰기, 모든 로그인 사용자 읽기)
  ├── teams/                (소유자 + 공유 권한자)
  ├── games/                (소유자 + 공유 권한자)
  ├── sharedWith/           (공유 대상 목록)
  └── settings/             (소유자만)

permissions/                 (권한 요청 관리)
```

**보안 규칙 파일**: [firestore.rules](firestore.rules)

---

## 📊 Firestore 데이터 구조

```javascript
users/{userId}/teams/{teamId}
{
  id: "team123",
  name: "6학년 1반",
  players: [
    { id: "p1", name: "김철수", number: 1 }
  ],
  createdAt: timestamp,
  updatedAt: timestamp
}

users/{userId}/games/{gameId}
{
  id: "game456",
  status: "live" | "finished",
  teamA: { name: "...", lineup: [...] },
  teamB: { name: "...", lineup: [...] },
  scoreboard: { ... },
  currentInning: 1,
  isTopInning: true,
  strikes: 0,
  balls: 0,
  outs: 0,
  bases: { first: null, second: null, third: null },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## 🎯 다음 단계

### 1️⃣ **즉시 결정 필요** ⚠️
**보안 규칙 적용 여부 결정**
- **옵션 A**: 간단한 보안 (자신의 데이터만 접근)
- **옵션 B**: 하이브리드 보안 (권한 요청/승인 시스템)

현재 테스트 모드는 30일 후 만료됩니다.

### 2️⃣ **FirestoreService 구현** (1시간)
- 팀/경기 CRUD 함수
- 실시간 리스너
- 배지 및 히스토리 관리

### 3️⃣ **GameContext 작성** (30분)
- Firestore와 React 연결
- 전역 상태 관리

### 4️⃣ **컴포넌트 마이그레이션** (2시간)
- LiveGame, CreateGameModal, TeamCard 등
- localStorage → Firestore 전환

### 5️⃣ **Vercel 배포** (30분)
- GitHub 연동
- 환경 변수 설정

---

## 📌 중요 참고사항

### 환경 변수 관리
- `.env.local` 파일은 **절대 Git에 커밋하지 않기**
- 배포 시 Vercel Dashboard에서 환경 변수 입력 필수

### Firestore 비용
- **무료 할당량**: 읽기 50K, 쓰기 20K, 삭제 20K (일일)
- 실시간 리스너는 읽기로 계산됨
- 최적화를 위해 불필요한 리스너 제거 필요

### Firebase 인증
- 승인된 도메인에 localhost, vercel.app 추가 필요
- Google OAuth는 팝업 방식 사용 (팝업 차단 해제 필요)

---

## 🔗 참고 링크

- [Firebase Console](https://console.firebase.google.com/project/baseball-firebase-d4d8d)
- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Firestore 보안 규칙 가이드](https://firebase.google.com/docs/firestore/security/get-started)
- [Vercel 배포 문서](https://vercel.com/docs)
- [React 공식 문서](https://react.dev/)

---

## 👨‍💻 개발자

**프로젝트 관리**: 이원근 (초등교사)
**AI 어시스턴트**: Claude Code
**개발 시작일**: 2025-10-21

---

## 📄 라이선스

이 프로젝트는 교육 목적으로 제작되었습니다.

---

## 🆘 문제 해결

### Google 로그인 실패
- 팝업 차단 확인
- Firebase Console → Authentication → 승인된 도메인 확인

### Firestore 연결 실패
- `.env.local` 파일 확인
- Firebase 프로젝트 설정 확인

### 개발 서버 실행 안됨
- `npm install` 재실행
- Node.js 버전 확인 (18 이상 권장)

---

🚀 **현재 상태**: Phase 3 완료, Phase 4 진행 대기

자세한 진행 상황은 [DEVELOPMENT_STATUS.md](DEVELOPMENT_STATUS.md)를 참고하세요.
