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
