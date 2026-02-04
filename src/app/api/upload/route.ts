import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Base64를 Buffer로 변환
function base64ToBuffer(base64: string): Buffer {
  // data:image/jpeg;base64, 형식에서 실제 데이터만 추출
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(base64Data, 'base64');
}

// 파일 확장자 추출
function getExtensionFromBase64(base64: string): string {
  const match = base64.match(/^data:image\/(\w+);base64,/);
  if (match) {
    const ext = match[1];
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  return 'jpg';
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
      if (image.startsWith('data:image')) {
        const buffer = base64ToBuffer(image);
        const ext = getExtensionFromBase64(image);
        const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        
        const { data, error } = await supabase.storage
          .from('image')
          .upload(fileName, buffer, {
            contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
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
