// various common derivations of chunk size
export const CHUNK_BITSHIFT = 6;
export const CHUNK_SIZE = 1 << CHUNK_BITSHIFT;
/**
 * for use in quick modulo
 * n & CHUNK_MODMASK == n % CHUNK_SIZE
 */
export const CHUNK_MODMASK = CHUNK_SIZE - 1; // 0b11111
/**
 * Chunk size minus one
 */
export const CHUNK_SIZEm1 = CHUNK_SIZE - 1;
/**
 * Chunk size squared
 */
export const CHUNK_SIZE2 = CHUNK_SIZE * CHUNK_SIZE;
export const CHUNK_MODMASK2 = CHUNK_SIZE2 - 1;
/**
 * Chunk size squared, minus 1
 */
export const CHUNK_SIZE2m1 = (CHUNK_SIZE * CHUNK_SIZE) - 1;
