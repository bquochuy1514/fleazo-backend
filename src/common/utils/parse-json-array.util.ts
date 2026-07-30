import { BadRequestException } from '@nestjs/common';

/**
 * Parses a multipart/form-data text field (raw JSON string) into an array;
 * throws a friendly Vietnamese error if missing, invalid, or not an array.
 */
export function parseJsonArray<T>(
  raw: string | undefined,
  fieldName: string,
): T[] {
  // 1. Empty/undefined is valid — means "no explicit instruction"
  if (!raw) return [];

  // 2. Must be valid JSON and must be an array
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      throw new Error('not an array');
    }
    return parsed as T[];
  } catch {
    throw new BadRequestException(`${fieldName} không đúng định dạng`);
  }
}
