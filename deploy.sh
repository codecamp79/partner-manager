#!/bin/bash

echo "🚀 Partner Manager 배포 시작..."

# 1. 현재 설정 백업
echo "📋 현재 설정 백업 중..."
cp next.config.ts next.config.backup.ts

# 2. 배포용 설정으로 변경
echo "⚙️ 배포용 설정으로 변경 중..."
cp next.config.deploy.ts next.config.ts

# 3. 정적 빌드
echo "🔨 정적 빌드 중..."
npm run build

# 4. Firebase 배포
echo "🔥 Firebase에 배포 중..."
firebase deploy

# 5. 원래 설정으로 복원
echo "🔄 원래 설정으로 복원 중..."
cp next.config.backup.ts next.config.ts
rm next.config.backup.ts

echo "✅ 배포 완료!"
echo "🌐 배포된 URL: https://django-login-448411.web.app"
