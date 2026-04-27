import { Pool } from 'pg';

// We use fallback so AI studio doesn't crash if DB isn't connected yet.
// On the VPS, this will connect properly using the environment variable.
let pool: Pool | null = null;

export const getDb = () => {
    if (!pool && process.env.DATABASE_URL) {
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
        });
    }
    return pool;
};

export async function initDb() {
    const db = getDb();
    if (!db) return false;
    try {
        await db.query(`
            CREATE TABLE IF NOT EXISTS deployments (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) NOT NULL,
                slug VARCHAR(255) UNIQUE NOT NULL,
                status VARCHAR(50) DEFAULT 'deployed',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        return true;
    } catch (e) {
        console.error("Failed to init DB:", e);
        return false;
    }
}
