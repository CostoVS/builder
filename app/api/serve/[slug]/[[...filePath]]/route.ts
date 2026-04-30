import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mime from 'mime-types';

const deployBaseDir = process.env.NODE_ENV === 'production' && !process.env.APP_URL 
  ? '/var/www/apps' 
  : path.join(process.cwd(), '.deployments');

export async function GET(req: Request, { params }: { params: Promise<{ slug: string, filePath?: string[] }> }) {
  const { slug, filePath } = await params;
  
  try {
    const appDir = path.join(deployBaseDir, slug);
    let requestedPath = filePath ? filePath.join('/') : '';
    
    // Default to index.html if no file specified
    if (!requestedPath || requestedPath === '') {
        // Try dist/index.html first, then out/index.html, then index.html
        if (fs.existsSync(path.join(appDir, 'dist', 'index.html'))) {
            requestedPath = 'dist/index.html';
        } else if (fs.existsSync(path.join(appDir, 'out', 'index.html'))) {
            requestedPath = 'out/index.html';
        } else {
            requestedPath = 'index.html';
        }
    } else {
        // If they requested a file, but the app has a dist or out folder, 
        // try looking in them first for assets, unless the file already exists at root.
        if (!fs.existsSync(path.join(appDir, requestedPath))) {
            if (fs.existsSync(path.join(appDir, 'dist', requestedPath))) {
                requestedPath = path.join('dist', requestedPath);
            } else if (fs.existsSync(path.join(appDir, 'out', requestedPath))) {
                requestedPath = path.join('out', requestedPath);
            }
        }
    }

    const fullPath = path.join(appDir, requestedPath);

    // Prevent directory traversal attacks
    if (!fullPath.startsWith(appDir)) {
        return new NextResponse('Forbidden', { status: 403 });
    }

    if (!fs.existsSync(fullPath)) {
        // Special case: Single Page Applications fallback to index.html
        const distFallback = path.join(appDir, 'dist', 'index.html');
        const outFallback = path.join(appDir, 'out', 'index.html');
        const rootFallback = path.join(appDir, 'index.html');

        let fallbackPath = '';
        if (fs.existsSync(distFallback)) {
            fallbackPath = distFallback;
        } else if (fs.existsSync(outFallback)) {
            fallbackPath = outFallback;
        } else if (fs.existsSync(rootFallback)) {
            fallbackPath = rootFallback;
        }
            
        if (fallbackPath) {
             const fallbackFileBuffer = fs.readFileSync(fallbackPath);
             return new NextResponse(fallbackFileBuffer, {
                 headers: { 'Content-Type': 'text/html' }
             });
        }
        return new NextResponse('Not found', { status: 404 });
    }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
         // Auto-serve index.html in dirs
         const indexHtml = path.join(fullPath, 'index.html');
         if (fs.existsSync(indexHtml)) {
             const fileBuffer = fs.readFileSync(indexHtml);
             return new NextResponse(fileBuffer, { headers: { 'Content-Type': 'text/html' } });
         }
         return new NextResponse('Forbidden', { status: 403 });
    }

    const fileBuffer = fs.readFileSync(fullPath);
    const contentType = mime.lookup(fullPath) || 'application/octet-stream';

    return new NextResponse(fileBuffer, {
        headers: {
            'Content-Type': contentType,
            'Cache-Control': 'public, max-age=3600'
        }
    });

  } catch (err) {
    console.error(err);
    return new NextResponse('Internal Error', { status: 500 });
  }
}
