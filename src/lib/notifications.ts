import { createPureClient } from '@/lib/supabase/server';

export type NotificationType =
  | 'listing_upload'
  | 'auction_start'
  | 'auction_result'
  | 'balance';

const TYPE_LABELS: Record<NotificationType, string> = {
  listing_upload: '상장 정보',
  auction_start: '경매 시작',
  auction_result: '경매 결과',
  balance: '잔고/입금',
};

async function isAdminSettingEnabled(supabase: any, type: NotificationType): Promise<boolean> {
  const { data } = await supabase
    .from('admin_notification_settings')
    .select('enabled')
    .eq('id', type)
    .single();

  return data?.enabled !== false;
}

async function isDealerSettingEnabled(supabase: any, dealerId: string, type: NotificationType): Promise<boolean> {
  const { data } = await supabase
    .from('notification_settings')
    .select(type)
    .eq('dealer_id', dealerId)
    .single();

  if (!data) return true;
  return data[type] !== false;
}

export async function createNotification(
  dealerId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  const supabase = await createPureClient();

  const adminEnabled = await isAdminSettingEnabled(supabase, type);
  if (!adminEnabled) return false;

  const dealerEnabled = await isDealerSettingEnabled(supabase, dealerId, type);
  if (!dealerEnabled) return false;

  const { error } = await supabase
    .from('notifications')
    .insert({
      dealer_id: dealerId,
      type,
      title,
      message,
      link,
      metadata: metadata || {},
    });

  return !error;
}

export async function createNotificationForAll(
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  metadata?: Record<string, any>,
  adminId?: string,
  adminName?: string
): Promise<number> {
  const supabase = await createPureClient();

  const adminEnabled = await isAdminSettingEnabled(supabase, type);
  if (!adminEnabled) return 0;

  const { data: dealers } = await supabase
    .from('dealers')
    .select('id')
    .eq('status', 'active');

  if (!dealers || dealers.length === 0) return 0;

  let count = 0;
  const notifications: any[] = [];

  for (const dealer of dealers) {
    const dealerEnabled = await isDealerSettingEnabled(supabase, dealer.id, type);
    if (dealerEnabled) {
      notifications.push({
        dealer_id: dealer.id,
        type,
        title,
        message,
        link,
        metadata: metadata || {},
      });
      count++;
    }
  }

  if (notifications.length > 0) {
    await supabase.from('notifications').insert(notifications);
  }

  await supabase.from('notification_logs').insert({
    type,
    title,
    message,
    target: 'all',
    recipient_count: count,
    created_by: adminId || null,
    created_by_name: adminName || null,
  });

  return count;
}

export async function createNotificationForDealer(
  dealerId: string,
  type: NotificationType,
  title: string,
  message: string,
  link?: string,
  metadata?: Record<string, any>,
  adminId?: string,
  adminName?: string
): Promise<boolean> {
  const success = await createNotification(dealerId, type, title, message, link, metadata);

  if (success) {
    const supabase = await createPureClient();
    await supabase.from('notification_logs').insert({
      type,
      title,
      message,
      target: dealerId,
      recipient_count: 1,
      created_by: adminId || null,
      created_by_name: adminName || null,
    });
  }

  return success;
}

function replaceVars(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? '');
}

export async function resolveTemplate(
  type: NotificationType,
  vars: Record<string, string>
): Promise<{ title: string; message: string }> {
  const supabase = await createPureClient();
  const { data } = await supabase
    .from('notification_templates')
    .select('title_template, message_template')
    .eq('id', type)
    .single();

  if (!data) {
    return { title: TYPE_LABELS[type] || type, message: '' };
  }

  return {
    title: replaceVars(data.title_template, vars),
    message: replaceVars(data.message_template, vars),
  };
}

export async function createNotificationWithTemplate(
  dealerId: string,
  type: NotificationType,
  vars: Record<string, string>,
  link?: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  const { title, message } = await resolveTemplate(type, vars);
  return createNotification(dealerId, type, title, message, link, metadata);
}

export async function createNotificationForAllWithTemplate(
  type: NotificationType,
  vars: Record<string, string>,
  link?: string,
  metadata?: Record<string, any>,
  adminId?: string,
  adminName?: string
): Promise<number> {
  const { title, message } = await resolveTemplate(type, vars);
  return createNotificationForAll(type, title, message, link, metadata, adminId, adminName);
}

export { TYPE_LABELS };
