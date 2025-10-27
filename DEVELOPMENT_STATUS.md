# 개발 현황 - Firebase 풀스택 마이그레이션

> **최종 업데이트**: 2025-10-21
> **프로젝트**: 필드형 게임 마스터 보드 (Firebase 백엔드 연동)
> **현재 진행률**: Phase 3 완료, Phase 4 진행 중 (약 40%)

---

## 📊 전체 진행 상황

```
Phase 1: ✅ 완료 (프로젝트 초기 설정)
Phase 2: ✅ 완료 (Google OAuth 로그인)
Phase 3: ✅ 완료 (Firestore Database 생성)
Phase 4: ⏸️  진행 중 (보안 규칙 결정 대기)
Phase 5: ⬜ 대기 (Vercel 배포)
Phase 6: ⬜ 대기 (PWA 설정)
Phase 7: ⬜ 대기 (테스트 및 최적화)
Phase 8: ⬜ 대기 (모니터링 설정)
```

**핵심 마일스톤**:
- ✅ Firebase 프로젝트 생성 완료
- ✅ Google OAuth 인증 작동
- ✅ Firestore Database 생성 (Seoul 리전, Standard 요금제)
- ⏸️ **현재 작업**: 보안 규칙 적용 여부 결정
- 🎯 **다음 목표**: Firestore 서비스 레이어 구현 및 UI 컴포넌트 통합

---

## 🏗️ Phase 1: 프로젝트 초기 설정 ✅

### ✅ 1.1 개발 환경 구축
- [x] Vite + React 프로젝트 생성
- [x] 프로젝트 폴더 생성: `baseball-firebase`
- [x] package.json 초기화

### ✅ 1.2 필수 패키지 설치
- [x] `firebase` - Firebase SDK
- [x] `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` - 드래그 앤 드롭
- [x] `chart.js`, `react-chartjs-2` - 차트 시각화
- [x] `tailwindcss`, `postcss`, `autoprefixer` - 스타일링

**설치된 패키지 상태**:
```bash
npm install firebase ✅
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities chart.js react-chartjs-2 ✅
npm install -D tailwindcss postcss autoprefixer ✅
```

### ✅ 1.3 환경 변수 설정
- [x] `.env.local` 파일 생성
- [x] Firebase 설정 정보 저장
- [x] `.gitignore`에 `.env.local` 추가

**파일 위치**: `.env.local`
```
VITE_FIREBASE_API_KEY=AIzaSyD...
VITE_FIREBASE_AUTH_DOMAIN=baseball-firebase-d4d8d.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=baseball-firebase-d4d8d
...
```

### ✅ 1.4 기존 유틸리티 파일 복사
- [x] `src/utils/badgeSystem.js` - 배지 시스템
- [x] `src/utils/badgeHelpers.js` - 배지 헬퍼 함수
- [x] `src/utils/badgeProgress.js` - 배지 진행도
- [x] `src/utils/playerIdGenerator.js` - 선수 ID 생성
- [x] `src/utils/pointSystem.js` - 포인트 시스템
- [x] `src/utils/badgeCategories.js` - 배지 카테고리

---

## 🔥 Phase 2: Firebase 설정 및 Google OAuth ✅

### ✅ 2.1 Firebase 프로젝트 생성
- [x] Firebase Console에서 프로젝트 생성
- [x] 프로젝트 ID: `baseball-firebase-d4d8d`
- [x] Google Analytics: 활성화
- [x] 웹 앱 등록 완료

### ✅ 2.2 Authentication 설정
- [x] Authentication 활성화
- [x] Google 로그인 제공업체 활성화
- [x] 승인된 도메인 설정: `localhost`
- [x] Google OAuth 설정 완료

### ✅ 2.3 Firebase 설정 파일 작성
- [x] `src/config/firebase.js` 작성
- [x] Firebase 초기화 코드 작성
- [x] 오프라인 지속성 활성화 (IndexedDB)
- [x] Google Provider 설정 (`prompt: 'select_account'`)

**파일 위치**: [src/config/firebase.js](src/config/firebase.js)

### ✅ 2.4 인증 서비스 레이어
- [x] `src/services/authService.js` 작성
- [x] Google 로그인 함수 구현 (`signInWithGoogle`)
- [x] 로그아웃 함수 구현 (`signOut`)
- [x] 인증 상태 리스너 구현
- [x] 한글 에러 메시지 처리

