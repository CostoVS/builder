import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const host = req.headers.get('host') || '';

  // Apply routing logic ONLY when running under the actual domains on the VPS.
  // In the AI Studio preview environment (*.run.app or localhost), we bypass this
  // so you can navigate manually to /orb or /builder for testing.

  const isProdDomains = host.includes('masterchief.co.za');

  if (isProdDomains) {
    if (host === 'builder.masterchief.co.za') {
      // Rewrite root of builder domain to /builder
      if (url.pathname === '/' || url.pathname === '') {
        return NextResponse.rewrite(new URL(`/builder`, req.url));
      }
      // If they go to /foo, rewrite to /builder/foo
      if (!url.pathname.startsWith('/builder')) {
        return NextResponse.rewrite(new URL(`/builder${url.pathname}`, req.url));
      }
    } else {
      // For masterchief.co.za and www.masterchief.co.za
      if (url.pathname === '/' || url.pathname === '/orb') {
        return NextResponse.rewrite(new URL(`/orb`, req.url));
      } else {
        // Rewrite masterchief.co.za/examplesite/... to our static serving API
        const pathParts = url.pathname.split('/').filter(Boolean);
        const slug = pathParts[0];
        const rest = pathParts.slice(1).join('/');
        return NextResponse.rewrite(new URL(`/api/serve/${slug}/${rest}`, req.url));
      }
    }
  }

  // Builder Route Protection
  if (url.pathname.startsWith('/builder') && url.pathname !== '/builder/login') {
    const auth = req.cookies.get('builder_auth');
    if (auth?.value !== 'authenticated') {
      return NextResponse.redirect(new URL('/builder/login', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
