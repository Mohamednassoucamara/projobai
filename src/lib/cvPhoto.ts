// Préparation de la photo du CV dans le navigateur : recadrage carré, réduction et
// compression JPEG. La photo reste privée : elle est enregistrée avec le CV du candidat
// (table cvs, protégée par RLS) et non dans un stockage public.

const SIZE = 480; // px : net à l'impression pour un rond de 30 mm
const MAX_INPUT = 15 * 1024 * 1024;

export class PhotoError extends Error {}

function loadImage(file: File): Promise<HTMLImageElement> {
  // FileReader + data: (et non URL blob:) : la politique de sécurité du site n'autorise que data: pour les images locales.
  return new Promise((resolve, reject) => {
    const fail = () => reject(new PhotoError("Cette image ne peut pas être lue. Essayez une photo JPG ou PNG."));
    const reader = new FileReader();
    reader.onerror = fail;
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = fail;
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Recadre au centre (légèrement vers le haut, où se trouve le visage sur un portrait),
 * redimensionne et compresse. `zoom` ≥ 1 resserre le cadrage, `offsetY` de -1 à 1 le déplace.
 */
export async function preparePhoto(file: File, zoom = 1, offsetY = -0.15): Promise<string> {
  if (!/^image\//.test(file.type)) throw new PhotoError("Choisissez un fichier image (JPG ou PNG).");
  if (file.size > MAX_INPUT) throw new PhotoError("L'image dépasse 15 Mo. Choisissez une photo plus légère.");
  const img = await loadImage(file);
  const side = Math.min(img.naturalWidth, img.naturalHeight) / Math.max(1, zoom);
  const sx = (img.naturalWidth - side) / 2;
  const free = img.naturalHeight - side;
  const sy = Math.max(0, Math.min(free, free / 2 + (offsetY * free) / 2));

  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new PhotoError("Votre navigateur ne permet pas de traiter l'image.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, SIZE, SIZE);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);

  // Compression progressive pour rester léger (connexions 2G/3G)
  for (const q of [0.85, 0.75, 0.65]) {
    const data = canvas.toDataURL("image/jpeg", q);
    if (data.length < 160_000) return data;
  }
  return canvas.toDataURL("image/jpeg", 0.55);
}

/** Version ronde (PNG transparent) pour le PDF, avec un fin liseré blanc. */
export async function circularPhoto(dataUrl: string, ring = "#ffffff"): Promise<string> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new PhotoError("Photo illisible"));
    i.src = dataUrl;
  });
  const size = 480;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const r = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(img, 0, 0, size, size);
  ctx.restore();
  ctx.lineWidth = size * 0.035;
  ctx.strokeStyle = ring;
  ctx.beginPath();
  ctx.arc(r, r, r - ctx.lineWidth / 2, 0, Math.PI * 2);
  ctx.stroke();
  return canvas.toDataURL("image/png");
}