**파일 위치**: [src/services/authService.js](src/services/authService.js)

### ✅ 2.5 인증 Context
- [x] `src/contexts/AuthContext.jsx` 작성
- [x] 전역 인증 상태 관리
- [x] `useAuth` Hook 제공
- [x] 로딩 상태 및 에러 처리

**파일 위치**: [src/contexts/AuthContext.jsx](src/contexts/AuthContext.jsx)

### ✅ 2.6 로그인 컴포넌트
- [x] `src/components/auth/LoginPage.jsx` 작성
- [x] Google 로그인 버튼 UI
- [x] 로딩 애니메이션
- [x] 에러 메시지 표시
- [x] 안내 메시지 및 이용약관

**파일 위치**: [src/components/auth/LoginPage.jsx](src/components/auth/LoginPage.jsx)

### ✅ 2.7 메인 앱 컴포넌트
- [x] `src/components/MainApp.jsx` 작성
- [x] 로그인 후 메인 화면 구성
- [x] 사용자 정보 표시
- [x] 로그아웃 버튼

**파일 위치**: [src/components/MainApp.jsx](src/components/MainApp.jsx)

### ✅ 2.8 App.jsx 수정
- [x] AuthProvider로 앱 래핑
- [x] 로그인 상태에 따른 라우팅
- [x] 로딩 화면 구현

**파일 위치**: [src/App.jsx](src/App.jsx)

**테스트 결과**: ✅ Google 로그인 성공 확인

---

## 🗄️ Phase 3: Firestore 데이터베이스 설정 ✅

### ✅ 3.1 Firestore Database 생성
- [x] Firebase Console → Firestore Database
- [x] 데이터베이스 만들기 클릭
- [x] **요금제 선택**: Standard (종량제)
- [x] **리전 선택**: asia-northeast3 (Seoul)
- [x] **보안 모드**: 테스트 모드로 시작 (30일 제한)

**데이터베이스 상태**: ✅ 생성 완료

### ✅ 3.2 보안 규칙 설계
- [x] **하이브리드 권한 모델** 설계 완료
- [x] `firestore.rules` 파일 작성
- [x] Helper 함수 정의:
  - `isSignedIn()` - 로그인 여부 확인
  - `isOwner(userId)` - 데이터 소유자 확인
  - `hasSharedAccess(ownerId)` - 공유 권한 확인
  - `canRead(ownerId)` - 읽기 권한 확인
  - `canWrite(ownerId)` - 쓰기 권한 확인

**파일 위치**: [firestore.rules](firestore.rules)

**보안 규칙 구조**:
```
users/{userId}/
  ├── profile/              (소유자만 쓰기, 모든 로그인 사용자 읽기)
  ├── teams/                (소유자 + 공유 권한자 읽기, 쓰기 권한 따로 관리)
  ├── games/                (소유자 + 공유 권한자 읽기/쓰기)
  ├── finishedGames/        (소유자 + 공유 권한자 읽기)
  ├── playerBadges/         (소유자 + 공유 권한자 읽기/쓰기)
  ├── playerHistory/        (소유자 + 공유 권한자 읽기)
  ├── sharedWith/           (공유 대상자 목록)
  └── settings/             (소유자만 읽기/쓰기)

permissions/                 (권한 요청 관리)
```

### ⏸️ 3.3 보안 규칙 적용 (현재 대기 중)
- [ ] Firebase Console → Firestore → Rules 탭
- [ ] `firestore.rules` 내용 복사
- [ ] "게시" 버튼 클릭

**❗중요 결정 필요**:
- 현재 테스트 모드 (30일 후 만료)
- 하이브리드 보안 규칙을 지금 적용할지 여부 결정 필요

### ✅ 3.4 Permission 서비스 레이어
- [x] `src/services/permissionService.js` 작성
- [x] 권한 요청 기능 (`requestPermission`)
- [x] 권한 승인 기능 (`approvePermission`)
- [x] 권한 거부 기능 (`rejectPermission`)
- [x] 권한 취소 기능 (`revokePermission`)
- [x] 요청 목록 조회 (`getIncomingRequests`)
- [x] 공유 목록 조회 (`getSharedWithList`)

