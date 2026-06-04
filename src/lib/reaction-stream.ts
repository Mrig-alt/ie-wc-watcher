// In-memory SSE broadcaster — one Set of writers per server process.
// On Render free tier there's only 1 instance so this works fine.
type Writer = (data: string) => void;

const clients = new Set<Writer>();

export function addClient(writer: Writer) {
  clients.add(writer);
}

export function removeClient(writer: Writer) {
  clients.delete(writer);
}

export function broadcast(payload: object) {
  const data = `data: ${JSON.stringify(payload)}\n\n`;
  clients.forEach((write) => {
    try { write(data); } catch { removeClient(write); }
  });
}

export function clientCount() {
  return clients.size;
}
