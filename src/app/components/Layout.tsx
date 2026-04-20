import { Outlet } from "react-router";
import BotpressWidget from "./BotpressWidget";
import WhatsAppButton from "./WhatsAppButton";

export default function Layout() {
  return (
    <>
      <Outlet />
      <BotpressWidget />
      <WhatsAppButton />
    </>
  );
}
