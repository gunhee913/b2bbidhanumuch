'use client';

import { StaffLogin } from '@/features/entry/components/StaffLogin';

export default function AdminLoginPage() {
  return (
    <StaffLogin
      eyebrow="관리자 로그인"
      provider="admin-login"
      rememberKey="admin:login:remember-phone"
      defaultCallbackUrl="/admin"
    />
  );
}
