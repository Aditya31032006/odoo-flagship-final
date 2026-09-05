export const CREATE_USER = `INSERT INTO users (name, email, password_hash, profile_photo_base64) VALUES ($1, $2, $3, $4) RETURNING name , email , profile_photo_base64`

export const FIND_USER = `SELECT * FROM users WHERE email = $1`;

export const UPDATE_PASSWORD = `UPDATE users SET password_hash = $1 WHERE email = $2 RETURNING name, email`;