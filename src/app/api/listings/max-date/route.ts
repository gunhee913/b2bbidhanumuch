import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';
import { todayKst } from '@/lib/utils';

const supabase = getAdminClient();

export async function GET() {
  try {
    const { data } = await supabase
      .from('cattle_listings')
      .select('listing_date')
      .in('status', ['approved', 'auction', 'closed', 'completed'])
      .order('listing_date', { ascending: false })
      .limit(1);

    const date = data?.[0]?.listing_date || todayKst();
    return NextResponse.json({ date });
  } catch {
    return NextResponse.json({ date: todayKst() });
  }
}
