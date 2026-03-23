import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

const supabase = getAdminClient();

// GET: 경락(낙찰) 내역 조회
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const closedDateFrom = searchParams.get('closedDateFrom');
    const closedDateTo = searchParams.get('closedDateTo');
    const companyId = searchParams.get('companyId');
    const dealerId = searchParams.get('dealerId');
    const includeMyBids = searchParams.get('includeMyBids') === 'true';

    // 수수료 설정 조회
    const { data: feeSettings } = await supabase
      .from('settlement_settings')
      .select('name, type, value')
      .eq('enabled', true);

    const feeRate = Number(feeSettings?.find(s => s.name === '상장수수료')?.value) || 2;
    const deliveryFeeSetting = feeSettings?.find(s => s.name === '배송수수료');
    const deliveryFeeRate = Number(deliveryFeeSetting?.value) || 0;

    // 1. 마감된 상장 조회
    let listingsQuery = supabase
      .from('cattle_listings')
      .select(`
        id,
        listing_no,
        listing_date,
        closed_at,
        breed,
        gender,
        grade,
        marbling_score,
        trace_no,
        company_id,
        companies (
          id,
          name,
          company_no
        ),
        cattle_parts (
          id,
          part_no,
          part_name,
          listing_part_no,
          weight,
          min_price,
          bid_price,
          bid_amount,
          winning_dealer_id,
          is_included
        )
      `)
      .in('status', ['closed', 'completed'])
      .order('closed_at', { ascending: false });

    // 마감일 필터
    if (closedDateFrom) {
      listingsQuery = listingsQuery.gte('closed_at', `${closedDateFrom}T00:00:00`);
    }
    if (closedDateTo) {
      listingsQuery = listingsQuery.lte('closed_at', `${closedDateTo}T23:59:59`);
    }

    // 업체 필터
    if (companyId) {
      listingsQuery = listingsQuery.eq('company_id', companyId);
    }

    const { data: listings, error: listingsError } = await listingsQuery;

    if (listingsError) {
      console.error('상장 조회 오류:', listingsError);
      return NextResponse.json({ error: listingsError.message }, { status: 500 });
    }

    if (!listings || listings.length === 0) {
      return NextResponse.json({
        records: [],
        stats: {
          totalCount: 0,
          successCount: 0,
          failedCount: 0,
          totalAmount: 0,
        }
      });
    }

    // 2. 낙찰된 부위의 딜러 정보 조회
    const winningDealerIds = new Set<string>();
    listings.forEach((listing: any) => {
      (listing.cattle_parts || []).forEach((part: any) => {
        if (part.winning_dealer_id) {
          winningDealerIds.add(part.winning_dealer_id);
        }
      });
    });

    let dealersMap: Record<string, any> = {};
    if (winningDealerIds.size > 0) {
      const { data: dealers } = await supabase
        .from('dealers')
        .select('id, name, dealer_no')
        .in('id', Array.from(winningDealerIds));

      (dealers || []).forEach((dealer: any) => {
        dealersMap[dealer.id] = dealer;
      });
    }

    // 3. 배송 거래처 지정 정보 조회
    const allPartIds = new Set<string>();
    listings.forEach((listing: any) => {
      (listing.cattle_parts || []).forEach((part: any) => {
        if (part.is_included) allPartIds.add(part.id);
      });
    });

    // 3-1. 딜러의 입찰 내역 조회 (includeMyBids용)
    let myBidPartIds = new Set<string>();
    let myBidPriceMap: Record<string, number> = {};
    if (dealerId && includeMyBids && allPartIds.size > 0) {
      const partIdArr = Array.from(allPartIds);
      const batchSize = 50;
      for (let i = 0; i < partIdArr.length; i += batchSize) {
        const batch = partIdArr.slice(i, i + batchSize);
        const { data: myBids } = await supabase
          .from('bids')
          .select('part_id, bid_price')
          .eq('dealer_id', dealerId)
          .in('part_id', batch);
        (myBids || []).forEach((bid: any) => {
          myBidPartIds.add(bid.part_id);
          myBidPriceMap[bid.part_id] = bid.bid_price;
        });
      }
    }

    let partnerMap: Record<string, { partnerNo: string; partnerName: string }> = {};
    if (allPartIds.size > 0) {
      const partIdArr = Array.from(allPartIds);
      const batchSize = 50;
      const assignmentRows: any[] = [];
      for (let i = 0; i < partIdArr.length; i += batchSize) {
        const batch = partIdArr.slice(i, i + batchSize);
        const { data: assignments } = await supabase
          .from('delivery_assignments')
          .select('part_id, partner_id, partners ( partner_no, name )')
          .in('part_id', batch);
        if (assignments) assignmentRows.push(...assignments);
      }

      assignmentRows.forEach((a: any) => {
        const p = a.partners as any;
        if (p) {
          partnerMap[a.part_id] = {
            partnerNo: p.partner_no || '',
            partnerName: p.name || '',
          };
        }
      });
    }

    // 4. 경락 내역 데이터 구성
    const records: any[] = [];
    let totalAmount = 0;
    let successCount = 0;
    let failedCount = 0;

    // 등급 포맷팅 함수
    const formatGrade = (grade: string, marblingScore: number | null) => {
      if (!grade) return '';
      if (grade.includes('(')) return grade;
      if (marblingScore && grade.startsWith('1++')) {
        return `${grade}(${marblingScore})`;
      }
      return grade;
    };

    listings.forEach((listing: any) => {
      const company = listing.companies as any;
      const formattedGrade = formatGrade(listing.grade, listing.marbling_score);

      (listing.cattle_parts || [])
        .filter((part: any) => part.is_included)
        .filter((part: any) => {
          if (!dealerId) return true;
          if (part.winning_dealer_id === dealerId) return true;
          if (includeMyBids && myBidPartIds.has(part.id)) return true;
          return false;
        })
        .sort((a: any, b: any) => a.part_no - b.part_no)
        .forEach((part: any) => {
          const dealer = part.winning_dealer_id ? dealersMap[part.winning_dealer_id] : null;
          const isFailed = !part.winning_dealer_id || !part.bid_price;
          const isMyWin = dealerId ? part.winning_dealer_id === dealerId : false;
          const myBidPrice = dealerId ? (myBidPriceMap[part.id] || null) : null;
          
          if (isFailed) {
            failedCount++;
          } else {
            successCount++;
            totalAmount += part.bid_amount || 0;
          }

          // 수수료 계산
          const commission = part.bid_amount ? Math.round(part.bid_amount * feeRate / 100) : null;
          const deliveryFee = part.bid_amount ? Math.round(part.bid_amount * deliveryFeeRate / 100) : null;

          records.push({
            id: `${listing.id}-${part.id}`,
            listingId: listing.id,
            partId: part.id,
            closedAt: listing.closed_at,
            listingDate: listing.listing_date,
            listingNo: listing.listing_no,
            listingPartNo: part.listing_part_no || `${listing.listing_no}-${String(part.part_no).padStart(2, '0')}`,
            partName: part.part_name,
            grade: formattedGrade,
            weight: part.weight || 0,
            minPrice: part.min_price || 0,
            bidPrice: part.bid_price,
            bidAmount: part.bid_amount,
            commission,
            deliveryFee,
            breed: listing.breed,
            gender: listing.gender,
            traceNo: listing.trace_no,
            companyId: listing.company_id,
            companyNo: company?.company_no || '',
            companyName: company?.name || '',
            dealerId: part.winning_dealer_id,
            dealerNo: dealer?.dealer_no || null,
            dealerName: dealer?.name || null,
            partnerNo: partnerMap[part.id]?.partnerNo || null,
            partnerName: partnerMap[part.id]?.partnerName || null,
            isFailed,
            isMyWin,
            myBidPrice,
          });
        });
    });

    // 상장번호 오름차순 정렬 (101, 102, 103, 201, 202, ...)
    records.sort((a: any, b: any) => {
      const aParts = (a.listingPartNo || '').split('-');
      const bParts = (b.listingPartNo || '').split('-');
      const aMain = parseInt(aParts[0]) || 0;
      const bMain = parseInt(bParts[0]) || 0;
      if (aMain !== bMain) return aMain - bMain;
      const aSub = parseInt(aParts[1]) || 0;
      const bSub = parseInt(bParts[1]) || 0;
      return aSub - bSub;
    });

    return NextResponse.json({
      records,
      stats: {
        totalCount: records.length,
        successCount,
        failedCount,
        totalAmount,
      }
    });
  } catch (error) {
    console.error('경락 내역 조회 오류:', error);
    return NextResponse.json(
      { error: '경락 내역 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
