'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { getUserPermissions } from '@/lib/auth';
import { Permission } from '@/lib/types';
import { useRouter } from 'next/navigation';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [permissions, setPermissions] = useState<Permission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const userPermissions = await getUserPermissions(u.email!);
          setPermissions(userPermissions);
          
          // 관리자 권한이 없으면 대시보드로 리다이렉트
          if (!userPermissions.canViewAdmin) {
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

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">로딩…</div>;
  }

  if (!permissions?.canViewAdmin) {
    return <div className="min-h-screen flex items-center justify-center">접근 권한이 없습니다.</div>;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">관리자 페이지</h1>
          <p className="text-sm text-gray-600">시스템 관리 및 설정</p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/"
            className="rounded-xl border px-4 py-2 hover:shadow"
          >
            대시보드
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* 데이터 관리 */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="font-semibold mb-4">데이터 관리</h3>
          <div className="space-y-3">
            <Link
              href="/admin/export"
              className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="font-medium">데이터 내보내기</div>
              <div className="text-sm text-gray-600">전체 데이터 CSV/Excel 내보내기</div>
            </Link>
            <button
              onClick={() => alert('준비중입니다.')}
              className="block w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="font-medium">백업 & 복원</div>
              <div className="text-sm text-gray-600">데이터 백업 및 복원</div>
            </button>
          </div>
        </div>

        {/* 사용자 관리 */}
        {permissions.canManageUsers && (
          <div className="bg-white p-6 rounded-2xl border shadow-sm">
            <h3 className="font-semibold mb-4">사용자 관리</h3>
            <div className="space-y-3">
              <Link
                href="/admin/approvals"
                className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="font-medium">승인 대기</div>
                <div className="text-sm text-gray-600">회원가입 승인/거부</div>
              </Link>
              <Link
                href="/admin/users"
                className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="font-medium">사용자 목록</div>
                <div className="text-sm text-gray-600">사용자 계정 및 권한 관리</div>
              </Link>
              <Link
                href="/admin/roles"
                className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="font-medium">권한 설정</div>
                <div className="text-sm text-gray-600">역할별 권한 관리</div>
              </Link>
            </div>
          </div>
        )}

        {/* 시스템 설정 */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="font-semibold mb-4">시스템 설정</h3>
          <div className="space-y-3">
            <Link
              href="/admin/criteria"
              className="block p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="font-medium">평가 기준 관리</div>
              <div className="text-sm text-gray-600">평가 문항 및 점수 기준</div>
            </Link>
            <button
              onClick={() => alert('준비중입니다.')}
              className="block w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="font-medium">시스템 설정</div>
              <div className="text-sm text-gray-600">기본 설정 및 알림</div>
            </button>
          </div>
        </div>

        {/* 모니터링 */}
        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h3 className="font-semibold mb-4">모니터링</h3>
          <div className="space-y-3">
            <button
              onClick={() => alert('준비중입니다.')}
              className="block w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="font-medium">시스템 로그</div>
              <div className="text-sm text-gray-600">사용자 활동 및 오류 로그</div>
            </button>
            <button
              onClick={() => alert('준비중입니다.')}
              className="block w-full text-left p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="font-medium">사용 통계</div>
              <div className="text-sm text-gray-600">시스템 사용량 분석</div>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-2xl">
        <h3 className="font-semibold mb-2">현재 사용자 정보</h3>
        <div className="text-sm text-gray-600">
          <div>이메일: {user?.email}</div>
          <div>권한: {permissions.canManageUsers ? '관리자' : permissions.canExportData ? '매니저' : '일반 사용자'}</div>
        </div>
      </div>
    </div>
  );
} 