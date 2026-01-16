/**
 * English Name Address Generator
 * Generates readable email addresses using common English names
 */

import { NAME_POOL } from './data/names';

// Address format types
export type AddressFormat = 'dot' | 'underscore' | 'plain' | 'withDigits';

// Min and max length constraints for generated addresses
const MIN_ADDRESS_LENGTH = 6;
const MAX_ADDRESS_LENGTH = 20;

/**
 * Get a random first name from the name pool
 */
export function getRandomFirstName(): string {
  const index = Math.floor(Math.random() * NAME_POOL.firstNames.length);
  return NAME_POOL.firstNames[index];
}

/**
 * Get a random last name from the name pool
 */
export function getRandomLastName(): string {
  const index = Math.floor(Math.random() * NAME_POOL.lastNames.length);
  return NAME_POOL.lastNames[index];
}

/**
 * Generate random digits (2-3 digits)
 */
function generateRandomDigits(): string {
  const numDigits = Math.random() < 0.5 ? 2 : 3;
  let digits = '';
  for (let i = 0; i < numDigits; i++) {
    digits += Math.floor(Math.random() * 10).toString();
  }
  return digits;
}

/**
 * Get a random address format
 */
function getRandomFormat(): AddressFormat {
  const formats: AddressFormat[] = ['dot', 'underscore', 'plain', 'withDigits'];
  return formats[Math.floor(Math.random() * formats.length)];
}

/**
 * Format a name-based address using the specified format
 * Formats:
 * - dot: firstname.lastname
 * - underscore: firstname_lastname
 * - plain: firstnamelastname
 * - withDigits: firstnamelastname + 2-3 random digits
 */
export function formatNameAddress(
  firstName: string,
  lastName: string,
  format: AddressFormat
): string {
  const first = firstName.toLowerCase();
  const last = lastName.toLowerCase();

  switch (format) {
    case 'dot':
      return `${first}.${last}`;
    case 'underscore':
      return `${first}_${last}`;
    case 'plain':
      return `${first}${last}`;
    case 'withDigits':
      return `${first}${last}${generateRandomDigits()}`;
    default:
      return `${first}${last}`;
  }
}

/**
 * Check if an address meets length requirements
 */
function isValidLength(address: string): boolean {
  return address.length >= MIN_ADDRESS_LENGTH && address.length <= MAX_ADDRESS_LENGTH;
}

/**
 * Generate a name-based email address
 * Ensures the address is lowercase and between 6-20 characters
 */
export function generateNameAddress(): string {
  const maxAttempts = 50;
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const firstName = getRandomFirstName();
    const lastName = getRandomLastName();
    const format = getRandomFormat();
    
    const address = formatNameAddress(firstName, lastName, format);
    
    if (isValidLength(address)) {
      return address;
    }
    
    // If plain format is too short, try with digits
    if (address.length < MIN_ADDRESS_LENGTH) {
      const addressWithDigits = formatNameAddress(firstName, lastName, 'withDigits');
      if (isValidLength(addressWithDigits)) {
        return addressWithDigits;
      }
    }
    
    // If address is too long, try plain format (shortest)
    if (address.length > MAX_ADDRESS_LENGTH) {
      const plainAddress = formatNameAddress(firstName, lastName, 'plain');
      if (isValidLength(plainAddress)) {
        return plainAddress;
      }
    }
  }
  
  // Fallback: generate a simple valid address
  // Pick short names to ensure we meet length requirements
  const shortFirstNames = NAME_POOL.firstNames.filter(n => n.length <= 6);
  const shortLastNames = NAME_POOL.lastNames.filter(n => n.length <= 6);
  
  const firstName = shortFirstNames[Math.floor(Math.random() * shortFirstNames.length)] || 'john';
  const lastName = shortLastNames[Math.floor(Math.random() * shortLastNames.length)] || 'doe';
  
  return formatNameAddress(firstName, lastName, 'plain');
}
