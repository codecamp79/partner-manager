'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getUserInfo, isUserApproved, isUserPending, isUserRejected } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      console.log('로그인 시도:', email);
      
      // Firebase Auth 로그인
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Firebase Auth 로그인 성공:', userCredential.user.email);
      
      // 사용자 승인 상태 확인
      const userInfo = await getUserInfo(email);
      console.log('사용자 정보:', userInfo);
      
      if (!userInfo) {
        // 사용자 정보가 없으면 기본 user 권한으로 생성
        console.log('사용자 정보가 없어 기본 권한으로 생성');
        router.replace('/');
        return;
      }
      
      if (isUserPending(userInfo)) {
        console.log('사용자 승인 대기 중');
        await auth.signOut();
        setError('관리자 승인 대기 중입니다. 승인 완료 후 로그인이 가능합니다.');
        return;
      }
      
      if (isUserRejected(userInfo)) {
        console.log('사용자 승인 거부됨');
        await auth.signOut();
        setError(`회원가입이 거부되었습니다. 사유: ${userInfo.rejectionReason || '없음'}`);
        return;
      }
      
      if (isUserApproved(userInfo)) {
        console.log('사용자 승인됨, 홈으로 이동');
        router.replace('/'); // 승인된 사용자는 홈으로 이동
        return;
      }
      
      // 기타 상태는 로그인 거부
      console.log('기타 상태로 로그인 거부');
      await auth.signOut();
      setError('로그인이 거부되었습니다. 관리자에게 문의하세요.');
      
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('등록되지 않은 이메일입니다. 회원가입을 먼저 진행해주세요.');
      } else if (err.code === 'auth/wrong-password') {
        setError('비밀번호가 올바르지 않습니다.');
      } else if (err.code === 'auth/invalid-email') {
        setError('유효하지 않은 이메일입니다.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('이메일 또는 비밀번호가 올바르지 않습니다. 회원가입을 먼저 진행해주세요.');
      } else {
        setError(`로그인 중 오류가 발생했습니다. (${err.code})`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-4">로그인</h1>
        <div className="text-center mb-4">
          <Link href="/signup" className="text-sm text-blue-600 hover:text-blue-500">
            계정이 없으신가요? 회원가입
          </Link>
        </div>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">이메일</label>
            <input
              type="email"
              className="w-full border rounded-lg px-3 py-2"
              placeholder="admin@partner.local"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">비밀번호</label>
            <input
              type="password"
              className="w-full border rounded-lg px-3 py-2"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl px-4 py-2 border hover:shadow disabled:opacity-60"
          >
            {loading ? '로그인 중…' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  );
}