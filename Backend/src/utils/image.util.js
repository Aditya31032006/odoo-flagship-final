/**
 * Converts a multer file buffer to a Base64 string with its mimetype.
 * @param {Express.Multer.File} file 
 * @returns {string | null}
 */
export const processImageToBase64 = (file) => {
    if (!file) return null;
    const base64Str = file.buffer.toString("base64");
    return `data:${file.mimetype};base64,${base64Str}`;
};
