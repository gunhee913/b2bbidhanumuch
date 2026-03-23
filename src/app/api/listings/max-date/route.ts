import { NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

const supabase = getAdminClient();

export async function GET() {
  try {
    const { data } = await supabase
      .from('cattle_listings')
      .select('listing_date')
      .in('status', ['approved', 'auction', 'closed', 'completed'])
      .order('listing_date', { ascending: false })
      .limit(1);

    const date = data?.[0]?.listing_date || new Date().toISOString().split('T')[0];
    return NextResponse.json({ date });
  } catch {
    return NextResponse.json({ date: new Date().toISOString().split('T')[0] });
  }
}
