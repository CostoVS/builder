import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const mimeTypes: Record<string, string> = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'font/otf',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.ogg': 'video/ogg',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip',
};

// This API route handles ALL requests that don't match built-in NextJS routes.
// It acts as a static file server for extracted apps.
export async function GET(
    request: Request,
    // Note: in NextJS 15, `params` is a Promise. We should await it.
    { params }: { params: Promise<{ appSlug: string, filePath?: string[] }> }
) {
    const resolvedParams = await params;
    const slug = resolvedParams.appSlug;
    const filePathArray = resolvedParams.filePath || [];
    let relativePath = filePathArray.join('/');

    // Guard against directory traversal
    if (relativePath.includes('..') || slug.includes('..')) {
        return new NextResponse('Bad Request', { status: 400 });
    }

    // Skip Next.js internals just in case
    if (slug === '_next') {
        return new NextResponse('Not Found', { status: 404 });
    }

    const deployBaseDir = process.env.NODE_ENV === 'production' && !process.env.APP_URL 
      ? '/var/www/apps' 
      : path.join(process.cwd(), '.deployments');

    const appDir = path.join(deployBaseDir, slug);

    if (!fs.existsSync(appDir)) {
        return new NextResponse(`App Not Found: ${slug}`, { status: 404 });
    }

    // Determine if it's a Vite build (dist), Next scale (out), or normal root
    let targetPath = '';
    const distPath = path.join(appDir, 'dist');
    const outPath = path.join(appDir, 'out');
    let searchRoot = appDir;

    if (fs.existsSync(distPath)) {
        searchRoot = distPath;
    } else if (fs.existsSync(outPath)) {
        searchRoot = outPath;
    }
    
    if (relativePath === '') {
        // Try serving index.html
        targetPath = path.join(searchRoot, 'index.html');
    } else {
        targetPath = path.join(searchRoot, relativePath);
        // If they requested a directory or a route, try falling back to index.html if the file doesn't exist
        if (!fs.existsSync(targetPath)) {
            // For SPA routing
            targetPath = path.join(searchRoot, 'index.html');
        } else if (fs.statSync(targetPath).isDirectory()) {
             // If a directory was requested directly, serve its index.html
             targetPath = path.join(targetPath, 'index.html');
        }
    }

    if (!fs.existsSync(targetPath)) {
        return new NextResponse(`File Not Found: ${relativePath}`, { status: 404 });
    }

    const ext = path.extname(targetPath).toLowerCase();
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    try {
        const fileBuffer = fs.readFileSync(targetPath);
        return new NextResponse(fileBuffer, {
            status: 200,
            headers: {
                'Content-Type': mimeType,
                // Cache HTML lightly, cache static assets heavily
                'Cache-Control': ext === '.html' ? 'public, max-age=0, must-revalidate' : 'public, max-age=31536000, immutable',
            },
        });
    } catch (e) {
        return new NextResponse('Error reading file', { status: 500 });
    }
}
