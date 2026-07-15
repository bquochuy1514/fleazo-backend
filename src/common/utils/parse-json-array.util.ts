import { BadRequestException } from '@nestjs/common';

/**
 * Parses a JSON string (typically sent as a text field in multipart/form-data
 * requests, where arrays/objects arrive as raw strings) into an array.
 * Throws a friendly Vietnamese BadRequestException if the value is missing,
 * not valid JSON, or not an array.
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
