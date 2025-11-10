import { cleanupTestData } from './setup/seed';

export default async function globalTeardown() {
  console.log('Cleaning up E2E test environment...');
  await cleanupTestData();
}
