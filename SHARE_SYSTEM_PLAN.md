# 교사 간 학급/팀 공유 시스템 구축 계획

## 📋 프로젝트 개요

### 목표
교사들이 자신의 학급과 팀을 다른 교사와 공유하여 협업할 수 있는 시스템 구축

### 핵심 요구사항
- **권한 체계**: 뷰어(조회만) → 편집자(경기 진행) → 소유자(전체 관리) 3단계
- **공유 범위**: 학급별/팀별 선택적 공유
- **초대 방식**: UUID 기반 링크 공유 (클립보드 복사)
- **데이터 정책**:
  - 모든 기록은 원 소유자에게 저장 (통합 관리)
  - 공유받은 교사는 학생 정보 수정 불가 (조회만)

---

## 🗂️ Phase 1: 데이터 구조 및 보안 규칙 설정

### Step 1.1: Firestore 컬렉션 구조 설계

#### 신규 컬렉션 1: `shares` (공유 설정)
```javascript
shares/{shareId}
  - ownerId: string           // 원 소유자 UID
  - items: array              // 공유할 항목들
    [{
      type: 'class' | 'team',
      id: string,
      name: string
    }]
  - inviteCode: string        // UUID 기반 초대 토큰
  - permissions: object       // 권한 레벨별 사용자 목록
    {
      viewers: string[],      // 뷰어 UID 배열
      editors: string[],      // 편집자 UID 배열
      owners: string[]        // 공동 소유자 UID 배열 (초기값: [ownerId])
    }
  - createdAt: timestamp
  - updatedAt: timestamp
  - expiresAt: timestamp      // (선택) 링크 만료 시간
```

#### 신규 컬렉션 2: `users/{userId}/sharedWithMe` (참여 중인 공유)
```javascript
users/{userId}/sharedWithMe/{shareId}
  - shareId: string           // 공유 ID (참조용)
  - ownerId: string           // 원 소유자 UID
  - ownerName: string         // 원 소유자 이름
  - ownerEmail: string        // 원 소유자 이메일
  - items: array              // 공유받은 항목들
    [{
      type: 'class' | 'team',
      id: string,
      name: string
    }]
  - permission: string        // 'viewer' | 'editor' | 'owner'
  - joinedAt: timestamp
  - lastAccessedAt: timestamp
```

**작업 파일**: 설계 문서 작성 (이 파일)

---

### Step 1.2: Firestore Security Rules 수정

