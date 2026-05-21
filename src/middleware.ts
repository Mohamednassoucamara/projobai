import { NextRequest, NextResponse } from 'next/server';

export function middleware(req: NextRequest) {
  // Ici, vous pouvez ajouter la logique pour maintenir les sessions à jour
  // Par exemple, vérifier les cookies ou rafraîchir les tokens
  return NextResponse.next();
}

export const config = {
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
};
