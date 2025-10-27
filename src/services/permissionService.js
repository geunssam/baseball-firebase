import {
  collection,
  doc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../config/firebase';

class PermissionService {
  constructor(userId) {
    this.userId = userId;
    this.userRef = doc(db, 'users', userId);
  }

  // ============================================
  // 권한 요청 (다른 교사에게 접근 권한 요청)
  // ============================================

  async requestPermission(ownerEmail, accessLevel = 'read') {
    try {
      // 1. 이메일로 소유자 찾기
      const usersRef = collection(db, 'users');
      const q = query(
        collection(usersRef, 'profile'),
        where('email', '==', ownerEmail)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        throw new Error('해당 이메일의 교사를 찾을 수 없습니다.');
      }

      const ownerId = snapshot.docs[0].id;

      // 2. 이미 권한이 있는지 확인
      const sharedAccessRef = doc(this.userRef, 'sharedAccess', ownerId);
      const existingAccess = await getDoc(sharedAccessRef);

      if (existingAccess.exists()) {
        throw new Error('이미 권한이 부여되었습니다.');
      }

      // 3. 이미 요청이 있는지 확인
      const permissionsRef = collection(db, 'permissions');
      const existingReqQuery = query(
        permissionsRef,
        where('requesterId', '==', this.userId),
        where('ownerId', '==', ownerId),
        where('status', '==', 'pending')
      );
      const existingReq = await getDocs(existingReqQuery);

      if (!existingReq.empty) {
        throw new Error('이미 권한 요청이 진행 중입니다.');
      }

      // 4. 권한 요청 생성
      const permissionRef = doc(permissionsRef);
      await setDoc(permissionRef, {
        id: permissionRef.id,
        requesterId: this.userId,
        ownerId,
        accessLevel, // 'read' or 'write'
        status: 'pending', // 'pending', 'approved', 'rejected'
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('✅ 권한 요청 완료:', permissionRef.id);
      return permissionRef.id;
    } catch (error) {
      console.error('❌ 권한 요청 실패:', error);
      throw error;
    }
  }

  // ============================================
  // 내가 받은 권한 요청 목록
  // ============================================

  async getIncomingRequests() {
    try {
      const permissionsRef = collection(db, 'permissions');
      const q = query(
        permissionsRef,
        where('ownerId', '==', this.userId),
        where('status', '==', 'pending')
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ 권한 요청 목록 조회 실패:', error);
      throw error;
    }
  }

  // ============================================
  // 내가 보낸 권한 요청 목록
  // ============================================

  async getOutgoingRequests() {
    try {
      const permissionsRef = collection(db, 'permissions');
      const q = query(
        permissionsRef,
        where('requesterId', '==', this.userId)
      );
      const snapshot = await getDocs(q);

      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ 권한 요청 목록 조회 실패:', error);
      throw error;
    }
  }

  // ============================================
  // 권한 요청 승인
  // ============================================

  async approvePermission(permissionId) {
    try {
      const permissionRef = doc(db, 'permissions', permissionId);
      const permissionDoc = await getDoc(permissionRef);

      if (!permissionDoc.exists()) {
        throw new Error('권한 요청을 찾을 수 없습니다.');
      }

      const permission = permissionDoc.data();

      // 권한 부여자가 본인인지 확인
      if (permission.ownerId !== this.userId) {
        throw new Error('권한이 없습니다.');
      }

      // 1. 요청자의 sharedAccess에 추가
      const requesterRef = doc(db, 'users', permission.requesterId);
      const requesterAccessRef = doc(requesterRef, 'sharedAccess', this.userId);
      await setDoc(requesterAccessRef, {
        ownerId: this.userId,
        accessLevel: permission.accessLevel,
        canWrite: permission.accessLevel === 'write',
        grantedAt: serverTimestamp()
      });

      // 2. 내 sharedWith에 추가
      const mySharedWithRef = doc(this.userRef, 'sharedWith', permission.requesterId);
      await setDoc(mySharedWithRef, {
        userId: permission.requesterId,
        accessLevel: permission.accessLevel,
        canWrite: permission.accessLevel === 'write',
        grantedAt: serverTimestamp()
      });

      // 3. 권한 요청 상태 업데이트
      await updateDoc(permissionRef, {
        status: 'approved',
        updatedAt: serverTimestamp()
      });

      console.log('✅ 권한 승인 완료:', permissionId);
    } catch (error) {
      console.error('❌ 권한 승인 실패:', error);
      throw error;
    }
  }

  // ============================================
  // 권한 요청 거부
  // ============================================

  async rejectPermission(permissionId) {
    try {
      const permissionRef = doc(db, 'permissions', permissionId);
      const permissionDoc = await getDoc(permissionRef);

      if (!permissionDoc.exists()) {
        throw new Error('권한 요청을 찾을 수 없습니다.');
      }

      const permission = permissionDoc.data();

      if (permission.ownerId !== this.userId) {
        throw new Error('권한이 없습니다.');
      }

      await updateDoc(permissionRef, {
        status: 'rejected',
        updatedAt: serverTimestamp()
      });

      console.log('✅ 권한 거부 완료:', permissionId);
    } catch (error) {
      console.error('❌ 권한 거부 실패:', error);
      throw error;
    }
  }

  // ============================================
  // 권한 취소 (내가 준 권한 철회)
  // ============================================

  async revokePermission(grantedUserId) {
    try {
      // 1. 상대방의 sharedAccess에서 삭제
      const grantedUserRef = doc(db, 'users', grantedUserId);
      const grantedUserAccessRef = doc(grantedUserRef, 'sharedAccess', this.userId);
      await deleteDoc(grantedUserAccessRef);

      // 2. 내 sharedWith에서 삭제
      const mySharedWithRef = doc(this.userRef, 'sharedWith', grantedUserId);
      await deleteDoc(mySharedWithRef);

      console.log('✅ 권한 취소 완료:', grantedUserId);
    } catch (error) {
      console.error('❌ 권한 취소 실패:', error);
      throw error;
    }
  }

  // ============================================
  // 내가 공유한 교사 목록
  // ============================================

  async getSharedWithList() {
    try {
      const sharedWithRef = collection(this.userRef, 'sharedWith');
      const snapshot = await getDocs(sharedWithRef);

      return snapshot.docs.map(doc => ({
        userId: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ 공유 목록 조회 실패:', error);
      throw error;
    }
  }

  // ============================================
  // 내가 접근 가능한 다른 교사 데이터 목록
  // ============================================

  async getSharedAccessList() {
    try {
      const sharedAccessRef = collection(this.userRef, 'sharedAccess');
      const snapshot = await getDocs(sharedAccessRef);

      return snapshot.docs.map(doc => ({
        ownerId: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('❌ 접근 가능 목록 조회 실패:', error);
      throw error;
    }
  }
}

export default PermissionService;