#### 보안 규칙 추가 내용

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ============================================
    // 헬퍼 함수
    // ============================================

    // 로그인 여부 확인
    function isSignedIn() {
      return request.auth != null;
    }

    // 소유자 확인
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }

    // 공유 권한 확인
    function hasSharePermission(ownerId, itemId, itemType, requiredLevel) {
      // 1. shares 컬렉션에서 해당 항목을 포함한 공유 찾기
      let shares = firestore.get(/databases/$(database)/documents/shares).data;
      let userShares = shares.filter(share =>
        share.ownerId == ownerId &&
        share.items.hasAny([{type: itemType, id: itemId}])
      );

      // 2. 권한 레벨 확인
      if (userShares.size() == 0) return false;

      let share = userShares[0];
      let permissions = share.permissions;
      let userId = request.auth.uid;

      // 3. 권한별 접근 허용
      if (requiredLevel == 'viewer') {
        return userId in permissions.viewers
            || userId in permissions.editors
            || userId in permissions.owners;
      } else if (requiredLevel == 'editor') {
        return userId in permissions.editors
            || userId in permissions.owners;
      } else if (requiredLevel == 'owner') {
        return userId in permissions.owners;
      }

      return false;
    }

    // ============================================
    // shares 컬렉션 규칙
    // ============================================

    match /shares/{shareId} {
      // 읽기: 소유자 또는 권한 보유자
      allow read: if isSignedIn() && (
        resource.data.ownerId == request.auth.uid ||
        request.auth.uid in resource.data.permissions.viewers ||
        request.auth.uid in resource.data.permissions.editors ||
        request.auth.uid in resource.data.permissions.owners
      );

      // 생성: 로그인한 사용자가 소유자로 지정된 경우
      allow create: if isSignedIn() &&
        request.resource.data.ownerId == request.auth.uid;

      // 수정: 소유자 또는 공동 소유자
      allow update: if isSignedIn() && (
        resource.data.ownerId == request.auth.uid ||
        request.auth.uid in resource.data.permissions.owners
      );

      // 삭제: 원 소유자만 가능
      allow delete: if isSignedIn() &&
        resource.data.ownerId == request.auth.uid;
    }

    // ============================================
    // 사용자별 공유 참여 목록
    // ============================================

    match /users/{userId}/sharedWithMe/{shareId} {
      // 읽기/쓰기: 본인만 가능
      allow read, write: if isOwner(userId);
    }

    // ============================================
    // 학생 데이터 접근 규칙 (수정)
    // ============================================

    match /users/{userId}/students/{studentId} {
      // 읽기: 소유자 또는 해당 학급을 공유받은 뷰어 이상
      allow read: if isOwner(userId) ||
        hasSharePermission(userId, resource.data.className, 'class', 'viewer');

      // 쓰기: 소유자만 가능 (학생 정보 수정 불가 정책)
      allow write: if isOwner(userId);
    }

    // ============================================
    // 팀 데이터 접근 규칙 (수정)
    // ============================================

    match /users/{userId}/teams/{teamId} {
      // 읽기: 소유자 또는 해당 팀을 공유받은 뷰어 이상
      allow read: if isOwner(userId) ||
        hasSharePermission(userId, teamId, 'team', 'viewer');

      // 쓰기: 소유자만 가능 (팀 정보 수정 불가)
      allow write: if isOwner(userId);
    }

    // ============================================
    // 경기 기록 접근 규칙 (수정)
    // ============================================

    match /users/{userId}/games/{gameId} {
      // 읽기: 소유자 또는 공유받은 뷰어 이상
      allow read: if isOwner(userId) ||
        hasSharePermission(userId, resource.data.className, 'class', 'viewer');

      // 쓰기: 소유자 또는 편집자 (경기 진행 가능)
      allow write: if isOwner(userId) ||
        hasSharePermission(userId, resource.data.className, 'class', 'editor');
    }

    // ============================================
    // 선수 히스토리 접근 규칙 (수정)
    // ============================================

    match /users/{userId}/playerHistory/{playerId} {
      // 읽기: 소유자 또는 공유받은 뷰어 이상
      allow read: if isOwner(userId) ||
        hasSharePermission(userId, getStudentClass(userId, playerId), 'class', 'viewer');

      // 쓰기: 소유자 또는 편집자 (경기 기록 추가)
      allow write: if isOwner(userId) ||
        hasSharePermission(userId, getStudentClass(userId, playerId), 'class', 'editor');
    }

    // ============================================
    // 배지 데이터 접근 규칙 (수정)
    // ============================================

    match /users/{userId}/playerBadges/{playerId} {
      // 읽기: 소유자 또는 공유받은 뷰어 이상
      allow read: if isOwner(userId) ||
        hasSharePermission(userId, getStudentClass(userId, playerId), 'class', 'viewer');

      // 쓰기: 소유자 또는 편집자 (배지 수여 가능)
      allow write: if isOwner(userId) ||
        hasSharePermission(userId, getStudentClass(userId, playerId), 'class', 'editor');
    }

    // ============================================
    // 헬퍼: 학생의 학급 조회
    // ============================================

    function getStudentClass(userId, playerId) {
      let student = get(/databases/$(database)/documents/users/$(userId)/students/$(playerId));
      return student.data.className;
    }
  }
}
```

**작업 파일**: `firestore.rules`

**배포 명령어**:
```bash
firebase deploy --only firestore:rules
```

---

## 🎨 Phase 2: UI 컴포넌트 개발

### Step 2.1: ClassShareSelectionModal 생성 (학급/팀 선택 모달)

**파일**: `src/components/ClassShareSelectionModal.jsx`

**기능**:
- 공유할 학급 카드 선택 (체크박스, 다중 선택 가능)
- 공유할 팀 카드 선택 (체크박스, 다중 선택 가능)
- 선택한 항목 개수 표시
- "다음" 버튼으로 설정 모달로 이동

**주요 Props**:
```typescript
interface ClassShareSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes: Class[];        // 내 학급 목록
  teams: Team[];          // 내 팀 목록
  onSelect: (items: SelectedItem[]) => void;
}

