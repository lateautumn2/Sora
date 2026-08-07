import { toNextJsHandler } from "better-auth/next-js";

import { auth } from "@/lib/auth/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const handlers = toNextJsHandler(auth);

export const GET = handlers.GET;

export function POST(request: Request): Response | Promise<Response> {
  const path = new URL(request.url).pathname;

  // Account creation is only exposed through the setup Server Action, where the
  // one-time setup token and database singleton constraint are both enforced.
  if (path.endsWith("/sign-up/email")) {
    return Response.json({ error: { code: "NOT_FOUND", message: "Not found" } }, { status: 404 });
  }

  return handlers.POST(request);
}
