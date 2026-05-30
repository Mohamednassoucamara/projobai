import { Outlet } from "react-router";
import BotpressWidget from "./BotpressWidget";
import WhatsAppButton from "./WhatsAppButton";

export default function Layout() {
  return (
    <div className="min-h-screen w-full overflow-x-clip">
      <Outlet />
      <BotpressWidget />
      <WhatsAppButton />
    </div>
  );
}
