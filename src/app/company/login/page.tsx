'use client';

import { StaffLogin } from '@/features/entry/components/StaffLogin';

export default function CompanyLoginPage() {
  return (
    <StaffLogin
      eyebrow="상장업체 로그인"
      provider="company-login"
      rememberKey="company:login:remember-phone"
      defaultCallbackUrl="/company"
      contactNote="계정이 없으신가요? 관리자에게 문의하세요."
    />
  );
}
