import { SessionBrowser } from "@/components/sessions/session-browser";

export default function SessionsPage() {
  return (
    <div className="flex-1 overflow-auto p-6">
      <SessionBrowser />
    </div>
  );
}
