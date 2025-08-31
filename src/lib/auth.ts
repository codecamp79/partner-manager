import { db } from './firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp, query, where, collection, getDocs } from 'firebase/firestore';
import { User, UserRole, UserStatus, getPermissions, Permission } from './types';

// 사용자 정보 가져오기
export async function getUserInfo(email: string): Promise<User | null> {
  try {
    const userDoc = await getDoc(doc(db, 'users', email));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() } as User;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user info:', error);
    return null;
  }
}

// 새 사용자 생성 (기본 상태: pending)
export async function createUser(email: string, role: UserRole = 'user', displayName?: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', email);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      const userData: any = {
        email,
        role,
        status: 'pending' as UserStatus,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      
      // undefined가 아닌 값만 추가
      if (displayName !== undefined) {
        userData.displayName = displayName;
      }
      
      await setDoc(userRef, userData);
    }
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

// 사용자 역할 업데이트
export async function updateUserRole(email: string, role: UserRole): Promise<void> {
  try {
    const userRef = doc(db, 'users', email);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      await updateDoc(userRef, {
        role,
        updatedAt: serverTimestamp(),
      });
    } else {
      // 사용자가 존재하지 않으면 새로 생성
      await createUser(email, role);
    }
  } catch (error) {
    console.error('Error updating user role:', error);
    throw error;
  }
}

// 사용자 로그인 시간 업데이트
export async function updateLastLogin(email: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', email);
    const userDoc = await getDoc(userRef);
    
    if (userDoc.exists()) {
      // 사용자가 존재하면 로그인 시간 업데이트
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
      });
    } else {
      // 사용자가 존재하지 않으면 새로 생성 (기본 역할: user)
      await createUser(email, 'user');
    }
  } catch (error) {
    console.error('Error updating last login:', error);
  }
}

// 사용자 권한 가져오기
export async function getUserPermissions(email: string): Promise<Permission> {
  const user = await getUserInfo(email);
  if (!user) {
    // 사용자 정보가 없으면 새로 생성하고 기본 user 권한 반환
    try {
      await createUser(email, 'user');
      return getPermissions('user');
    } catch (error) {
      console.error('Error creating new user:', error);
      return getPermissions('user');
    }
  }
  return getPermissions(user.role);
}

// 권한 체크 함수들
export function hasPermission(permissions: Permission, permission: keyof Permission): boolean {
  return permissions[permission] || false;
}

// 사용자 역할 확인
export function isAdmin(role: UserRole): boolean {
  return role === 'admin';
}

export function isManager(role: UserRole): boolean {
  return role === 'manager' || role === 'admin';
}

export function isUser(role: UserRole): boolean {
  return role === 'user' || role === 'manager' || role === 'admin';
}

// 사용자 승인
export async function approveUser(email: string, approvedBy: string, role: UserRole = 'user'): Promise<void> {
  const userRef = doc(db, 'users', email);
  
  await updateDoc(userRef, {
    status: 'approved',
    role: role,
    approvedBy: approvedBy,
    approvedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // 이메일 알림 (향후 구현 예정)
  console.log(`사용자 승인 완료: ${email}, 역할: ${role}, 승인자: ${approvedBy}`);
  
  // TODO: 이메일 알림 기능 구현
  // - Firebase Functions 사용
  // - 또는 EmailJS, SendGrid 등의 이메일 서비스 연동
  // - 또는 서버리스 이메일 서비스 사용
}

// 사용자 거부
export async function rejectUser(email: string, rejectedBy: string, reason: string): Promise<void> {
  const userRef = doc(db, 'users', email);
  
  await updateDoc(userRef, {
    status: 'rejected',
    rejectionReason: reason,
    updatedAt: serverTimestamp(),
  });

  // 이메일 알림 (향후 구현 예정)
  console.log(`사용자 거부 완료: ${email}, 사유: ${reason}, 거부자: ${rejectedBy}`);
  
  // TODO: 이메일 알림 기능 구현
}

// 승인 대기 중인 사용자 목록 가져오기
export async function getPendingUsers(): Promise<User[]> {
  try {
    const usersQuery = query(collection(db, 'users'), where('status', '==', 'pending'));
    const snapshot = await getDocs(usersQuery);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
  } catch (error) {
    console.error('Error getting pending users:', error);
    return [];
  }
}

// 사용자 상태 확인
export function isUserApproved(user: User | null): boolean {
  return user?.status === 'approved';
}

export function isUserPending(user: User | null): boolean {
  return user?.status === 'pending';
}

export function isUserRejected(user: User | null): boolean {
  return user?.status === 'rejected';
}

// 사용자 삭제 (소프트 삭제 - 상태만 변경)
export async function deleteUser(email: string, deletedBy: string): Promise<void> {
  try {
    // Firestore에서 사용자 정보 삭제 (상태만 변경)
    const userRef = doc(db, 'users', email);
    await updateDoc(userRef, {
      status: 'deleted' as UserStatus,
      deletedBy: deletedBy,
      deletedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // 이메일 알림 (향후 구현 예정)
    console.log(`사용자 삭제 완료: ${email}, 삭제자: ${deletedBy}`);
    
    // TODO: 이메일 알림 기능 구현
    // - Firebase Functions 사용
    // - 또는 EmailJS, SendGrid 등의 이메일 서비스 연동
    // - 또는 서버리스 이메일 서비스 사용
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
}

// 완전 삭제 (Firestore 문서 완전 제거)
export async function permanentlyDeleteUser(email: string, deletedBy: string): Promise<void> {
  try {
    // Firestore에서 사용자 문서 완전 삭제
    const userRef = doc(db, 'users', email);
    await deleteDoc(userRef);

    // 이메일 알림 (향후 구현 예정)
    console.log(`사용자 완전 삭제 완료: ${email}, 삭제자: ${deletedBy}`);
    
    // TODO: 이메일 알림 기능 구현
  } catch (error) {
    console.error('Error permanently deleting user:', error);
    throw error;
  }
}
