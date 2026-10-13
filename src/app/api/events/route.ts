import { NextRequest } from "next/server";
import { ensureStore, getVersion, subscribe } from "@/server/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Server-Sent Events: pushes the data version whenever anything changes; clients then refetch their view. */
export async function GET(req: NextRequest) {
  ensureStore();
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (chunk: string) => {
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          cleanup(); // stream already closed by the client
        }
      };
      send(`retry: 3000\nevent: change\ndata: ${getVersion()}\n\n`);
      const unsubscribe = subscribe((v) => send(`event: change\ndata: ${v}\n\n`));
      const heartbeat = setInterval(() => send(`: ping\n\n`), 20000);
      cleanup = () => {
        unsubscribe();
        clearInterval(heartbeat);
      };
      req.signal.addEventListener("abort", () => {
        cleanup();
        try {
          controller.close();
        } catch {
          // already closed
        }
      });
    },
    cancel() {
      cleanup();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