interface SelectedItem {
  type: 'class' | 'team';
  id: string;
  name: string;
}
```

**UI 구조**:
```
Dialog
├─ DialogHeader
│  ├─ DialogTitle: "🔗 공유할 학급/팀 선택"
│  └─ DialogDescription
│
├─ DialogContent
│  ├─ 학급 선택 섹션
│  │  └─ Grid (3 columns)
│  │     └─ 학급 Card (체크박스 + 학급명 + 학생 수)
│  │
│  └─ 팀 선택 섹션
│     └─ Grid (3 columns)
│        └─ 팀 Card (체크박스 + 팀명 + 선수 수)
│
└─ DialogFooter
   ├─ Button: "취소"
   └─ Button: "다음 → (N개 선택됨)" (선택 없으면 비활성화)
```

---

### Step 2.2: ClassShareSettingsModal 생성 (권한 설정 및 링크 생성)

**파일**: `src/components/ClassShareSettingsModal.jsx`

**기능**:
- 선택한 학급/팀 목록 표시
- 권한 레벨 선택 (뷰어/편집자)
- 공유 링크 생성
- 클립보드 복사 기능

**주요 Props**:
```typescript
interface ClassShareSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedItems: SelectedItem[];
  onCreateLink: (items: SelectedItem[], permission: Permission) => Promise<string>;
}

type Permission = 'viewer' | 'editor';
```

**UI 구조**:
```
Dialog
├─ DialogHeader
│  ├─ DialogTitle: "🔗 공유 링크 생성"
│  └─ DialogDescription
│
├─ DialogContent
│  ├─ 선택한 항목 표시 영역 (배지 형태)
│  │
│  ├─ 권한 선택 라디오 버튼
│  │  ├─ 👁️ 뷰어 (조회만 가능)
│  │  └─ ✏️ 편집자 (경기 진행 및 기록 추가 가능)
│  │
│  ├─ [링크 생성] 버튼
│  │
│  └─ 생성된 링크 영역 (생성 후 표시)
│     ├─ Input (readonly, 링크 전체 표시)
│     └─ [📋 복사] 버튼
│
└─ DialogFooter
   └─ Button: "닫기"
```

---

### Step 2.3: ShareInvitePage 생성 (초대 링크 수락 페이지)

**파일**: `src/components/ShareInvitePage.jsx`

**기능**:
- URL의 inviteCode 파라미터 추출
- 공유 정보 로드 및 표시
- 로그인 상태 확인
- 참여하기 버튼 (공유 수락)
- 성공 시 대시보드로 리디렉션

**URL 경로**: `/share/:inviteCode`

**주요 State**:
```typescript
const [shareData, setShareData] = useState<ShareData | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

interface ShareData {
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  items: SelectedItem[];
  permission: Permission;
  createdAt: Date;
}
```

**UI 구조**:
```
Container (중앙 정렬, 전체 화면)
└─ Card (max-w-lg)
   ├─ CardHeader
   │  ├─ CardTitle: "🔗 학급/팀 공유 초대"
   │  └─ CardDescription: "{소유자명}님이 공유를 초대했습니다"
   │
   ├─ CardContent
   │  ├─ 공유 항목 표시 영역
   │  │  └─ 각 항목 (아이콘 + 이름)
   │  │
   │  ├─ 권한 표시 영역
   │  │  └─ 부여받을 권한 레벨 표시
   │  │
   │  └─ [✅ 참여하기] 버튼 (로그인 필요)
   │
   └─ (로그인 안 되어 있으면)
      └─ 로그인 안내 메시지 + 로그인 버튼
