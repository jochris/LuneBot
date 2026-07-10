import fs from 'fs';
import path from 'path';

const filePath = path.join(process.cwd(), 'node_modules', '@itsliaaa', 'baileys', 'lib', 'Utils', 'rich-message-utils.js');

if (fs.existsSync(filePath)) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        
        const target = "        if (code) {\n            language ||= 'javascript';\n            submessages.push({\n                messageType: RichSubMessageType.CODE,\n                codeMetadata: {\n                    codeLanguage: language,\n                    codeBlocks: tokenizeCode(code, language)\n                }\n            });\n        }";
        
        const replacement = "        if (code) {\n            const lang = language || 'javascript';\n            submessages.push({\n                messageType: RichSubMessageType.CODE,\n                codeMetadata: {\n                    codeLanguage: lang,\n                    codeBlocks: tokenizeCode(code, lang)\n                }\n            });\n        }";

        if (content.includes(target)) {
            content = content.replace(target, replacement);
            fs.writeFileSync(filePath, content, 'utf8');
            console.log('✓ Successfully patched @itsliaaa/baileys for Bun compatibility.');
        } else if (content.includes('const lang = language || \'javascript\';')) {
            console.log('✓ @itsliaaa/baileys is already patched.');
        } else {
            console.warn('⚠ Baileys target code pattern not found. It might have been updated or already modified.');
        }
    } catch (error) {
        console.error('✗ Failed to patch @itsliaaa/baileys:', error.message);
    }
} else {
    console.log('ℹ node_modules/@itsliaaa/baileys not found. Skipping patch.');
}
