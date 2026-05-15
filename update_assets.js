const fs = require('fs');
const path = require('path');

const projectRoot = __dirname;
const folders = fs.readdirSync(projectRoot).filter(f => 
    fs.statSync(path.join(projectRoot, f)).isDirectory() && f.startsWith('assets_')
);

fs.writeFileSync(path.join(projectRoot, 'folders.json'), JSON.stringify(folders, null, 2));

folders.forEach(folder => {
    const folderPath = path.join(projectRoot, folder);
    const files = fs.readdirSync(folderPath).filter(f => {
        const ext = f.split('.').pop().toLowerCase();
        return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm', 'mov', 'pdf'].includes(ext);
    });
    fs.writeFileSync(path.join(folderPath, 'assets.json'), JSON.stringify(files, null, 2));
});
console.log("Updated folders.json and assets.json for all assets_* folders.");