```

---

### Step 2.4: SharedItemsSection 생성 (공유받은 항목 표시)

**파일**: `src/components/SharedItemsSection.jsx`

**기능**:
- 내가 공유받은 학급/팀 목록 표시
- 권한 레벨 배지 표시
- 소유자 정보 표시
- 클릭 시 해당 학급/팀으로 이동

**Props**:
```typescript
interface SharedItemsSectionProps {
  sharedItems: SharedItem[];
  onSelectItem: (ownerId: string, itemType: string, itemId: string) => void;
}

interface SharedItem {
  shareId: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  items: SelectedItem[];
  permission: Permission;
  joinedAt: Date;
}
```

**UI 구조**:
```
Section
├─ Header
│  ├─ Title: "👥 공유받은 학급/팀"
│  └─ Count: "({N}개)"
│
└─ Grid (3 columns)
   └─ Card (각 공유받은 항목)
      ├─ Header
      │  ├─ 학급/팀 이름
      │  └─ 권한 배지 (뷰어/편집자)
      │
      ├─ Body
      │  ├─ 소유자 정보
      │  └─ 참여 날짜
      │
      └─ Footer
         └─ [보기] 버튼
```

---

## 🔧 Phase 3: 백엔드 로직 구현

### Step 3.1: firestoreService.js - 공유 링크 생성

**파일**: `src/services/firestoreService.js`

**추가 함수**:

```javascript
/**
 * 공유 링크 생성
 * @param {Array} items - [{type: 'class'|'team', id: string, name: string}]
 * @param {string} permission - 'viewer' | 'editor'
 * @returns {Promise<string>} 초대 링크 URL
 */
