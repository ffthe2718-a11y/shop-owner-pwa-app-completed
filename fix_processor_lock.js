const fs = require('fs');
const file = 'src/lib/ownerPreferenceSyncProcessor.ts';
let content = fs.readFileSync(file, 'utf8');

content = content.replace('const activeSyncLocks = new Set<string>();', 'const isPreferenceSyncRunning = new Set<string>();');
content = content.replace(/activeSyncLocks/g, 'isPreferenceSyncRunning');

fs.writeFileSync(file, content);
console.log("Replaced successfully");
