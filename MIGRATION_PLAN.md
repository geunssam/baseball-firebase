# 🚀 Firebase 풀스택 발야구 마스터 보드 완성 계획

**작성일**: 2025-10-21
**목표**: 기존 v4-pwa-1의 모든 기능을 Firebase 버전으로 마이그레이션
**디자인**: shadcn/ui + Tailwind (파스텔 톤: 화이트/파스텔 블루/파스텔 핑크)

---

## 📋 **진행 상태 체크리스트**

### **Phase 4: 핵심 기능 구현**

#### **Step 1: shadcn/ui 설치 및 디자인 시스템 구축** (30분)
- [v] 1.1 shadcn/ui 초기화
- [v] 1.2 필수 shadcn 컴포넌트 설치
- [v] 1.3 커스텀 파스텔 컬러 테마 설정
- [v] 1.4 디자인 토큰 설정

#### **Step 2: 팀 관리 UI 개선** (1시간) ✅
- [v] 2.1 MainApp 전면 개편
- [v] 2.2 TeamCard 컴포넌트 생성
- [v] 2.3 CreateGameModal → Dialog로 변경

#### **Step 3: 경기 생성 및 관리** (1.5시간)
- [ ] 3.1 CreateGameModal 완성
- [ ] 3.2 LineupModal 구현
- [ ] 3.3 경기 목록 화면

#### **Step 4: LiveGame 실시간 경기 화면** (2시간)
- [ ] 4.1 LiveGame 컴포넌트 복사 및 수정
- [ ] 4.2 Firebase 실시간 동기화 연동
- [ ] 4.3 디자인 개선
- [ ] 4.4 공격/수비 시각화

#### **Step 5: 배지 시스템** (1.5시간)
- [ ] 5.1 BadgeManagementModal
- [ ] 5.2 BadgeProgressIndicator
- [ ] 5.3 PlayerBadgeOrderModal
- [ ] 5.4 BadgeCreator
- [ ] 5.5 AllBadgesModal
- [ ] 5.6 BadgeSelector

#### **Step 6: 경기 종료 및 히스토리** (1시간)
- [ ] 6.1 경기 종료 처리
- [ ] 6.2 히스토리 화면

### **Phase 5: 전체 UI/UX 통합 및 최적화**

#### **Step 7: 네비게이션 및 라우팅** (1시간)
- [ ] 7.1 네비게이션 바
- [ ] 7.2 라우팅
- [ ] 7.3 모바일 반응형

#### **Step 8: 전체 디자인 통일** (1시간)
- [ ] 8.1 컬러 팔레트 통일
- [ ] 8.2 애니메이션 추가
- [ ] 8.3 일관성 체크

### **Phase 6: 배포 준비**

#### **Step 9: Vercel 배포** (30분)
- [ ] 9.1 GitHub 연결
- [ ] 9.2 Vercel 배포
- [ ] 9.3 Firebase 도메인 허용

#### **Step 10: 최종 테스트** (30분)
- [ ] 10.1 기능 테스트
- [ ] 10.2 다중 디바이스 동기화 테스트
- [ ] 10.3 모바일 테스트

---

## 📝 **Step 1 상세 가이드**

### **1.1 shadcn/ui 초기화**

**명령어**:
```bash
npx shadcn@latest init
```

**설정 값**:
- TypeScript: Yes
- Style: Default
- Base color: Slate
- CSS variables: Yes
- Tailwind config: Yes (components.json 생성)

**예상 파일 변경**:
- `components.json` 생성
- `tailwind.config.js` 업데이트
- `src/index.css` 업데이트 (CSS 변수 추가)
- `src/components/ui/` 폴더 생성

---

### **1.2 필수 shadcn 컴포넌트 설치**

**설치 명령어**:
```bash
# 한 번에 설치
npx shadcn@latest add button card dialog input label select badge tabs avatar dropdown-menu
```

**개별 설치**:
```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add dialog
npx shadcn@latest add input
npx shadcn@latest add label
npx shadcn@latest add select
npx shadcn@latest add badge
npx shadcn@latest add tabs
npx shadcn@latest add avatar
npx shadcn@latest add dropdown-menu
```

**생성될 파일**:
- `src/components/ui/button.jsx`
- `src/components/ui/card.jsx`
- `src/components/ui/dialog.jsx`
- `src/components/ui/input.jsx`
- `src/components/ui/label.jsx`
- `src/components/ui/select.jsx`
- `src/components/ui/badge.jsx`
- `src/components/ui/tabs.jsx`
- `src/components/ui/avatar.jsx`
- `src/components/ui/dropdown-menu.jsx`

---

### **1.3 커스텀 파스텔 컬러 테마 설정**

