import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createConsumer } from '@/features/consumers/auth';
import type { CreateConsumerInput } from '@/features/consumers/types';

const signupSchema = z.object({
  phone: z.string().regex(/^01[016789]-?\d{3,4}-?\d{4}$/, '휴대폰 번호 형식이 올바르지 않습니다.'),
  password: z.string().min(6, '비밀번호는 6자 이상이어야 합니다.').max(72),
  name: z.string().min(1, '이름을 입력해주세요.').max(50),
  email: z.string().email('이메일 형식이 올바르지 않습니다.').optional().or(z.literal('')),
  zipcode: z.string().optional(),
  address: z.string().optional(),
  addressDetail: z.string().optional(),
});

/** POST: 소비자 가입 */
export async function POST(request: NextRequest) {
  const parsed = signupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? '입력값이 올바르지 않습니다.';
    return NextResponse.json({ error: first }, { status: 400 });
  }

  const input = parsed.data as z.infer<typeof signupSchema> & CreateConsumerInput;
  const result = await createConsumer({ ...input, email: input.email || undefined });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: result.code === 'DUPLICATE' ? 409 : 500 });
  }
  return NextResponse.json(result.consumer, { status: 201 });
}
