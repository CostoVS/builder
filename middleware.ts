import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  const hostname = req.headers.get('host') || '';

  const auth = req.cookies.get('builder_auth');
  const isAuthenticated = auth?.value === 'authenticated';
  const isBuilderDomain = hostname.includes('builder.masterchief.co.za');
  const isMainDomain = hostname.includes('masterchief.co.za') && !isBuilderDomain;

  if (isBuilderDomain) {
    // 1. Enforce Authentication on builder domain
    if (!isAuthenticated && url.pathname !== '/login') {
       // Redirect to login if unauthenticated
       url.pathname = '/login';
       return NextResponse.redirect(url);
    }

    // 2. Rewrite paths to the hidden /builder folder
    if (url.pathname === '/') {
      return NextResponse.rewrite(new URL('/builder', req.url));
    } else if (url.pathname === '/login') {
      return NextResponse.rewrite(new URL('/builder/login', req.url));
    } else if (!url.pathname.startsWith('/api') && !url.pathname.startsWith('/_next') && !url.pathname.startsWith('/builder')) {
      return NextResponse.rewrite(new URL(`/builder${url.pathname}`, req.url));
    }
  } 
  
  if (isMainDomain) {
    if (url.pathname === '/' || url.pathname === '/orb') {
      return NextResponse.rewrite(new URL('/orb', req.url));
    } else if (!url.pathname.startsWith('/api') && !url.pathname.startsWith('/_next') && !url.pathname.startsWith('/builder')) {
      // Rewrite masterchief.co.za/examplesite/... to our static serving API
      const pathParts = url.pathname.split('/').filter(Boolean);
      const slug = pathParts[0];
      const rest = pathParts.slice(1).join('/');
      return NextResponse.rewrite(new URL(`/api/serve/${slug}/${rest}`, req.url));
    }
  }

  // AI Studio fallback: just enforce auth on /builder path directly
  if (!isBuilderDomain && !isMainDomain) {
     if (url.pathname.startsWith('/builder') && url.pathname !== '/builder/login') {
       if (!isAuthenticated) {
         return NextResponse.redirect(new URL('/builder/login', req.url));
       }
     }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
