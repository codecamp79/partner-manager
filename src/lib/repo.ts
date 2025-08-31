// src/lib/repo.ts
import { db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import type { Partner } from '@/lib/types';

const COL_PARTNERS = 'partners';

// 파트너 생성 (옵션값이 비어 있으면 Firestore에 넣지 않도록 처리)
export async function createPartner(
  input: Omit<Partner, 'id' | 'createdAt' | 'updatedAt' | 'archived'>
) {
  const payload: Record<string, any> = {
    ...input,
    archived: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  // Firestore는 undefined를 허용하지 않음 → undefined 키는 삭제
  Object.keys(payload).forEach((k) => {
    if (payload[k] === undefined) delete payload[k];
  });

  const docRef = await addDoc(collection(db, COL_PARTNERS), payload);
  return docRef.id;
}