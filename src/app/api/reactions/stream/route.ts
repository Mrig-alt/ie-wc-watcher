import { addClient, removeClient } from "@/lib/reaction-stream";

export const dynamic = "force-dynamic";

export async function GET() {
  let write: (data: string) => void;
  let closed = false;
  let heartbeatId: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream({
    start(controller) {
      write = (data: string) => {
        if (!closed) {
          try { controller.enqueue(new TextEncoder().encode(data)); }
          catch {
            closed = true;
            if (heartbeatId !== undefined) clearInterval(heartbeatId);
            removeClient(write);
          }
        }
      };
      addClient(write);
      write(`: heartbeat\n\n`);

      // Repeat heartbeat every 25s to keep connection alive through proxies/Render load balancer
      heartbeatId = setInterval(() => {
        if (closed) { clearInterval(heartbeatId); return; }
        write(`: heartbeat\n\n`);
      }, 25_000);
    },
    cancel() {
      closed = true;
      if (heartbeatId !== undefined) clearInterval(heartbeatId);
      removeClient(write);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    },
  });
}
