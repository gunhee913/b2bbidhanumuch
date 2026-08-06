import { NextRequest, NextResponse } from "next/server";
import { createPureClient } from "@/lib/supabase/server";
import {
  toDealerApplication,
  type DealerApplicationRow,
  type HandleStatus,
} from "@/features/dealer-applications/types";

interface Params {
  params: Promise<{ id: string }>;
}

const ALLOWED_STATUSES: HandleStatus[] = [
  "unread",
  "viewed",
  "contacted",
  "onhold",
  "done",
];

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const supabase = await createPureClient();
  const { data, error } = await supabase
    .from("dealer_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(
    toDealerApplication(data as DealerApplicationRow),
  );
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;

  let body: {
    handleStatus?: HandleStatus;
    adminNote?: string | null;
    handledBy?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "요청 본문이 올바르지 않습니다." },
      { status: 400 },
    );
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (body.handleStatus) {
    if (!ALLOWED_STATUSES.includes(body.handleStatus)) {
      return NextResponse.json(
        { error: "허용되지 않은 상태값입니다." },
        { status: 400 },
      );
    }
    patch.handle_status = body.handleStatus;
    patch.handled_at = new Date().toISOString();
    if (body.handledBy !== undefined) {
      patch.handled_by = body.handledBy;
    }
  }
  if (body.adminNote !== undefined) {
    patch.admin_note = body.adminNote;
  }

  const supabase = await createPureClient();
  const { data, error } = await supabase
    .from("dealer_applications")
    .update(patch)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    toDealerApplication(data as DealerApplicationRow),
  );
}
