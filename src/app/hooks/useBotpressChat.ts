import { useEffect } from "react";

export function useBotpressChat() {
  useEffect(() => {
    // Pages où on ne veut pas charger le widget global
    const excludedPaths = ["/cv-assistant", "/interview-prep", "/cover-letter"];

    // Vérifier le chemin actuel
    const currentPath = window.location.pathname;

    // Ne pas charger le widget sur les pages avec iframe Botpress intégrée
    if (excludedPaths.includes(currentPath)) {
      return;
    }

    // Charger le script inject.js de Botpress
    const injectScript = document.createElement("script");
    injectScript.src = "https://cdn.botpress.cloud/webchat/v3.6/inject.js";
    injectScript.async = true;
    document.body.appendChild(injectScript);

    // Charger le script de configuration Botpress
    const configScript = document.createElement("script");
    configScript.src = "https://files.bpcontent.cloud/2026/04/12/16/20260412163601-ZI9H8LWS.js";
    configScript.defer = true;
    document.body.appendChild(configScript);

    // Nettoyer les scripts lors du démontage du composant
    return () => {
      if (document.body.contains(injectScript)) {
        document.body.removeChild(injectScript);
      }
      if (document.body.contains(configScript)) {
        document.body.removeChild(configScript);
      }
    };
  }, []);
}
