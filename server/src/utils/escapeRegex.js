// Use user input inside a RegExp without its special characters changing the pattern
export const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