**파일 위치**: [src/services/permissionService.js](src/services/permissionService.js)

**데이터 구조**:
```javascript
// permissions 컬렉션
{
  permissionId: {
    requesterId: "user123",        // 요청자 UID
    requesterEmail: "teacher@school.com",
    ownerId: "user456",            // 데이터 소유자 UID
    accessLevel: "read" | "write", // 권한 레벨
    status: "pending" | "approved" | "rejected",
    requestedAt: timestamp,
    respondedAt: timestamp
  }
}

// users/{userId}/sharedWith/{grantedUserId}
{
  userId: "user123",
  email: "teacher@school.com",
  displayName: "김교사",
  canWrite: true,
  grantedAt: timestamp
}
```

---

## 🎨 Phase 4: 서비스 레이어 및 컴포넌트 통합 ⏸️

### ⬜ 4.1 Firestore 서비스 레이어 구현
- [ ] `src/services/firestoreService.js` 작성
- [ ] 사용자 프로필 관리 (CRUD)
- [ ] 팀 관리 (CRUD)
- [ ] 경기 관리 (CRUD)
- [ ] 선수 배지 관리
- [ ] 선수 히스토리 관리
- [ ] 설정 관리
- [ ] 실시간 리스너 구현
- [ ] 일괄 작업 (Batch) 구현

**예상 소요 시간**: 1시간

**주요 기능**:
- `createTeam(teamData)` - 팀 생성
- `getTeams()` - 팀 목록 조회
- `updateTeam(teamId, teamData)` - 팀 수정
- `deleteTeam(teamId)` - 팀 삭제
- `subscribeToTeams(callback)` - 실시간 팀 목록 동기화
- `createGame(gameData)` - 경기 생성
- `updateGame(gameId, gameData)` - 경기 업데이트
- `finishGame(gameId)` - 경기 종료 및 히스토리 저장
- `subscribeToGame(gameId, callback)` - 실시간 경기 동기화

**참고 파일**: [PRD_FIREBASE_FULLSTACK.md](PRD_FIREBASE_FULLSTACK.md) Phase 3.2

### ⬜ 4.2 Game Context 작성
- [ ] `src/contexts/GameContext.jsx` 작성
- [ ] FirestoreService 인스턴스 생성
- [ ] 전역 상태 관리 (teams, games, playerBadges 등)
- [ ] 실시간 리스너 연결
- [ ] 초기 데이터 로드
- [ ] 오프라인/온라인 전환 처리

**예상 소요 시간**: 30분

**제공할 Context 값**:
- `teams`, `setTeams` - 팀 목록
- `games`, `setGames` - 진행 중 경기
- `finishedGames` - 종료된 경기
- `playerBadges` - 선수 배지
- `playerHistory` - 선수 히스토리
- `createTeam`, `updateTeam`, `deleteTeam` - 팀 관리 함수
- `createGame`, `updateGame`, `finishGame` - 경기 관리 함수
- `saveStatus` - 저장 상태 표시 (저장 중/저장됨/오류)

### ⬜ 4.3 기존 컴포넌트 복사 및 수정
- [ ] `src/components/CreateGameModal.jsx` 복사 및 Firebase 연동
- [ ] `src/components/TeamCard.jsx` 복사 및 Firebase 연동
- [ ] `src/components/LineupModal.jsx` 복사
- [ ] `src/components/BadgeManagementModal.jsx` 복사 및 Firebase 연동
- [ ] `src/components/BadgeProgressIndicator.jsx` 복사
- [ ] `src/components/ClassCard.jsx` 복사
- [ ] `src/components/BadgeSelector.jsx` 복사
- [ ] `src/components/PlayerBadgeOrderModal.jsx` 복사
- [ ] `src/components/TeamBadgeCard.jsx` 복사
- [ ] `src/components/BadgeCreator.jsx` 복사
- [ ] `src/components/AllBadgesModal.jsx` 복사

**예상 소요 시간**: 1.5시간

**수정 포인트**:
- localStorage 코드 제거
- `useGame` Hook 사용
- Firestore 서비스 함수 호출
- 실시간 업데이트 처리

