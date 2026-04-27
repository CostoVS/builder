import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';

const deployBaseDir = process.env.NODE_ENV === 'production' && !process.env.APP_URL 
  ? '/var/www/apps' 
  : path.join(process.cwd(), '.deployments');

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  try {
    const db = getDb();
    let slug = 'examplesite';

    if (db) {
      const res = await db.query('SELECT slug FROM deployments WHERE id = $1', [id]);
      if (res.rows.length === 0) {
        return new NextResponse('Not found', { status: 404 });
      }
      slug = res.rows[0].slug;
    }

    const appDir = path.join(deployBaseDir, slug);
    
    if (!fs.existsSync(appDir)) {
        return new NextResponse('Directory not found on disk', { status: 404 });
    }

    const zip = new AdmZip();
    zip.addLocalFolder(appDir);
    const buffer = zip.toBuffer();

    return new NextResponse(buffer, {
        headers: {
            'Content-Type': 'application/zip',
            'Content-Disposition': `attachment; filename="${slug}.zip"`
        }
    });

  } catch (err) {
    console.error(err);
    return new NextResponse('Download failed', { status: 500 });
  }
}
