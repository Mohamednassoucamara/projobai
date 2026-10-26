/** Numéro WhatsApp du bot ProJob AI (format international, sans « + »). */
export const BOT_WHATSAPP_NUMBER = "224622775088";

/** Numéro affiché aux visiteurs. */
export const BOT_WHATSAPP_DISPLAY = "+224 622 77 50 88";

/**
 * Lien qui ouvre directement la discussion avec le bot.
 * Pas besoin de compte ProJob : le bot propose lui-même de relier ou de créer le compte.
 */
export function botWhatsAppUrl(message = "Bonjour") {
  return `https://wa.me/${BOT_WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