### ⬜ 4.4 LiveGame 컴포넌트 수정
- [ ] `src/components/LiveGame.jsx` 작성
- [ ] 실시간 게임 데이터 리스너 연결
- [ ] 스코어 업데이트 시 Firestore 동기화
- [ ] 선수 스탯 업데이트
- [ ] 배지 획득 체크 및 저장
- [ ] 경기 종료 처리

**예상 소요 시간**: 1시간

**핵심 기능**:
- `subscribeToGame(gameId, callback)` - 실시간 경기 동기화
- `updatePlayerStat(isTeamA, playerIndex, stat, delta)` - 선수 스탯 업데이트
- `handleFinishGame()` - 경기 종료 및 히스토리 저장

### ⬜ 4.5 Permission UI 컴포넌트 (하이브리드 보안 선택 시)
- [ ] `src/components/PermissionRequestModal.jsx` 작성
- [ ] 권한 요청 UI
- [ ] 받은 요청 목록 표시
- [ ] 권한 승인/거부 버튼
- [ ] 공유 중인 사용자 목록
- [ ] 권한 취소 기능

**예상 소요 시간**: 30분 (하이브리드 보안 선택 시)

---

## 🚀 Phase 5: Vercel 배포 ⬜

### ⬜ 5.1 GitHub Repository 설정
- [ ] Git 저장소 초기화
- [ ] GitHub에 새 Repository 생성
- [ ] Remote 추가 및 Push
- [ ] `.gitignore` 확인 (.env.local 제외 확인)

**예상 소요 시간**: 10분

```bash
git init
git add .
git commit -m "Initial commit: Firebase 풀스택 프로젝트"
git remote add origin https://github.com/YOUR_USERNAME/baseball-firebase.git
git push -u origin main
```

