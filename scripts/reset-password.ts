/**
 * MediGo Administrative Password Reset Tool
 *
 * Usage:
 *   npx tsx scripts/reset-password.ts <user-email>
 *
 * Password Input Options:
 *   1. Interactive hidden prompt (standard CLI, characters will not echo to screen)
 *   2. Environment variable:
 *      RESET_PASSWORD="YourSecurePassword123!" npx tsx scripts/reset-password.ts <user-email>
 *
 * Security Requirements:
 *   - Password must be between 12 and 128 characters.
 *   - Salted and hashed using bcrypt with work factor cost 12.
 *   - Updates the target user in both Supabase and the local persistence store.
 *   - Password is never echoed to stdout/stderr or logged.
 */

import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { dbService } from '../src/server/db';

dotenv.config();

function promptHiddenPassword(promptText: string): Promise<string> {
  return new Promise((resolve, reject) => {
    process.stdout.write(promptText);
    const stdin = process.stdin;

    if (stdin.isTTY && typeof stdin.setRawMode === 'function') {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf-8');
      let pwd = '';

      const onData = (buffer: Buffer | string) => {
        const char = buffer.toString();
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004':
            stdin.setRawMode(false);
            stdin.pause();
            stdin.removeListener('data', onData);
            process.stdout.write('\n');
            resolve(pwd);
            break;
          case '\u0003': // Ctrl+C
            stdin.setRawMode(false);
            process.stdout.write('\n');
            process.exit(130);
            break;
          case '\u007f': // Backspace
          case '\b':
            if (pwd.length > 0) {
              pwd = pwd.slice(0, -1);
            }
            break;
          default:
            pwd += char;
            break;
        }
      };

      stdin.on('data', onData);
    } else {
      // Non-interactive fallback: read from stdin stream
      let input = '';
      stdin.resume();
      stdin.setEncoding('utf-8');

      const onChunk = (chunk: string) => {
        input += chunk;
        if (input.includes('\n') || input.includes('\r')) {
          stdin.pause();
          stdin.removeListener('data', onChunk);
          resolve(input.trim());
        }
      };

      stdin.on('data', onChunk);
      stdin.on('end', () => resolve(input.trim()));
      stdin.on('error', reject);
    }
  });
}

async function main() {
  const emailArg = process.argv[2]?.trim();

  if (!emailArg) {
    console.error('Usage: npx tsx scripts/reset-password.ts <user-email>');
    console.error('Example: npx tsx scripts/reset-password.ts hans.schmidt@medigo-hessen.de');
    process.exit(1);
  }

  let newPassword = process.env.RESET_PASSWORD || '';

  if (!newPassword) {
    newPassword = await promptHiddenPassword(`Enter new password for [${emailArg}]: `);
  }

  if (newPassword.length < 12 || newPassword.length > 128) {
    console.error('[Error] Password validation failed: Password must be between 12 and 128 characters.');
    process.exit(1);
  }

  // Lookup user in database
  const user = await dbService.getUserByEmail(emailArg);
  if (!user) {
    console.error(`[Error] User not found with email: ${emailArg}`);
    process.exit(1);
  }

  // Hash with bcrypt work factor cost 12
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(newPassword, salt);

  // Update through DB layer (updates memory, local JSON store, and Supabase)
  await dbService.updateUser(user.id, { passwordHash });

  console.log(`[Success] Password successfully reset for user: ${user.name} (${user.email}) [Role: ${user.role}]`);
  process.exit(0);
}

main().catch((err) => {
  console.error('[Fatal Error] Failed to reset password:', err?.message || err);
  process.exit(1);
});
