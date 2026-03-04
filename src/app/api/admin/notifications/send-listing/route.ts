import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createPureClient } from '@/lib/supabase/server';
import { createNotificationForAll } from '@/lib/notifications';

function getBaseGrade(grade: string): string {
  return grade.replace(/[ABC]/, '');
}

function classifyGrade(grade: string, marblingScore: number | null): string {
  const base = getBaseGrade(grade);
  if (base === '1++' && marblingScore === 9) return '1++(9)';
  if (base === '1++' && marblingScore === 8) return '1++(8)';
  if (base === '1++' && marblingScore === 7) return '1++(7)';
  if (base === '1+') return '1+';
  if (base === '1') return '1';
  if (base === '2') return '2';
  return base;
}

const GRADE_COLS = ['1++(9)', '1++(8)', '1++(7)', '1+', '1', '2'] as const;

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.admin?.id) {
      return NextResponse.json({ error: '관리자 권한이 필요합니다.' }, { status: 403 });
    }

    const supabase = await createPureClient();

    const body = await request.json();
    const { date } = body;
    const targetDate = date || new Date().toISOString().split('T')[0];

    const { data: listings, error } = await supabase
      .from('cattle_listings')
      .select('id, grade, gender, marbling_score')
      .eq('listing_date', targetDate)
      .in('status', ['approved', 'auction', 'closed', 'completed']);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({ error: '해당 날짜에 상장 정보가 없습니다.' }, { status: 400 });
    }

    const steer: Record<string, number> = {};
    const cow: Record<string, number> = {};
    for (const col of GRADE_COLS) {
      steer[col] = 0;
      cow[col] = 0;
    }

    for (const l of listings) {
      const cls = classifyGrade(l.grade || '', l.marbling_score);
      const gender = l.gender === '거세' ? 'steer' : 'cow';
      if (gender === 'steer' && cls in steer) steer[cls]++;
      else if (gender === 'cow' && cls in cow) cow[cls]++;
    }

    const steerSum = Object.values(steer).reduce((a, b) => a + b, 0);
    const cowSum = Object.values(cow).reduce((a, b) => a + b, 0);
    const totalSum = steerSum + cowSum;
    const totals = GRADE_COLS.map(g => steer[g] + cow[g]);

    const steerArr = GRADE_COLS.map(g => steer[g]);
    const cowArr = GRADE_COLS.map(g => cow[g]);
    const totalArr = GRADE_COLS.map(g => steer[g] + cow[g]);

    const { data: tpl } = await supabase
      .from('notification_templates')
      .select('title_template')
      .eq('id', 'listing_upload')
      .single();

    const title = tpl?.title_template || '상장 정보 업로드';
    const message = `등급별 경매 두수 (총 ${steerSum + cowSum}두)`;

    const gradeTable = {
      cols: [...GRADE_COLS, '합계'],
      rows: [
        { label: '거세', values: [...steerArr, steerSum] },
        { label: '암', values: [...cowArr, cowSum] },
        { label: '합계', values: [...totalArr, steerSum + cowSum] },
      ],
    };

    const count = await createNotificationForAll(
      'listing_upload',
      title,
      message,
      '/',
      { gradeTable },
      session.admin.id,
      session.admin.name
    );

    return NextResponse.json({ success: true, recipientCount: count });
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 });
  }
}
