import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
  const db = getDb();
  if (!db) {
    // Return mock data for AI Studio preview environment
    return NextResponse.json([{ id: 1, name: 'Google AI Studio App', slug: 'examplesite', status: 'mocked', created_at: new Date().toISOString() }]);
  }

  try {
    const res = await db.query('SELECT * FROM deployments ORDER BY created_at DESC');
    return NextResponse.json(res.rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'DB fetch failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const appName = formData.get('name') as string;
    const slug = formData.get('slug') as string;

    if (!file || !appName || !slug) {
      return NextResponse.json({ error: 'Missing file, app name, or slug' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Provide a valid path on the VPS, using a fallback for local AI Studio runtime
    const deployBaseDir = process.env.NODE_ENV === 'production' && !process.env.APP_URL 
      ? '/var/www/apps' 
      : path.join(process.cwd(), '.deployments');

    if (!fs.existsSync(deployBaseDir)) {
      fs.mkdirSync(deployBaseDir, { recursive: true });
    }

    const appDir = path.join(deployBaseDir, slug);
    
    // Save zip temporarily
    const zipPath = path.join(deployBaseDir, `${slug}.zip`);
    fs.writeFileSync(zipPath, buffer);

    // Extract
    const zip = new AdmZip(zipPath);
    zip.extractAllTo(appDir, true);
    
    // Cleanup Zip
    fs.unlinkSync(zipPath);

    // Record in DB
    const db = getDb();
    if (db) {
      await db.query(
        'INSERT INTO deployments (name, slug) VALUES ($1, $2)',
        [appName, slug]
      );
    }

    return NextResponse.json({ success: true, appDir });
  } catch (err) {
    console.error('Deploy error:', err);
    return NextResponse.json({ error: 'Deployment failed' }, { status: 500 });
  }
}
