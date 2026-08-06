import { NextRequest, NextResponse } from "next/server";
import { createPureClient } from "@/lib/supabase/server";
import {
  toDealerApplication,
  type DealerApplicationRow,
} from "@/features/dealer-applications/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const keyword = searchParams.get("keyword")?.trim();
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const supabase = await createPureClient();

  let query = supabase
    .from("dealer_applications")
    .select("*")
    .order("created_at", { ascending: false });

  if (status && status !== "all") {
    query = query.eq("handle_status", status);
  }
  if (from) query = query.gte("created_at", `${from}T00:00:00`);
  if (to) query = query.lte("created_at", `${to}T23:59:59`);

  if (keyword) {
    query = query.or(
      [
        `applicant_name.ilike.%${keyword}%`,
        `phone.ilike.%${keyword}%`,
        `business_name.ilike.%${keyword}%`,
        `representative_name.ilike.%${keyword}%`,
        `business_no.ilike.%${keyword}%`,
      ].join(","),
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const applications = ((data as DealerApplicationRow[]) ?? []).map(
    toDealerApplication,
  );

  const statusCounts = applications.reduce<Record<string, number>>(
    (acc, app) => {
      acc[app.handleStatus] = (acc[app.handleStatus] ?? 0) + 1;
      return acc;
    },
    { unread: 0, viewed: 0, contacted: 0, onhold: 0, done: 0 },
  );

  return NextResponse.json({
    applications,
    statusCounts,
    total: applications.length,
  });
}
