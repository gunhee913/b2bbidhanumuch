import type { PaymentProvider, PaymentRequest, PaymentResult, RefundResult } from './types';

const APPROVE_DELAY_MS = 600;

/**
 * 모의 결제 · 항상 승인, 환불은 즉시.
 * 결제 UI 의 대기 상태를 보여주기 위해 짧은 지연만 둔다.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  async approve(request: PaymentRequest): Promise<PaymentResult> {
    await delay(APPROVE_DELAY_MS);
    if (request.amount <= 0) {
      return { ok: false, code: 'INVALID_AMOUNT', message: '결제 금액이 올바르지 않습니다.' };
    }
    return {
      ok: true,
      paymentKey: `mock_${request.orderNo}_${Date.now().toString(36)}`,
      approvedAt: new Date().toISOString(),
    };
  }

  async refund(): Promise<RefundResult> {
    return { ok: true, refundedAt: new Date().toISOString() };
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

let provider: PaymentProvider | null = null;

export function getPaymentProvider(): PaymentProvider {
  if (!provider) provider = new MockPaymentProvider();
  return provider;
}
