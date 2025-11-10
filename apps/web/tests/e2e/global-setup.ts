import { seedTestData } from './setup/seed';

export default async function globalSetup() {
  console.log('Setting up E2E test environment...');
  await seedTestData();
}
