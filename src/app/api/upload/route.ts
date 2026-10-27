import { NextRequest, NextResponse } from 'next/server';
import { getAdminClient } from '@/lib/supabase-admin';

const supabase = getAdminClient();

/** 받는 data URL · 사진은 모든 image/*, 증명서 스캔본은 PDF 도 받는다 */
const DATA_URL_PATTERN = /^data:(image\/\w+|application\/pdf);base64,/;

// Base64를 Buffer로 변환
function base64ToBuffer(base64: string): Buffer {
  const base64Data = base64.replace(DATA_URL_PATTERN, '');
  return Buffer.from(base64Data, 'base64');
}

/** data URL 의 MIME 으로 저장 확장자·contentType 을 정한다 */
function describeDataUrl(base64: string): { ext: string; contentType: string } {
  const match = base64.match(DATA_URL_PATTERN);
  const mime = match?.[1] ?? 'image/jpeg';
  if (mime === 'application/pdf') return { ext: 'pdf', contentType: mime };
  const subtype = mime.split('/')[1];
  return { ext: subtype === 'jpeg' ? 'jpg' : subtype, contentType: mime };
}

// POST: 이미지 업로드
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { images, folder = 'listings' } = body;
    
    // 단일 이미지 또는 배열 처리
    const imageArray = Array.isArray(images) ? images : [images];
    
    if (imageArray.length === 0) {
      return NextResponse.json({ error: '이미지가 없습니다.' }, { status: 400 });
    }
    
    const uploadedUrls: string[] = [];
    
    for (const image of imageArray) {
      if (!image) continue;
      
      // 이미 URL인 경우 그대로 사용
      if (image.startsWith('http')) {
        uploadedUrls.push(image);
        continue;
      }
      
      // Base64인 경우 업로드
      if (DATA_URL_PATTERN.test(image)) {
        const buffer = base64ToBuffer(image);
        const { ext, contentType } = describeDataUrl(image);
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        
        const { data, error } = await supabase.storage
          .from('image')
          .upload(fileName, buffer, {
            contentType,
            upsert: false,
          });
        
        if (error) {
          console.error('이미지 업로드 오류:', error);
          continue;
        }
        
        // Public URL 생성
        const { data: publicUrlData } = supabase.storage
          .from('image')
          .getPublicUrl(fileName);
        
        uploadedUrls.push(publicUrlData.publicUrl);
      }
    }
    
    return NextResponse.json({
      urls: uploadedUrls,
      url: uploadedUrls[0] || null, // 단일 이미지용
    });
  } catch (error) {
    console.error('업로드 오류:', error);
    return NextResponse.json(
      { error: '이미지 업로드 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
