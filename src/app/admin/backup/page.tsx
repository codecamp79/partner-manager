'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { useRouter } from 'next/navigation';
import { getUserPermissions } from '@/lib/auth';
import { Permission } from '@/lib/types';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function BackupPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissions, setPermissions] = useState<Permission | null>(null);
  const [backupLoading, setBackupLoading] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
      if (!u) {
        router.replace('/login');
        return;
      }

      try {
        const userPermissions = await getUserPermissions(u.email!);
        setPermissions(userPermissions);
        
        if (!userPermissions.canViewAdmin) {
          router.replace('/');
        }
      } catch (error) {
        console.error('Error loading user permissions:', error);
        router.replace('/');
      }
    });
    return () => unsub();
  }, [router]);

  const downloadBackup = async (format: 'json' | 'csv') => {
    if (!user) return;
    
    setBackupLoading(true);
    try {
      const partnersQuery = query(collection(db, 'partners'), where('archived', '==', false));
      const partnersSnapshot = await getDocs(partnersQuery);
      const partners: any[] = [];
      partnersSnapshot.forEach((doc) => {
        const data = doc.data();
        partners.push({ id: doc.id, ...data });
      });

      const evaluationsSnapshot = await getDocs(collection(db, 'evaluations'));
      const evaluations: any[] = [];
      evaluationsSnapshot.forEach((doc) => {
        const data = doc.data();
        evaluations.push({ id: doc.id, ...data });
      });

      const backupData = {
        partners,
        evaluations,
        exportedAt: new Date().toISOString(),
        exportedBy: user.email,
      };

      if (format === 'json') {
        const jsonString = JSON.stringify(backupData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `partner-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const csvContent = generateCSV(backupData);
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `partner-backup-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      alert(`${format.toUpperCase()} 형식으로 백업이 완료되었습니다.`);
    } catch (error) {
      console.error('Backup error:', error);
      alert('백업 중 오류가 발생했습니다.');
    } finally {
      setBackupLoading(false);
    }
  };

  const generateCSV = (data: any) => {
    const lines: string[] = [];
    
    lines.push('=== PARTNERS ===');
    if (data.partners.length > 0) {
      const partnerHeaders = Object.keys(data.partners[0]).join(',');
      lines.push(partnerHeaders);
      
      data.partners.forEach((partner: any) => {
        const values = Object.values(partner).map(v => `"${v}"`);
        lines.push(values.join(','));
      });
    }
    
    lines.push('');
    lines.push('=== EVALUATIONS ===');
    if (data.evaluations.length > 0) {
      const evaluationHeaders = Object.keys(data.evaluations[0]).join(',');
      lines.push(evaluationHeaders);
      
      data.evaluations.forEach((evaluation: any) => {
        const values = Object.values(evaluation).map(v => `"${v}"`);
        lines.push(values.join(','));
      });
    }
    
    lines.push('');
    lines.push(`Exported at: ${data.exportedAt}`);
    lines.push(`Exported by: ${data.exportedBy}`);
    
    return lines.join('\n');
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">로딩…</div>;
  }

        if (!user || !permissions?.canViewAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">데이터 백업</h1>
            <p className="text-sm text-gray-600">파트너 및 평가 데이터 백업</p>
          </div>
          <button
            onClick={() => router.back()}
            className="rounded-xl border px-4 py-2 hover:shadow"
          >
            뒤로 가기
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl border shadow-sm">
          <h2 className="text-lg font-semibold mb-4">백업 다운로드</h2>
          <p className="text-gray-600 mb-6">
            현재 모든 파트너 및 평가 데이터를 다운로드할 수 있습니다.
          </p>
          
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <h3 className="font-medium mb-2">백업 형식 선택</h3>
              <p className="text-sm text-gray-600 mb-3">
                원하는 형식을 선택하여 데이터를 다운로드하세요.
              </p>
              <div className="flex gap-3">
                <button
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => downloadBackup('json')}
                  disabled={backupLoading}
                >
                  {backupLoading ? '백업 중...' : 'JSON 다운로드'}
                </button>
                <button
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={() => downloadBackup('csv')}
                  disabled={backupLoading}
                >
                  {backupLoading ? '백업 중...' : 'CSV 다운로드'}
                </button>
              </div>
              <div className="mt-3 text-sm text-gray-500">
                <p><strong>JSON:</strong> 구조화된 데이터로, 프로그래밍적으로 처리하기 용이합니다.</p>
                <p><strong>CSV:</strong> 스프레드시트 프로그램에서 열어볼 수 있는 표 형태의 데이터입니다.</p>
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-yellow-50">
              <h3 className="font-medium mb-2 text-yellow-800">주의사항</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• 백업 파일에는 민감한 정보가 포함될 수 있으므로 안전하게 보관하세요.</li>
                <li>• CSV 파일은 Excel이나 Google Sheets에서 열어볼 수 있습니다.</li>
                <li>• JSON 파일은 프로그래밍 도구나 텍스트 에디터에서 확인할 수 있습니다.</li>
                <li>• 정기적으로 백업을 수행하여 데이터 손실을 방지하세요.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