**파일**: `src/index.css`

**추가할 CSS 변수**:
```css
@layer base {
  :root {
    /* 파스텔 블루 */
    --pastel-blue-50: 224 242 254;   /* #E0F2FE */
    --pastel-blue-100: 186 230 253;  /* #BAE6FD */
    --pastel-blue-200: 125 211 252;  /* #7DD3FC */

    /* 파스텔 핑크 */
    --pastel-pink-50: 252 231 243;   /* #FCE7F3 */
    --pastel-pink-100: 251 207 232;  /* #FBCFE8 */
    --pastel-pink-200: 251 182 206;  /* #FBB6CE */

    /* 파스텔 퍼플 */
    --pastel-purple-50: 243 232 255;  /* #F3E8FF */
    --pastel-purple-100: 233 213 255; /* #E9D5FF */

    /* 파스텔 그린 (추가) */
    --pastel-green-50: 220 252 231;   /* #DCFCE7 */
    --pastel-green-100: 187 247 208;  /* #BBF7D0 */

    /* 기본 컬러 오버라이드 */
    --background: 0 0% 100%;          /* White */
    --foreground: 222.2 84% 4.9%;

    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;

    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;

    --primary: 224 242 254;           /* Pastel Blue */
    --primary-foreground: 215 97% 22%;

    --secondary: 252 231 243;         /* Pastel Pink */
    --secondary-foreground: 222.2 47.4% 11.2%;

    --muted: 210 40% 96.1%;           /* Very Light Gray */
    --muted-foreground: 215.4 16.3% 46.9%;

    --accent: 243 232 255;            /* Pastel Purple */
    --accent-foreground: 222.2 47.4% 11.2%;

    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 224 242 254;

    --radius: 1rem;                   /* 더 둥근 모서리 */
  }
}
```

---

### **1.4 디자인 토큰 설정**

**파일**: `tailwind.config.js`

**추가 설정**:
```javascript
module.exports = {
  // ... 기존 설정
  theme: {
    extend: {
      borderRadius: {
        lg: "1rem",
        md: "0.75rem",
        sm: "0.5rem",
      },
      colors: {
        pastel: {
          blue: {
            50: 'hsl(var(--pastel-blue-50))',
            100: 'hsl(var(--pastel-blue-100))',
            200: 'hsl(var(--pastel-blue-200))',
          },
          pink: {
            50: 'hsl(var(--pastel-pink-50))',
            100: 'hsl(var(--pastel-pink-100))',
            200: 'hsl(var(--pastel-pink-200))',
          },
          purple: {
            50: 'hsl(var(--pastel-purple-50))',
            100: 'hsl(var(--pastel-purple-100))',
          },
          green: {
            50: 'hsl(var(--pastel-green-50))',
            100: 'hsl(var(--pastel-green-100))',
          },
        },
      },
    },
  },
}
```

---

## 🎯 **Step 1 완료 기준**

- [x] shadcn/ui 설치 완료
- [x] 필수 컴포넌트 설치 완료 (10개)
- [x] 파스텔 컬러 테마 적용 완료
- [x] 개발 서버 실행 및 기본 디자인 확인

**테스트 방법**:
```bash
npm run dev
```

1. 브라우저에서 로그인
2. 팀 목록이 새로운 디자인으로 표시되는지 확인
3. 버튼 스타일이 shadcn 디자인으로 변경되었는지 확인

---

## 📊 **전체 진행률**

**현재**: Step 2 완료 ✅
**완료**: 2/10 Steps (20%)
**예상 총 소요 시간**: 10-11시간

---

## 🔄 **업데이트 로그**

- **2025-10-21 10:23**: ✅ Step 2 완료 - 팀 관리 UI shadcn 개편 완료
  - MainApp 전면 개편 (Card, Button, Dialog, Badge, Avatar 적용)
  - 팀 카드 그리드 레이아웃 구현
  - 팀 생성 Dialog 구현
  - Tailwind v4 @theme 색상 시스템 수정 및 적용 성공
  - 파스텔 블루/핑크 테마 정상 작동 확인
- **2025-10-21 10:13**: ✅ Step 1 완료 - shadcn/ui 설치 및 파스텔 테마 적용 완료
  - shadcn/ui 초기화 완료
  - 10개 필수 컴포넌트 설치 (button, card, dialog, input, label, select, badge, tabs, avatar, dropdown-menu)
  - 파스텔 컬러 테마 적용 (white/pastel blue/pastel pink)
  - Tailwind CSS v4 + tailwindcss-animate 연동 완료
  - 개발 서버 정상 실행 확인 (http://localhost:5177)
- **2025-10-21**: 계획 수립 및 Step 1 시작
