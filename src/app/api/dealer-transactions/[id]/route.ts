import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ADMIN_PASSWORD = process.env.ADMIN_BID_PASSWORD || '1234';

// PUT: 거래 금액 수정
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { amount, editedBy, adminPassword } = body;

    if (adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 403 });
    }

    const { data: tx, error: fetchError } = await supabase
      .from('dealer_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !tx) {
      return NextResponse.json({ error: '거래를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (tx.status !== 'active') {
      return NextResponse.json({ error: '취소된 거래는 수정할 수 없습니다.' }, { status: 400 });
    }

    const previousAmount = Number(tx.amount);
    const diff = amount - previousAmount;
    const newBalance = tx.type === 'deposit'
      ? Number(tx.balance) + diff
      : Number(tx.balance) - diff;

    await supabase
      .from('dealer_transaction_edits')
      .insert({
        transaction_id: id,
        previous_amount: previousAmount,
        new_amount: amount,
        edited_by: editedBy || '',
      });

    const { error: updateError } = await supabase
      .from('dealer_transactions')
      .update({ amount, balance: newBalance })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '거래 수정 중 오류가 발생했습니다.' }, { status: 500 });
  }
}

// PATCH: 거래 취소
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { cancelReason, cancelledBy, adminPassword } = body;

    if (adminPassword !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: '비밀번호가 일치하지 않습니다.' }, { status: 403 });
    }

    if (!cancelReason?.trim()) {
      return NextResponse.json({ error: '취소 사유를 입력해주세요.' }, { status: 400 });
    }

    const { data: tx, error: fetchError } = await supabase
      .from('dealer_transactions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !tx) {
      return NextResponse.json({ error: '거래를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (tx.status !== 'active') {
      return NextResponse.json({ error: '이미 취소된 거래입니다.' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('dealer_transactions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_by: cancelledBy || '',
        cancel_reason: cancelReason.trim(),
      })
      .eq('id', id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: '거래 취소 중 오류가 발생했습니다.' }, { status: 500 });
  }
}
