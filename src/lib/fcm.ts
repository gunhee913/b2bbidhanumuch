import admin from 'firebase-admin';

let initialized = false;

function getApp(): admin.app.App {
  if (!initialized) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccount) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않았습니다.');
    }

    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccount)),
    });
    initialized = true;
  }
  return admin.app();
}

export async function sendPushToTokens(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number; failedTokens: string[] }> {
  if (tokens.length === 0) {
    return { successCount: 0, failureCount: 0, failedTokens: [] };
  }

  const app = getApp();
  const messaging = app.messaging();

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: { title, body },
    data: data || {},
    android: {
      priority: 'high',
      notification: {
        channelId: 'default',
        sound: 'default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
  };

  const response = await messaging.sendEachForMulticast(message);

  const failedTokens: string[] = [];
  response.responses.forEach((resp, idx) => {
    if (!resp.success) {
      failedTokens.push(tokens[idx]);
    }
  });

  return {
    successCount: response.successCount,
    failureCount: response.failureCount,
    failedTokens,
  };
}

export async function sendPushToDealer(
  dealerId: string,
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number }> {
  const { createPureClient } = await import('@/lib/supabase/server');
  const supabase = await createPureClient();

  const { data: tokenRows } = await supabase
    .from('device_tokens')
    .select('token')
    .eq('dealer_id', dealerId);

  if (!tokenRows || tokenRows.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const tokens = tokenRows.map((row: any) => row.token);
  const result = await sendPushToTokens(tokens, title, body, data);

  if (result.failedTokens.length > 0) {
    await supabase
      .from('device_tokens')
      .delete()
      .in('token', result.failedTokens);
  }

  return { successCount: result.successCount, failureCount: result.failureCount };
}

export async function sendPushToAllDealers(
  dealerIds: string[],
  title: string,
  body: string,
  data?: Record<string, string>
): Promise<{ successCount: number; failureCount: number }> {
  const { createPureClient } = await import('@/lib/supabase/server');
  const supabase = await createPureClient();

  const { data: tokenRows } = await supabase
    .from('device_tokens')
    .select('token')
    .in('dealer_id', dealerIds);

  if (!tokenRows || tokenRows.length === 0) {
    return { successCount: 0, failureCount: 0 };
  }

  const tokens = tokenRows.map((row: any) => row.token);
  const result = await sendPushToTokens(tokens, title, body, data);

  if (result.failedTokens.length > 0) {
    await supabase
      .from('device_tokens')
      .delete()
      .in('token', result.failedTokens);
  }

  return { successCount: result.successCount, failureCount: result.failureCount };
}
