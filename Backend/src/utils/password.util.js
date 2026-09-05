import argon2 from 'argon2'

export const hashPassword = async (password) => {
    try {
        return await argon2.hash(password)
    } catch (error) {
        console.error("Error in hashPassword:", error);
        throw error;
    }
}

export const verifyPassword = async (password, hash) => {
    try {
        return await argon2.verify(hash, password)
    } catch (error) {
        console.error("Error in verifyPassword:", error);
        throw error;
    }
}

/**
 * Generate a random secure temporary password
 */
export const generateRandomPassword = (length = 10) => {
    const uppercase = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowercase = 'abcdefghijkmnpqrstuvwxyz';
    const numbers = '23456789';
    const symbols = '@#$!%*';
    const allChars = uppercase + lowercase + numbers + symbols;

    let password = '';
    // Ensure at least one character from each character class
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += symbols[Math.floor(Math.random() * symbols.length)];

    for (let i = 4; i < length; i++) {
        password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle characters
    return password.split('').sort(() => 0.5 - Math.random()).join('');
}