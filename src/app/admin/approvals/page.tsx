'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getUserPermissions, getPendingUsers, approveUser, rejectUser } from '@/lib/auth';
import { Permission, UserRole, UserStatus } from '@/lib/types';
import { useRouter } from 'next/navigation';

type PendingUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  displayName?: string;
  createdAt?: any;
};

const ROLE_LABELS = {
  admin: '관리자',
  manager: '매니저',
  user: '일반 사용자',
};

export default function ApprovalsPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission | null>(null);
  const [loading, setLoading] = useState(true);
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [processingUser, setProcessingUser] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

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

  // 승인 대기 사용자 로드
  useEffect(() => {
    if (!permissions?.canManageUsers) return;

    const loadPendingUsers = async () => {
      const users = await getPendingUsers();
      setPendingUsers(users as PendingUser[]);
    };

    loadPendingUsers();
    
    // 실시간 업데이트를 위한 인터벌
    const interval = setInterval(loadPendingUsers, 5000);
    return () => clearInterval(interval);
  }, [permissions]);

  // 사용자 승인
  const handleApprove = async (userEmail: string, role: UserRole) => {
    if (!user) return;
    
    setProcessingUser(userEmail);
    try {
      await approveUser(userEmail, user.email!, role);
      
      // 승인 완료 메시지
      alert(`사용자 승인이 완료되었습니다!

📧 이메일: ${userEmail}
👤 역할: ${ROLE_LABELS[role]}

⚠️ 이메일 알림 기능은 아직 구현되지 않았습니다.
사용자에게 직접 승인 완료를 알려주세요.`);
      
      // 목록 새로고침
      const users = await getPendingUsers();
      setPendingUsers(users as PendingUser[]);
    } catch (error) {
      console.error('Error approving user:', error);
      alert('사용자 승인 중 오류가 발생했습니다.');
    } finally {
      setProcessingUser(null);
    }
  };

  // 사용자 거부
  const handleReject = async (userEmail: string) => {
    if (!user?.email || !rejectionReason.trim()) {
      alert('거부 사유를 입력해주세요.');
      return;
    }

    setProcessingUser(userEmail);
    try {
      await rejectUser(userEmail, user.email, rejectionReason);
      
      // 거부 완료 메시지
      alert(`사용자 거부가 완료되었습니다!

📧 이메일: ${userEmail}
❌ 사유: ${rejectionReason}

⚠️ 이메일 알림 기능은 아직 구현되지 않았습니다.
사용자에게 직접 거부 사유를 알려주세요.`);
      
      setRejectionReason('');
      setShowRejectModal(null);
      // 목록 새로고침
      const users = await getPendingUsers();
      setPendingUsers(users as PendingUser[]);
    } catch (error) {
      console.error('Error rejecting user:', error);
      alert('거부 중 오류가 발생했습니다.');
    } finally {
      setProcessingUser(null);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    return timestamp.toDate ? timestamp.toDate().toLocaleString() : '-';
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
          <h1 className="text-2xl font-bold">승인 대기 사용자</h1>
          <p className="text-sm text-gray-600">회원가입 신청을 승인하거나 거부합니다.</p>
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
      <div className="bg-white p-4 rounded-2xl border shadow-sm mb-6">
        <div className="text-2xl font-bold text-orange-600">{pendingUsers.length}</div>
        <div className="text-sm text-gray-600">승인 대기 중인 사용자</div>
      </div>

      {/* 승인 대기 사용자 목록 */}
      {pendingUsers.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border shadow-sm text-center">
          <div className="text-gray-500">
            <div className="text-2xl mb-2">✅</div>
            <div>승인 대기 중인 사용자가 없습니다.</div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
          <div className="p-6 border-b">
            <h3 className="font-semibold">승인 대기 목록</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-4">이메일</th>
                  <th className="text-left p-4">이름</th>
                  <th className="text-left p-4">신청일</th>
                  <th className="text-left p-4">역할 선택</th>
                  <th className="text-left p-4">작업</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map((pendingUser) => (
                  <tr key={pendingUser.id} className="border-t">
                    <td className="p-4">
                      <div className="font-medium">{pendingUser.email}</div>
                    </td>
                    <td className="p-4">
                      {pendingUser.displayName || '-'}
                    </td>
                    <td className="p-4 text-gray-600">
                      {formatDate(pendingUser.createdAt)}
                    </td>
                    <td className="p-4">
                      <select
                        id={`role-${pendingUser.id}`}
                        className="p-2 border rounded-lg text-sm"
                        defaultValue="user"
                      >
                        <option value="user">일반 사용자</option>
                        <option value="manager">매니저</option>
                        <option value="admin">관리자</option>
                      </select>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const roleSelect = document.getElementById(`role-${pendingUser.id}`) as HTMLSelectElement;
                            const selectedRole = roleSelect.value as UserRole;
                            handleApprove(pendingUser.email, selectedRole);
                          }}
                          disabled={processingUser === pendingUser.email}
                          className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 disabled:bg-gray-400"
                        >
                          {processingUser === pendingUser.email ? '처리 중...' : '승인'}
                        </button>
                        <button
                          onClick={() => setShowRejectModal(pendingUser.email)}
                          disabled={processingUser === pendingUser.email}
                          className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 disabled:bg-gray-400"
                        >
                          거부
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 거부 사유 모달 */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-2xl max-w-md w-full mx-4">
            <h3 className="font-semibold mb-4">거부 사유 입력</h3>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="거부 사유를 입력하세요..."
              className="w-full p-3 border rounded-lg mb-4 h-24 resize-none"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={!rejectionReason.trim()}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:bg-gray-400"
              >
                거부
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 안내사항 */}
      <div className="mt-6 p-4 bg-blue-50 rounded-2xl border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-2">📋 승인 관리 안내</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• 승인 시 사용자에게 이메일 알림이 발송됩니다.</li>
          <li>• 거부 시 사유와 함께 이메일 알림이 발송됩니다.</li>
          <li>• 관리자 권한 부여 시 신중하게 결정하세요.</li>
          <li>• 승인/거부 후에는 되돌릴 수 없습니다.</li>
        </ul>
      </div>

      {/* 이메일 알림 안내 */}
      <div className="mt-4 p-4 bg-yellow-50 rounded-2xl border border-yellow-200">
        <h3 className="font-semibold text-yellow-800 mb-2">⚠️ 이메일 알림 안내</h3>
        <p className="text-sm text-yellow-700">
          현재 이메일 알림 기능은 구현되지 않았습니다. 승인/거부 후 사용자에게 직접 알려주세요.
        </p>
      </div>
    </div>
  );
}
