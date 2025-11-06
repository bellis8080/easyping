#!/usr/bin/env node

/**
 * Generate Supabase JWT tokens with the correct secret
 *
 * Usage: node generate-jwt.js <secret>
 */

const crypto = require('crypto');

const secret = process.argv[2] || 'ocL9Z7KEeurF9xVutOc5Dx7QP3712spomf1AYQJFhe4=';

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateJWT(payload, secret) {
  const header = {
    alg: 'HS256',
    typ: 'JWT'
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signatureInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

// Current timestamp
const iat = Math.floor(Date.now() / 1000);
// Expiry: 10 years from now
const exp = iat + (10 * 365 * 24 * 60 * 60);

// Generate anon key
const anonPayload = {
  role: 'anon',
  iss: 'supabase',
  iat: iat,
  exp: exp
};

// Generate service_role key
const servicePayload = {
  role: 'service_role',
  iss: 'supabase',
  iat: iat,
  exp: exp
};

const anonKey = generateJWT(anonPayload, secret);
const serviceKey = generateJWT(servicePayload, secret);

console.log('Generated JWTs with secret:', secret);
console.log('');
console.log('SUPABASE_ANON_KEY=');
console.log(anonKey);
console.log('');
console.log('SUPABASE_SERVICE_ROLE_KEY=');
console.log(serviceKey);
