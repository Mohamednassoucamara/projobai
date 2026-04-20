import { useEffect } from "react";
import { useLocation } from "react-router";

export default function BotpressWidget() {
  const location = useLocation();

  useEffect(() => {
    try {
      // Pages où on ne veut pas charger le widget global
      const excludedPaths = ["/cv-assistant", "/interview-prep", "/cover-letter"];

      // Ne pas charger le widget sur les pages avec iframe Botpress intégrée
      if (excludedPaths.includes(location.pathname)) {
        // Retirer le widget s'il existe déjà
        const existingWidget = document.getElementById("bp-web-widget-container");
        if (existingWidget) {
          existingWidget.style.display = "none";
        }
        return;
      }

      // Afficher le widget s'il est caché
      const existingWidget = document.getElementById("bp-web-widget-container");
      if (existingWidget) {
        existingWidget.style.display = "block";
      }

      // Charger les scripts Botpress seulement une fois
      if (!document.querySelector('script[src*="botpress.cloud/webchat"]')) {
        // Charger le script inject.js de Botpress
        const injectScript = document.createElement("script");
        injectScript.src = "https://cdn.botpress.cloud/webchat/v3.6/inject.js";
        injectScript.async = true;
        injectScript.onerror = () => {
          console.warn('Erreur lors du chargement du script Botpress inject.js');
        };
        document.body.appendChild(injectScript);

        // Charger le script de configuration Botpress
        const configScript = document.createElement("script");
        configScript.src = "https://files.bpcontent.cloud/2026/04/12/16/20260412163601-ZI9H8LWS.js";
        configScript.defer = true;
        configScript.onerror = () => {
          console.warn('Erreur lors du chargement du script de configuration Botpress');
        };
        document.body.appendChild(configScript);
      }
    } catch (error) {
      console.error('Erreur dans BotpressWidget:', error);
    }
  }, [location.pathname]);

  return null;
}
