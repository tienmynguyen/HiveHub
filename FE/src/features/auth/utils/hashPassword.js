import { sha256 } from 'js-sha256';

export function hashPassword(value) {
    return sha256(String(value ?? ''));
}

