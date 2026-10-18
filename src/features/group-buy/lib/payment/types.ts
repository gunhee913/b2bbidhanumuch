/**
 * 결제 공급자 인터페이스.
 * 시연에서는 Mock 을 쓰고, 실서비스에서는 토스페이먼츠 등으로 구현체만 교체한다.
 */

export interface PaymentRequest {
  orderNo: string;
  amount: number;
  orderName: string;
  customerName: string;
  customerPhone: string;
}

/* strictNullChecks 가 꺼진 프로젝트라 판별 유니온 대신 평평한 결과 객체를 쓴다 */
export interface PaymentResult {
  ok: boolean;
  paymentKey?: string;
  approvedAt?: string;
  code?: string;
  message?: string;
}

export interface RefundResult {
  ok: boolean;
  refundedAt?: string;
  code?: string;
  message?: string;
}

export interface PaymentProvider {
  readonly name: string;
  approve(request: PaymentRequest): Promise<PaymentResult>;
  refund(paymentKey: string, amount: number, reason: string): Promise<RefundResult>;
}
