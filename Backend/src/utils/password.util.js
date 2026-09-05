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