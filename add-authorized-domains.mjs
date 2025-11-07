import { execSync } from 'child_process';

// Firebase 프로젝트 정보
const PROJECT_ID = 'baseball-firebase-d4d8d';

// 추가할 도메인 목록
const DOMAINS_TO_ADD = [
  'baseball-firebase.vercel.app',
  'baseball-firebase-zoomwk432-5168s-projects.vercel.app'
];

async function getAccessToken() {
  try {
    const token = execSync('firebase login:ci --no-localhost 2>&1', {
      encoding: 'utf8',
      stdio: 'pipe'
    });
    return token.trim();
  } catch (error) {
    // login:ci가 실패하면 대체 방법 시도
    try {
      // Firebase CLI의 저장된 토큰 사용
      const token = execSync('cat ~/.config/firebase/tool_tokens.json 2>&1 | grep -o \'"token":"[^"]*"\' | cut -d\'"\' -f4 | head -1', {
        encoding: 'utf8',
        shell: '/bin/bash'
      });
      return token.trim();
    } catch (e) {
      throw new Error('Firebase 액세스 토큰을 얻을 수 없습니다. Firebase Console에서 수동으로 추가해주세요.');
    }
  }
}

async function addAuthorizedDomains() {
  try {
    console.log('🔍 Firebase 액세스 토큰 확인 중...');

    // Google Cloud API를 통해 현재 설정 가져오기
    const getConfigCommand = `curl -s -X GET \
      "https://identitytoolkit.googleapis.com/v2/projects/${PROJECT_ID}/config" \
      -H "Authorization: Bearer $(gcloud auth print-access-token)"`;

    console.log('\n⚠️ 이 스크립트는 Google Cloud SDK(gcloud)가 필요합니다.');
    console.log('\n대신 Firebase Console에서 수동으로 추가하는 것을 권장합니다:');
    console.log('1. https://console.firebase.google.com/project/baseball-firebase-d4d8d/authentication/settings');
    console.log('2. "승인된 도메인" 섹션에서 "도메인 추가" 클릭');
    console.log('3. 다음 도메인들을 추가:');
    DOMAINS_TO_ADD.forEach(domain => {
      console.log(`   - ${domain}`);
    });

  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

addAuthorizedDomains();
