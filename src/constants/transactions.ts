import { generateDealerSettlements, DEALERS } from './dealerSettlement';

// 수정 이력 타입
export interface EditHistory {
  editedAt: string;       // 수정일시
  editedBy: string;       // 수정자
  previousAmount: number; // 수정 전 금액
  newAmount: number;      // 수정 후 금액
  reason?: string;        // 수정 사유
}

// 거래 내역 타입
export interface Transaction {
  id: string;
  date: string;           // 거래일시
  dealerNo: string;       // 중도매인번호
  dealerName: string;     // 중도매인명
  type: 'deposit' | 'withdraw';  // 입금/출금
  amount: number;         // 금액
  balance: number;        // 잔액
  description: string;    // 비고
  createdBy: string;      // 처리자
  status: 'active' | 'cancelled';  // 상태
  cancelledAt?: string;   // 취소일시
  cancelledBy?: string;   // 취소자
  cancelReason?: string;  // 취소사유
  editHistory?: EditHistory[];  // 수정 이력
}

// 중도매인별 기본 선수금액 (고정값)
export const BASE_ADVANCE_PAYMENTS: Record<string, number> = {
  '7000001': 6500000,
  '7000002': 8200000,
  '7000003': 9500000,
  '7000004': 11000000,
  '7000005': 12500000,
};

// 거래 내역 더미 데이터 생성 (공통 사용)
export const generateTransactions = (): Transaction[] => {
  const transactions: Transaction[] = [];
  const settlements = generateDealerSettlements();
  
  // 중도매인별 오늘 낙찰금액
  const todayNetPayments: Record<string, number> = {};
  settlements.forEach(s => {
    todayNetPayments[s.dealerNo] = s.netPayment;
  });
  
  let txId = 1;
  
  DEALERS.forEach((dealer, dealerIdx) => {
    const dealerNo = dealer.no;
    const dealerName = dealer.name;
    const todayNetPayment = todayNetPayments[dealerNo] || 5000000;
    
    // 역순으로 계산 (오늘부터 과거로)
    // 21일(오늘) 입금
    const day21Deposit1 = 1000000 + dealerIdx * 500000;
    const day21Deposit2 = dealerIdx % 2 === 0 ? (500000 + dealerIdx * 200000) : 0;
    const day21TotalDeposit = day21Deposit1 + day21Deposit2;
    
    // 20일 낙찰대금 (오늘의 95%)
    const day20NetPayment = Math.round(todayNetPayment * 0.95);
    // 17일 낙찰대금 (오늘의 88%)
    const day17NetPayment = Math.round(todayNetPayment * 0.88);
    // 16일 낙찰대금 (오늘의 92%)
    const day16NetPayment = Math.round(todayNetPayment * 0.92);
    
    // 16일 시작 잔액 (최초 선수금)
    const initialBalance = BASE_ADVANCE_PAYMENTS[dealerNo] || 10000000;
    
    // 16일 거래
    const day16Deposit = Math.round(day16NetPayment * 1.08);
    const day16AfterDeposit = initialBalance;
    const day16AfterAuction = day16AfterDeposit - day16NetPayment;
    
    transactions.push({
      id: String(txId++),
      dealerNo,
      dealerName,
      type: 'deposit',
      amount: day16Deposit,
      date: '2026-01-16 08:30',
      description: '선수금 입금',
      balance: day16AfterDeposit,
      createdBy: '관리자1',
      status: 'active',
    });
    
    transactions.push({
      id: String(txId++),
      dealerNo,
      dealerName,
      type: 'withdraw',
      amount: day16NetPayment,
      date: '2026-01-16 10:00',
      description: '낙찰대금 차감',
      balance: day16AfterAuction,
      createdBy: '시스템',
      status: 'active',
    });
    
    // 17일 거래
    const day17Deposit = Math.round(day17NetPayment * 1.05);
    const day17AfterDeposit = day16AfterAuction + day17Deposit;
    const day17AfterAuction = day17AfterDeposit - day17NetPayment;
    
    transactions.push({
      id: String(txId++),
      dealerNo,
      dealerName,
      type: 'deposit',
      amount: day17Deposit,
      date: '2026-01-17 08:30',
      description: '선수금 입금',
      balance: day17AfterDeposit,
      createdBy: '관리자1',
      status: 'active',
    });
    
    transactions.push({
      id: String(txId++),
      dealerNo,
      dealerName,
      type: 'withdraw',
      amount: day17NetPayment,
      date: '2026-01-17 10:00',
      description: '낙찰대금 차감',
      balance: day17AfterAuction,
      createdBy: '시스템',
      status: 'active',
    });
    
    // 20일 거래 (18,19일은 주말로 경매 없음)
    const day20Deposit = Math.round(day20NetPayment * 1.1);
    const day20AfterDeposit = day17AfterAuction + day20Deposit;
    const day20AfterAuction = day20AfterDeposit - day20NetPayment;
    
    transactions.push({
      id: String(txId++),
      dealerNo,
      dealerName,
      type: 'deposit',
      amount: day20Deposit,
      date: '2026-01-20 08:30',
      description: '선수금 입금',
      balance: day20AfterDeposit,
      createdBy: '관리자1',
      status: 'active',
    });
    
    transactions.push({
      id: String(txId++),
      dealerNo,
      dealerName,
      type: 'withdraw',
      amount: day20NetPayment,
      date: '2026-01-20 10:00',
      description: '낙찰대금 차감',
      balance: day20AfterAuction,
      createdBy: '시스템',
      status: 'active',
    });
    
    // 21일(오늘) 거래
    const day21AfterDeposit1 = day20AfterAuction + day21Deposit1;
    transactions.push({
      id: String(txId++),
      dealerNo,
      dealerName,
      type: 'deposit',
      amount: day21Deposit1,
      date: '2026-01-21 08:30',
      description: '선수금 입금',
      balance: day21AfterDeposit1,
      createdBy: '관리자1',
      status: 'active',
    });
    
    // 21일 추가 입금 (짝수 인덱스만)
    let day21AfterAllDeposits = day21AfterDeposit1;
    if (day21Deposit2 > 0) {
      day21AfterAllDeposits = day21AfterDeposit1 + day21Deposit2;
      transactions.push({
        id: String(txId++),
        dealerNo,
        dealerName,
        type: 'deposit',
        amount: day21Deposit2,
        date: '2026-01-21 09:15',
        description: '선수금 입금',
        balance: day21AfterAllDeposits,
        createdBy: '관리자2',
        status: 'active',
      });
    }
    
    // 21일 낙찰대금 차감
    const day21AfterAuction = day21AfterAllDeposits - todayNetPayment;
    transactions.push({
      id: String(txId++),
      dealerNo,
      dealerName,
      type: 'withdraw',
      amount: todayNetPayment,
      date: '2026-01-21 10:00',
      description: '낙찰대금 차감',
      balance: day21AfterAuction,
      createdBy: '시스템',
      status: 'active',
    });
    
    // 15일 취소된 입금 건 예시 (김철수만)
    if (dealerIdx === 0) {
      transactions.push({
        id: String(txId++),
        dealerNo,
        dealerName,
        type: 'deposit',
        amount: 1000000,
        date: '2026-01-15 09:00',
        description: '선수금 입금',
        balance: 0,
        createdBy: '관리자2',
        status: 'cancelled',
        cancelledAt: '2026-01-15 10:30',
        cancelledBy: '관리자1',
        cancelReason: '오입금',
      });
    }
  });

  // 최신순 정렬
  return transactions.sort((a, b) => b.date.localeCompare(a.date));
};

