const express = require('express');
const multer = require('multer');
const archiver = require('archiver');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const STORAGE_DIR = path.join(__dirname, 'storage');

// 确保存储目录存在
if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
}

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// 配置文件上传
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // 获取相对路径目录
        const relativePath = req.body.relativePath || '';
        const dir = path.dirname(relativePath);
        const targetDir = path.join(STORAGE_DIR, req.body.currentPath || '', dir);

        // 确保目录存在
        fs.mkdirSync(targetDir, { recursive: true });
        cb(null, targetDir);
    },
    filename: (req, file, cb) => {
        // 处理中文文件名
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, path.basename(originalName));
    }
});

const upload = multer({ storage });

// 获取文件列表
app.get('/api/files', (req, res) => {
    const currentPath = req.query.path || '';
    const targetDir = path.join(STORAGE_DIR, currentPath);

    // 安全检查：确保路径在存储目录内
    if (!targetDir.startsWith(STORAGE_DIR)) {
        return res.status(403).json({ error: '访问被拒绝' });
    }

    if (!fs.existsSync(targetDir)) {
        return res.json({ files: [], currentPath });
    }

    try {
        const items = fs.readdirSync(targetDir);
        const files = items.map(name => {
            const fullPath = path.join(targetDir, name);
            const stats = fs.statSync(fullPath);
            return {
                name,
                isDirectory: stats.isDirectory(),
                size: stats.size,
                modified: stats.mtime
            };
        });

        // 排序：目录在前，文件在后
        files.sort((a, b) => {
            if (a.isDirectory && !b.isDirectory) return -1;
            if (!a.isDirectory && b.isDirectory) return 1;
            return a.name.localeCompare(b.name);
        });

        res.json({ files, currentPath });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 上传文件 (改为单文件处理，由前端并发控制)
app.post('/api/upload', upload.single('file'), (req, res) => {
    res.json({ success: true });
});

// 下载文件
app.get('/api/download/*', (req, res) => {
    const filePath = req.params[0];
    const fullPath = path.join(STORAGE_DIR, filePath);

    // 安全检查
    if (!fullPath.startsWith(STORAGE_DIR)) {
        return res.status(403).json({ error: '访问被拒绝' });
    }

    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: '文件不存在' });
    }

    const stats = fs.statSync(fullPath);

    if (stats.isDirectory()) {
        // 目录打包为 zip 下载
        const archive = archiver('zip', { zlib: { level: 9 } });
        const dirName = path.basename(fullPath);

        res.attachment(`${dirName}.zip`);
        archive.pipe(res);
        archive.directory(fullPath, dirName);
        archive.finalize();
    } else {
        // 文件直接下载
        res.download(fullPath);
    }
});

// 创建目录
app.post('/api/mkdir', (req, res) => {
    const { currentPath, name } = req.body;
    const targetDir = path.join(STORAGE_DIR, currentPath || '', name);

    // 安全检查
    if (!targetDir.startsWith(STORAGE_DIR)) {
        return res.status(403).json({ error: '访问被拒绝' });
    }

    try {
        fs.mkdirSync(targetDir, { recursive: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 删除文件或目录
app.delete('/api/delete/*', (req, res) => {
    const filePath = req.params[0];
    const fullPath = path.join(STORAGE_DIR, filePath);

    // 安全检查
    if (!fullPath.startsWith(STORAGE_DIR) || fullPath === STORAGE_DIR) {
        return res.status(403).json({ error: '访问被拒绝' });
    }

    if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ error: '文件不存在' });
    }

    try {
        fs.rmSync(fullPath, { recursive: true });
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`云盘服务器已启动: http://localhost:${PORT}`);
});
