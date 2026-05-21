# Utilisation de Deno pour les fonctions edge

- Les imports doivent être compatibles Deno (utilisez https://deno.land/x/ ou npm: avec Deno).
- Pour installer des modules npm, utilisez `deno add` ou référencez les modules via une URL.
- Pour le local, installez Deno : https://deno.land/manual@v1.40.1/getting_started/installation
- Pour les modules hono, utilisez :
  import { Hono } from "https://deno.land/x/hono/mod.ts";
  import { cors } from "https://deno.land/x/hono/middleware.ts";
  import { logger } from "https://deno.land/x/hono/middleware.ts";
- Le global Deno est disponible uniquement dans l’environnement Deno.