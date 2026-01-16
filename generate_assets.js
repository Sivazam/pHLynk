const fs = require('fs');
const path = require('path');

const logoPath = path.join(__dirname, 'public', 'logoMain.png');
const outputPath = path.join(__dirname, 'src', 'constants', 'assets.ts');

try {
    if (fs.existsSync(logoPath)) {
        const image = fs.readFileSync(logoPath);
        const base64Image = Buffer.from(image).toString('base64');

        const fileContent = `// Auto-generated asset file
// This ensures the logo is available offline without network requests
export const LOGO_BASE64 = "data:image/png;base64,${base64Image}";
`;

        // Create directory if not exists
        const dir = path.dirname(outputPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }

        fs.writeFileSync(outputPath, fileContent);
        console.log('Asset file generated at ' + outputPath);
    } else {
        console.error('Logo file not found at ' + logoPath);
    }
} catch (error) {
    console.error('Error generating asset file:', error);
}