### ⬜ 5.2 Vercel 프로젝트 연결
- [ ] Vercel 사이트 접속 (https://vercel.com)
- [ ] "Import Project" 클릭
- [ ] GitHub Repository 선택
- [ ] Framework: Vite 자동 감지 확인

**예상 소요 시간**: 5분

### ⬜ 5.3 환경 변수 설정
- [ ] Vercel Dashboard → Settings → Environment Variables
- [ ] `.env.local`의 모든 변수 입력:
  - `VITE_FIREBASE_API_KEY`
  - `VITE_FIREBASE_AUTH_DOMAIN`
  - `VITE_FIREBASE_PROJECT_ID`
  - `VITE_FIREBASE_STORAGE_BUCKET`
  - `VITE_FIREBASE_MESSAGING_SENDER_ID`
  - `VITE_FIREBASE_APP_ID`
  - `VITE_FIREBASE_MEASUREMENT_ID`

**예상 소요 시간**: 5분

### ⬜ 5.4 Firebase 승인 도메인 추가
- [ ] Vercel 배포 URL 확인 (예: `https://baseball-firebase.vercel.app`)
- [ ] Firebase Console → Authentication → Settings → Authorized domains
- [ ] Vercel 도메인 추가

**예상 소요 시간**: 5분

### ⬜ 5.5 배포 테스트
- [ ] 배포 URL 접속
- [ ] Google 로그인 테스트
- [ ] 팀 생성 테스트
- [ ] 경기 시작 테스트
- [ ] 실시간 동기화 테스트

**예상 소요 시간**: 5분

---

## 📱 Phase 6: PWA 설정 (선택사항) ⬜

### ⬜ 6.1 PWA 플러그인 설치
- [ ] `npm install -D vite-plugin-pwa`
- [ ] `vite.config.js` 수정
- [ ] manifest 설정

**예상 소요 시간**: 15분

### ⬜ 6.2 아이콘 준비
- [ ] 192x192 아이콘 생성
- [ ] 512x512 아이콘 생성
- [ ] `public/` 폴더에 저장

**예상 소요 시간**: 15분

---

## 🧪 Phase 7: 테스트 및 최적화 ⬜

### ⬜ 7.1 기능 테스트
- [ ] Google 로그인/로그아웃
- [ ] 팀 생성/수정/삭제
- [ ] 경기 생성 및 시작
- [ ] 실시간 스코어 업데이트
- [ ] 선수 기록 입력
- [ ] 배지 획득 시스템
- [ ] 경기 종료 및 히스토리 저장
- [ ] 다중 기기 동기화
- [ ] 오프라인 모드 테스트

**예상 소요 시간**: 30분

### ⬜ 7.2 성능 최적화
- [ ] 번들 크기 확인 (`npm run build`)
- [ ] Firestore 쿼리 최적화
- [ ] 불필요한 리스너 제거
- [ ] 이미지 최적화

**예상 소요 시간**: 20분

### ⬜ 7.3 보안 강화
- [ ] 프로덕션 보안 규칙 적용
- [ ] 환경 변수 재확인
- [ ] API 키 제한 설정 (Firebase Console)

**예상 소요 시간**: 10분

---

## 📊 Phase 8: 모니터링 및 유지보수 ⬜

### ⬜ 8.1 Firebase 사용량 모니터링
- [ ] Firebase Console → Usage 확인
- [ ] Firestore 읽기/쓰기 횟수 모니터링
- [ ] Authentication 사용자 수 확인

**예상 소요 시간**: 10분

### ⬜ 8.2 백업 전략
- [ ] Firestore 자동 백업 설정
- [ ] 수동 내보내기 기능 테스트

**예상 소요 시간**: 10분

---

## 🎯 다음 단계 (우선순위 순)

### 1️⃣ **즉시 결정 필요**
**보안 규칙 적용 여부 결정**
- **옵션 A**: 간단한 보안 (로그인 사용자는 자신의 데이터만 접근)
  - 장점: 빠른 개발, 관리 간단
  - 단점: 교사 간 데이터 공유 불가

- **옵션 B**: 하이브리드 보안 (권한 요청/승인 시스템)
  - 장점: 유연한 데이터 공유
  - 단점: 추가 개발 시간 (약 1시간)

**추천**: 옵션 A로 시작 → 필요시 옵션 B로 전환

### 2️⃣ **FirestoreService 구현**
- `src/services/firestoreService.js` 파일 작성
- CRUD 함수 구현
- 실시간 리스너 연결
- 예상 소요: 1시간

### 3️⃣ **GameContext 작성**
- Firestore와 React 연결
- 전역 상태 관리
- 예상 소요: 30분

### 4️⃣ **컴포넌트 마이그레이션**
- 기존 컴포넌트 복사 및 수정
- Firebase 연동
- 예상 소요: 2시간

### 5️⃣ **Vercel 배포**
- GitHub 연동
- 환경 변수 설정
- 예상 소요: 30분

---

## 📌 중요 결정 사항

### ✅ 이미 결정된 사항
1. **요금제**: Firestore Standard (종량제)
2. **리전**: asia-northeast3 (Seoul)
3. **인증 방식**: Google OAuth
4. **배포 플랫폼**: Vercel

### ❓ 결정 필요 사항
1. **보안 규칙**: 간단 vs 하이브리드
2. **PWA 설정**: 필요 여부
3. **모니터링 도구**: Sentry 사용 여부

---

## 📝 개발 노트

### 배운 내용
- Firestore는 NoSQL 데이터베이스로 컬렉션-문서 구조 사용
- 보안 규칙은 서버 측에서 실행되어 클라이언트 조작 불가
- 실시간 리스너는 자동으로 데이터 동기화
- 오프라인 지속성으로 네트워크 없이도 작동 가능

### 주의사항
- `.env.local` 파일은 절대 Git에 커밋하지 않기
- Firestore 읽기/쓰기는 비용 발생 (무료 할당량: 읽기 50K, 쓰기 20K/일)
- 테스트 모드는 30일 후 자동 만료되므로 보안 규칙 필수

### 트러블슈팅
- **firestore.rules 파일이 안 열릴 때**: 텍스트 에디터로 열거나 VS Code로 열기
- **Google 로그인 팝업 차단**: 브라우저 설정에서 팝업 허용
- **여러 탭에서 오프라인 지속성 실패**: 정상 동작 (경고만 표시)

---

## 🔗 참고 링크

- [PRD 문서](PRD_FIREBASE_FULLSTACK.md) - 전체 개발 계획
- [Firebase Console](https://console.firebase.google.com/project/baseball-firebase-d4d8d)
- [Vercel Dashboard](https://vercel.com/dashboard)
- [Firebase 공식 문서](https://firebase.google.com/docs)
- [Firestore 보안 규칙](https://firebase.google.com/docs/firestore/security/get-started)

---

**작성자**: Claude Code
**프로젝트 시작일**: 2025-10-21
**최종 수정일**: 2025-10-21
