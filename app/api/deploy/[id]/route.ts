import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import fs from 'fs';
import path from 'path';

const deployBaseDir = process.env.NODE_ENV === 'production' && !process.env.APP_URL 
  ? '/var/www/apps' 
  : path.join(process.cwd(), '.deployments');

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = getDb();
    let slug = 'examplesite'; // mock fallback
    
    if (db) {
      const res = await db.query('SELECT slug FROM deployments WHERE id = $1', [id]);
      if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      slug = res.rows[0].slug;
      
      await db.query('DELETE FROM deployments WHERE id = $1', [id]);
    }

    const appDir = path.join(deployBaseDir, slug);
    if (fs.existsSync(appDir)) {
      fs.rmSync(appDir, { recursive: true, force: true });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { newSlug } = await req.json();
    if (!newSlug || !/^[a-zA-Z0-9_-]+$/.test(newSlug)) {
        return NextResponse.json({ error: 'Invalid slug' }, { status: 400 });
    }

    const db = getDb();
    let oldSlug = 'examplesite'; // mock fallback

    if (db) {
      const res = await db.query('SELECT slug FROM deployments WHERE id = $1', [id]);
      if (res.rows.length === 0) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      oldSlug = res.rows[0].slug;

      await db.query('UPDATE deployments SET slug = $1 WHERE id = $2', [newSlug, id]);
    }

    const oldDir = path.join(deployBaseDir, oldSlug);
    const newDir = path.join(deployBaseDir, newSlug);
    
    if (fs.existsSync(oldDir)) {
      fs.renameSync(oldDir, newDir);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }
}
