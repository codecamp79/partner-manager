'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getUserPermissions } from '@/lib/auth';
import { Permission, UserRole, User as UserType } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, serverTimestamp } from 'firebase/firestore';

const ROLE_LABELS = {
  admin: '관리자',
  manager: '매니저',
  user: '일반 사용자',
};

const STATUS_LABELS = {
  pending: '승인 대기',
  approved: '승인됨',
  rejected: '거부됨',
};

export default function UsersPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserType[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userPermissions = await getUserPermissions(u.email!);
          setPermissions(userPermissions);
          
          if (!userPermissions.canManageUsers) {
            router.replace('/');
            return;
          }
        } catch (error) {
          console.error('Error loading user permissions:', error);
          router.replace('/');
          return;
        }
      } else {
        router.replace('/login');
        return;
      }
      setLoading(false);
    });
    return () => unsub();
  }, [router]);

  // 사용자 목록 로드
  useEffect(() => {
    if (!permissions?.canManageUsers) return;

    const loadUsers = async () => {
      try {
        const usersQuery = await getDocs(collection(db, 'users'));
        const usersList: UserType[] = [];
        
        usersQuery.forEach((doc) => {
          const data = doc.data() as any;
          usersList.push({
            id: doc.id,
            email: data.email,
            role: data.role || 'user',
            status: data.status || 'pending',
            displayName: data.displayName,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            lastLoginAt: data.lastLoginAt,
            approvedBy: data.approvedBy,
            approvedAt: data.approvedAt,
            rejectionReason: data.rejectionReason,
          });
        });
        
        setUsers(usersList);
      } catch (error) {
        console.error('Error loading users:', error);
      } finally {
        setUsersLoading(false);
      }
    };

    loadUsers();
  }, [permissions]);

  const updateUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        role: newRole,
        updatedAt: serverTimestamp(),
      });
      
      // 로컬 상태 업데이트
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, role: newRole } : u
      ));
    } catch (error) {
      console.error('Error updating user role:', error);
      alert('역할 변경 중 오류가 발생했습니다.');
    }
  };

  const updateUserStatus = async (userId: string, newStatus: 'approved' | 'rejected', rejectionReason?: string) => {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        status: newStatus,
        approvedBy: user?.email,
        approvedAt: serverTimestamp(),
        rejectionReason: rejectionReason || undefined,
        updatedAt: serverTimestamp(),
      });
      
      // 로컬 상태 업데이트
      setUsers(prev => prev.map(u => 
        u.id === userId ? { 
          ...u, 
          status: newStatus, 
          approvedBy: user?.email || undefined,
          rejectionReason: rejectionReason || undefined,
        } : u
      ));
    } catch (error) {
      console.error('Error updating user status:', error);
      alert('상태 변경 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">로딩…</div>;
  }

  if (!permissions?.canManageUsers) {
    return <div className="min-h-screen flex items-center justify-center">접근 권한이 없습니다.</div>;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">사용자 관리</h1>
          <p className="text-sm text-gray-600">등록된 사용자들의 계정 및 권한을 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin"
            className="rounded-xl border px-4 py-2 hover:shadow"
          >
            관리자 메인
          </Link>
        </div>
      </div>

            {/* 통계 */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
          <div className="text-2xl font-bold text-blue-600">
            {users.length}
          </div>
          <div className="text-sm text-gray-600">총 사용자</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
          <div className="text-2xl font-bold text-green-600">
            {users.filter(u => u.status === 'approved').length}
          </div>
          <div className="text-sm text-gray-600">승인된 사용자</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
          <div className="text-2xl font-bold text-yellow-600">
            {users.filter(u => u.status === 'pending').length}
          </div>
          <div className="text-sm text-gray-600">승인 대기</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border shadow-sm">
          <div className="text-2xl font-bold text-red-600">
            {users.filter(u => u.status === 'rejected').length}
          </div>
          <div className="text-sm text-gray-600">거부된 사용자</div>
        </div>
      </div>

      {usersLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">사용자 목록 로딩 중...</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    사용자 정보
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    역할
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    등록일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    마지막 로그인
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((userItem) => (
                  <tr key={userItem.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {userItem.displayName || userItem.email.split('@')[0] || '사용자'}
                        </div>
                        <div className="text-sm text-gray-500">{userItem.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        userItem.status === 'approved' ? 'bg-green-100 text-green-800' :
                        userItem.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {STATUS_LABELS[userItem.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={userItem.role}
                        onChange={(e) => updateUserRole(userItem.id, e.target.value as UserRole)}
                        className="text-sm border rounded px-2 py-1"
                      >
                        <option value="user">일반 사용자</option>
                        <option value="manager">매니저</option>
                        <option value="admin">관리자</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userItem.createdAt ? userItem.createdAt.toDate().toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {userItem.lastLoginAt ? userItem.lastLoginAt.toDate().toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {userItem.status === 'pending' && (
                        <div className="space-y-1">
                          <button
                            onClick={() => updateUserStatus(userItem.id, 'approved')}
                            className="text-green-600 hover:text-green-900 mr-2"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => {
                              const reason = prompt('거부 사유를 입력하세요:');
                              if (reason !== null) {
                                updateUserStatus(userItem.id, 'rejected', reason);
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            거부
                          </button>
                        </div>
                      )}
                      {userItem.status === 'rejected' && userItem.rejectionReason && (
                        <div className="text-xs text-red-600">
                          사유: {userItem.rejectionReason}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {users.length === 0 && !usersLoading && (
        <div className="text-center py-8 text-gray-500">
          등록된 사용자가 없습니다.
        </div>
      )}
    </div>
  );
}