// 특정 날짜의 입금 내역만 가져오기
export const getDepositsByDate = (transactions: Transaction[], dealerNo: string, dateStr: string): Transaction[] => {
  return transactions.filter(tx => {
    if (tx.dealerNo !== dealerNo) return false;
    if (tx.type !== 'deposit') return false;
    const txDate = tx.date.split(' ')[0];
    return txDate === dateStr;
  });
};

// 특정 날짜까지의 중도매인별 선수잔액 계산
export const calculateAdvancePayment = (transactions: Transaction[], dealerNo: string, dateStr: string): number => {
  // 해당 날짜까지의 활성 입금 합계
  const deposits = transactions.filter(tx => {
    if (tx.dealerNo !== dealerNo) return false;
    if (tx.type !== 'deposit') return false;
    if (tx.status !== 'active') return false;
    const txDate = tx.date.split(' ')[0];
    return txDate <= dateStr;
  }).reduce((sum, tx) => sum + tx.amount, 0);
  
  // 해당 날짜까지의 활성 출금 합계
  const withdraws = transactions.filter(tx => {
    if (tx.dealerNo !== dealerNo) return false;
    if (tx.type !== 'withdraw') return false;
    if (tx.status !== 'active') return false;
    const txDate = tx.date.split(' ')[0];
    return txDate <= dateStr;
  }).reduce((sum, tx) => sum + tx.amount, 0);
  
  return deposits - withdraws;
};

// sessionStorage 키 (탭 닫으면 초기화) - v4: 등급 A,B,C 골고루 섞기
const TRANSACTIONS_STORAGE_KEY = 'dealer_transactions_v4';

// sessionStorage에서 거래 내역 불러오기
export const loadTransactions = (): Transaction[] => {
  if (typeof window === 'undefined') {
    return generateTransactions();
  }
  
  const stored = sessionStorage.getItem(TRANSACTIONS_STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return generateTransactions();
    }
  }
  
  // 초기 데이터 저장
  const initial = generateTransactions();
  sessionStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(initial));
  return initial;
};

// sessionStorage에 거래 내역 저장
export const saveTransactions = (transactions: Transaction[]): void => {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(transactions));
};

// sessionStorage 초기화 (테스트용)
export const resetTransactions = (): Transaction[] => {
  const initial = generateTransactions();
  if (typeof window !== 'undefined') {
    sessionStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(initial));
  }
  return initial;
};