async createShareLink(items, permission = 'viewer') {
  try {
    const userId = this.getCurrentUserId();
    const userDoc = await getDoc(doc(db, 'users', userId));
    const userName = userDoc.data()?.displayName || 'Unknown';
    const userEmail = userDoc.data()?.email || '';

    // UUID 기반 고유 토큰 생성
    const { v4: uuidv4 } = await import('uuid');
    const inviteCode = uuidv4();

    // shares 컬렉션에 저장
    const shareRef = doc(db, 'shares', inviteCode);
    await setDoc(shareRef, {
      ownerId: userId,
      ownerName: userName,
      ownerEmail: userEmail,
      items: items.map(item => ({
        type: item.type,
        id: item.id,
        name: item.name
      })),
      inviteCode,
      permissions: {
        viewers: permission === 'viewer' ? [] : [],
        editors: permission === 'editor' ? [] : [],
        owners: [userId]
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // 초대 링크 생성
    const inviteLink = `${window.location.origin}/share/${inviteCode}`;
    console.log('✅ 공유 링크 생성:', inviteLink);

    return inviteLink;
  } catch (error) {
    console.error('❌ 공유 링크 생성 실패:', error);
    throw new Error('공유 링크 생성에 실패했습니다.');
  }
}
```

---

### Step 3.2: firestoreService.js - 공유 정보 조회

```javascript
/**
 * 공유 정보 조회
 * @param {string} inviteCode - 초대 코드
 * @returns {Promise<Object>} 공유 정보
 */
async getShareData(inviteCode) {
  try {
    const shareRef = doc(db, 'shares', inviteCode);
    const shareDoc = await getDoc(shareRef);

    if (!shareDoc.exists()) {
      throw new Error('유효하지 않은 초대 링크입니다.');
    }

    const shareData = shareDoc.data();

    // 권한 레벨 결정 (초대 링크의 기본 권한)
    const hasEditors = shareData.permissions.editors.length > 0;
    const defaultPermission = hasEditors ? 'editor' : 'viewer';

    console.log('✅ 공유 정보 로드:', shareData);

    return {
      shareId: inviteCode,
      ownerId: shareData.ownerId,
      ownerName: shareData.ownerName,
      ownerEmail: shareData.ownerEmail,
      items: shareData.items,
      permission: defaultPermission,
      createdAt: shareData.createdAt
    };
  } catch (error) {
    console.error('❌ 공유 정보 로드 실패:', error);
    throw error;
  }
}
```

---

### Step 3.3: firestoreService.js - 초대 수락 (공유 참여)

```javascript
/**
 * 초대 수락 (공유 참여)
 * @param {string} inviteCode - 초대 코드
 */
async joinByInvite(inviteCode) {
  try {
    const userId = this.getCurrentUserId();
    const shareData = await this.getShareData(inviteCode);

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
      ownerEmail: shareData.ownerEmail,
      items: shareData.items,
      permission: shareData.permission,
      joinedAt: serverTimestamp(),
      lastAccessedAt: serverTimestamp()
    });

    console.log('✅ 공유 참여 완료');
  } catch (error) {
    console.error('❌ 공유 참여 실패:', error);
    throw new Error('공유 참여에 실패했습니다.');
  }
}
```

---

### Step 3.4: firestoreService.js - 공유받은 항목 조회

```javascript
/**
 * 공유받은 항목 조회
 * @returns {Promise<Array>} 공유받은 항목 목록
 */
async getSharedWithMe() {
  try {
    const userId = this.getCurrentUserId();
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
```

---

### Step 3.5: firestoreService.js - 공유받은 학급의 학생 조회

```javascript
/**
 * 공유받은 학급의 학생 조회
 * @param {string} ownerId - 원 소유자 UID
 * @param {string} classId - 학급 ID (className)
 * @returns {Promise<Array>} 학생 목록
 */
async getSharedClassStudents(ownerId, classId) {
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
```

---

### Step 3.6: firestoreService.js - 공유받은 팀의 선수 조회

```javascript
/**
 * 공유받은 팀의 선수 조회
 * @param {string} ownerId - 원 소유자 UID
 * @param {string} teamId - 팀 ID
 * @returns {Promise<Object>} 팀 정보 (선수 포함)
 */
async getSharedTeam(ownerId, teamId) {
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
```

---

### Step 3.7: firestoreService.js - 경기 생성 시 원 소유자 계정에 저장

```javascript
/**
 * 공유받은 학급으로 경기 생성 (원 소유자 계정에 저장)
 * @param {string} ownerId - 원 소유자 UID
 * @param {Object} gameData - 경기 데이터
 * @returns {Promise<string>} 생성된 경기 ID
 */
async createGameForOwner(ownerId, gameData) {
  try {
    const gamesRef = collection(db, 'users', ownerId, 'games');
    const gameDoc = await addDoc(gamesRef, {
      ...gameData,
      createdBy: this.getCurrentUserId(), // 실제 진행자 UID
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    console.log(`✅ 경기 생성 완료 (소유자: ${ownerId}, ID: ${gameDoc.id})`);
    return gameDoc.id;
  } catch (error) {
    console.error('❌ 경기 생성 실패:', error);
    throw error;
  }
}
```

---

### Step 3.8: firestoreService.js - 권한 변경

```javascript
/**
 * 공유 권한 변경
 * @param {string} shareId - 공유 ID
 * @param {string} targetUserId - 대상 사용자 UID
 * @param {string} newPermission - 새 권한 ('viewer' | 'editor' | 'owner')
 */
async updateSharePermission(shareId, targetUserId, newPermission) {
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
```

---

### Step 3.9: firestoreService.js - 공유 해제

```javascript
/**
 * 사용자를 공유에서 제거
 * @param {string} shareId - 공유 ID
 * @param {string} targetUserId - 제거할 사용자 UID
 */
async removeUserFromShare(shareId, targetUserId) {
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
```

---

## 🔗 Phase 4: 기존 컴포넌트 통합

### Step 4.1: ClassTeamManagementView.jsx 수정

**수정 내용**:
1. 헤더에 "🔗 학급/팀 공유" 버튼 추가
2. 공유 모달 상태 관리
3. 공유받은 항목 섹션 추가

**추가 코드**:

```jsx
// State 추가
const [showShareSelectionModal, setShowShareSelectionModal] = useState(false);
const [showShareSettingsModal, setShowShareSettingsModal] = useState(false);
const [selectedItemsForShare, setSelectedItemsForShare] = useState([]);
const [sharedWithMe, setSharedWithMe] = useState([]);

// 공유받은 항목 로드
useEffect(() => {
  const loadSharedItems = async () => {
    if (user) {
      try {
        const shared = await firestoreService.getSharedWithMe();
        setSharedWithMe(shared);
      } catch (error) {
        console.error('공유받은 항목 로드 실패:', error);
      }
    }
  };
  loadSharedItems();
}, [user]);

// 공유 선택 완료 핸들러
const handleShareSelect = (items) => {
  setSelectedItemsForShare(items);
  setShowShareSelectionModal(false);
  setShowShareSettingsModal(true);
};

// 공유 링크 생성 핸들러
const handleCreateShareLink = async (items, permission) => {
  try {
    const link = await firestoreService.createShareLink(items, permission);
    return link;
  } catch (error) {
    console.error('공유 링크 생성 실패:', error);
    alert('❌ 공유 링크 생성에 실패했습니다.');
    throw error;
  }
};

// JSX 수정
return (
  <div>
    {/* 헤더 */}
    <div className="flex gap-2">
      <Button onClick={() => setShowCreateGameModal(true)}>
        🆕 새 경기 만들기
      </Button>

      {/* 🆕 공유 버튼 추가 */}
      <Button
        variant="outline"
        onClick={() => setShowShareSelectionModal(true)}
      >
        🔗 학급/팀 공유
      </Button>
    </div>

    {/* 기존 내 학급/팀 섹션 */}
    <MyClassesSection />

    {/* 🆕 공유받은 항목 섹션 */}
    <SharedItemsSection
      sharedItems={sharedWithMe}
      onSelectItem={handleSelectSharedItem}
    />

    {/* 공유 모달들 */}
    <ClassShareSelectionModal
      open={showShareSelectionModal}
      onOpenChange={setShowShareSelectionModal}
      classes={classes}
      teams={teams}
      onSelect={handleShareSelect}
    />

    <ClassShareSettingsModal
      open={showShareSettingsModal}
      onOpenChange={setShowShareSettingsModal}
      selectedItems={selectedItemsForShare}
      onCreateLink={handleCreateShareLink}
    />
  </div>
);
```

---

### Step 4.2: App.jsx 라우트 추가

**수정 내용**: ShareInvitePage 라우트 추가

**추가 코드**:

```jsx
import ShareInvitePage from './components/ShareInvitePage';

// ...

<Routes>
  <Route path="/" element={<PrivacyConsentGuard><AppContent /></PrivacyConsentGuard>} />

  {/* 🆕 공유 초대 라우트 추가 */}
  <Route path="/share/:inviteCode" element={<ShareInvitePage />} />

  <Route path="/student" element={<StudentView />} />
</Routes>
```

---

### Step 4.3: MainApp.jsx 수정 (공유 데이터 통합)

**수정 내용**:
1. 공유받은 학급/팀 데이터 로드
2. 내 데이터 + 공유받은 데이터 통합 표시
3. 권한 정보를 Context에 추가

**추가 코드**:

```jsx
// State 추가
const [sharedClasses, setSharedClasses] = useState([]);
const [sharedTeams, setSharedTeams] = useState([]);

// 공유받은 데이터 로드
useEffect(() => {
  const loadSharedData = async () => {
    if (user) {
      try {
        const sharedItems = await getSharedWithMe();

        // 학급과 팀 분리
        const classes = [];
        const teams = [];

        for (const item of sharedItems) {
          for (const shareItem of item.items) {
            if (shareItem.type === 'class') {
              const students = await getSharedClassStudents(
                item.ownerId,
                shareItem.id
              );
              classes.push({
                ...shareItem,
                students,
                ownerId: item.ownerId,
                ownerName: item.ownerName,
                permission: item.permission,
                isShared: true
              });
            } else if (shareItem.type === 'team') {
              const team = await getSharedTeam(item.ownerId, shareItem.id);
              teams.push({
                ...team,
                ownerId: item.ownerId,
                ownerName: item.ownerName,
                permission: item.permission,
                isShared: true
              });
            }
          }
        }

        setSharedClasses(classes);
        setSharedTeams(teams);
      } catch (error) {
        console.error('공유 데이터 로드 실패:', error);
      }
    }
  };

  loadSharedData();
}, [user]);

// 통합 데이터 (내 것 + 공유받은 것)
const allClasses = [...classes, ...sharedClasses];
const allTeams = [...teams, ...sharedTeams];
```

---

## 🎯 Phase 5: 권한별 UI 제한

### Step 5.1: 권한 확인 유틸리티 함수

**파일**: `src/utils/permissionHelpers.js` (신규 생성)

```javascript
/**
 * 권한 레벨 확인
 */
export const hasPermission = (item, requiredLevel) => {
  if (!item.isShared) return true; // 내 항목은 모든 권한

  const permission = item.permission;

  if (requiredLevel === 'viewer') {
    return ['viewer', 'editor', 'owner'].includes(permission);
  } else if (requiredLevel === 'editor') {
    return ['editor', 'owner'].includes(permission);
  } else if (requiredLevel === 'owner') {
    return permission === 'owner';
  }

  return false;
};

/**
 * 권한 배지 생성
 */
export const getPermissionBadge = (permission) => {
  const badges = {
    viewer: { icon: '👁️', label: '뷰어', color: 'blue' },
    editor: { icon: '✏️', label: '편집자', color: 'green' },
    owner: { icon: '👑', label: '소유자', color: 'purple' }
  };

  return badges[permission] || badges.viewer;
};
```

---

### Step 5.2: UI 조건부 렌더링 적용

**수정 파일들**:
- `CreateGameModal.jsx`: 공유 학급 선택 시 ownerId 전달
- `ClassTeamManagementView.jsx`: 편집 버튼 권한 체크
- `GameScreen.jsx`: 경기 진행 권한 체크

**예시 코드**:

```jsx
// CreateGameModal.jsx
const handleSelectTeam = (team) => {
  const actualOwnerId = team.isShared ? team.ownerId : user.uid;
  // actualOwnerId를 사용하여 경기 생성
};

// ClassTeamManagementView.jsx
{hasPermission(classItem, 'owner') && (
  <Button onClick={() => handleEditClass(classItem)}>
    편집
  </Button>
)}

{hasPermission(classItem, 'editor') && (
  <Button onClick={() => handleCreateGame(classItem)}>
    경기 시작
  </Button>
)}

// 권한 배지 표시
{classItem.isShared && (
  <Badge className={`bg-${getPermissionBadge(classItem.permission).color}-100`}>
    {getPermissionBadge(classItem.permission).icon}
    {getPermissionBadge(classItem.permission).label}
  </Badge>
)}
```

---

## 📦 Phase 6: 패키지 설치 및 최종 테스트

### Step 6.1: 필요한 패키지 설치

```bash
npm install uuid
```

---

### Step 6.2: 통합 테스트 시나리오

#### 시나리오 1: 공유 링크 생성 및 전달
1. 교사 A가 로그인
2. "학급/팀 공유" 버튼 클릭
3. 5학년 1반 학급 선택
4. 권한 "편집자" 선택
5. 링크 생성 및 복사
6. 카카오톡으로 교사 B에게 전달

#### 시나리오 2: 초대 링크로 참여
1. 교사 B가 링크 클릭
2. ShareInvitePage 로드 (초대 정보 표시)
3. "참여하기" 버튼 클릭
4. 대시보드로 리디렉션
5. "공유받은 학급/팀" 섹션에 5학년 1반 표시

#### 시나리오 3: 공유받은 학급으로 경기 진행
1. 교사 B가 공유받은 5학년 1반 선택
2. "새 경기 만들기" 클릭
3. 학생 선택 (5학년 1반의 학생들)
4. 경기 진행 및 기록 추가
5. 모든 기록은 교사 A의 Firestore에 저장됨

#### 시나리오 4: 권한 제한 확인
1. 교사 B (편집자)가 학생 편집 버튼 클릭 시도
2. 버튼 비활성화 또는 오류 메시지
3. 뷰어 권한인 교사 C는 경기 생성도 불가

---

### Step 6.3: 보안 규칙 배포

```bash
firebase deploy --only firestore:rules
```

---

## 📊 작업 시간 예상

| Phase | 작업 내용 | 예상 시간 |
|-------|----------|----------|
| Phase 1 | Firestore 구조 + Security Rules | 2-3시간 |
| Phase 2 | UI 컴포넌트 4개 생성 | 3-4시간 |
| Phase 3 | firestoreService 함수 9개 추가 | 2-3시간 |
| Phase 4 | 기존 컴포넌트 통합 | 1-2시간 |
| Phase 5 | 권한 UI 제한 | 1-2시간 |
| Phase 6 | 테스트 및 버그 수정 | 2-3시간 |
| **총계** | | **11-17시간** |

---

## ⚠️ 주의사항 및 고려사항

### 보안
- ✅ UUID 기반 초대 코드 (추측 불가능)
- ✅ Firestore Security Rules로 권한 검증
- ⚠️ 링크 만료 기능은 Phase 7로 미루기 (선택사항)
- ⚠️ 공유 해제 시 캐스케이드 삭제 주의

### 성능
- ✅ 공유받은 데이터는 필요 시에만 로드
- ✅ 실시간 리스너 최소화
- ⚠️ 많은 공유 항목이 있을 경우 페이지네이션 고려

### UX
- ✅ 로딩 상태 표시 필수
- ✅ 오류 메시지 명확히 표시
- ✅ 권한별 UI 제한 명확히 안내
- ⚠️ 공유 상태 변경 시 실시간 반영 필요

### 데이터 무결성
- ✅ 원 소유자 계정에만 기록 저장
- ✅ 학생 정보는 원 소유자만 수정
- ⚠️ 공유 해제 시 진행 중인 경기 처리 방안 필요

---

## 🎉 완료 후 검증 체크리스트

### 기능 검증
- [ ] 공유 링크 생성 가능
- [ ] 클립보드 복사 정상 작동
- [ ] 초대 링크로 참여 가능
- [ ] 공유받은 항목 목록 표시
- [ ] 공유받은 학급으로 경기 진행 가능
- [ ] 모든 기록이 원 소유자에게 저장됨
- [ ] 권한별 UI 제한 정상 작동

### 보안 검증
- [ ] 뷰어는 경기 진행 불가
- [ ] 편집자는 학생 수정 불가
- [ ] 소유자만 공유 설정 변경 가능
- [ ] 유효하지 않은 링크 접근 차단

### UX 검증
- [ ] 로딩 상태 표시
- [ ] 오류 메시지 명확함
- [ ] 권한 배지 정확히 표시
- [ ] 공유 상태 명확히 구분

---

## 📝 다음 단계 (Phase 7 - 선택사항)

### 추가 기능 고려
1. **링크 만료 기능**: expiresAt 필드 활용
2. **공유 알림**: 새 공유 초대 시 이메일 발송
3. **공유 이력**: 누가 언제 어떤 작업을 했는지 로그
4. **일괄 권한 변경**: 여러 사용자의 권한 한 번에 수정
5. **공유 통계**: 공유 활동 통계 대시보드

---

## 📚 참고 자료

### Firestore Security Rules
- [공식 문서](https://firebase.google.com/docs/firestore/security/get-started)
- [규칙 테스트](https://firebase.google.com/docs/firestore/security/test-rules-emulator)

### UUID 생성
- [uuid 패키지](https://www.npmjs.com/package/uuid)

### React Router
- [공식 문서](https://reactrouter.com/)

---

**작성일**: 2025-11-04
**버전**: 1.0
**작성자**: Claude Code & 이원근 교사
