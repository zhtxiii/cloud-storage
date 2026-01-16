// 当前路径
let currentPath = '';

// DOM 元素
const fileList = document.getElementById('fileList');
const breadcrumb = document.getElementById('breadcrumb');
const fileInput = document.getElementById('fileInput');
const folderInput = document.getElementById('folderInput');
const dropZone = document.getElementById('dropZone');
const uploadProgress = document.getElementById('uploadProgress');
const progressFill = document.getElementById('progressFill');
const progressText = document.getElementById('progressText');
const newFolderBtn = document.getElementById('newFolderBtn');
const newFolderModal = document.getElementById('newFolderModal');
const folderNameInput = document.getElementById('folderNameInput');
const cancelFolderBtn = document.getElementById('cancelFolderBtn');
const confirmFolderBtn = document.getElementById('confirmFolderBtn');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadFiles();
    setupEventListeners();
});

// 设置事件监听
function setupEventListeners() {
    // 文件上传
    fileInput.addEventListener('change', (e) => uploadFiles(e.target.files));
    folderInput.addEventListener('change', (e) => uploadFiles(e.target.files));

    // 拖拽上传
    dropZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropZone.classList.add('dragover');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('dragover');
    });

    dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('dragover');
        handleDrop(e.dataTransfer);
    });

    // 新建文件夹
    newFolderBtn.addEventListener('click', () => {
        newFolderModal.hidden = false;
        folderNameInput.focus();
    });

    cancelFolderBtn.addEventListener('click', () => {
        newFolderModal.hidden = true;
        folderNameInput.value = '';
    });

    confirmFolderBtn.addEventListener('click', createFolder);

    folderNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') createFolder();
    });

    // 点击模态框背景关闭
    newFolderModal.addEventListener('click', (e) => {
        if (e.target === newFolderModal) {
            newFolderModal.hidden = true;
            folderNameInput.value = '';
        }
    });
}

// 加载文件列表
async function loadFiles() {
    fileList.innerHTML = '<div class="loading">加载中...</div>';

    try {
        const response = await fetch(`/api/files?path=${encodeURIComponent(currentPath)}`);
        const data = await response.json();

        renderBreadcrumb();
        renderFileList(data.files);
    } catch (err) {
        fileList.innerHTML = `<div class="empty-state"><p>加载失败: ${err.message}</p></div>`;
    }
}

// 渲染面包屑导航
function renderBreadcrumb() {
    const parts = currentPath.split('/').filter(p => p);

    let html = '<a href="#" data-path="" class="breadcrumb-item">根目录</a>';
    let path = '';

    parts.forEach((part, index) => {
        path += (path ? '/' : '') + part;
        html += `<span class="breadcrumb-separator">›</span>`;
        html += `<a href="#" data-path="${path}" class="breadcrumb-item">${part}</a>`;
    });

    breadcrumb.innerHTML = html;

    // 绑定点击事件
    breadcrumb.querySelectorAll('.breadcrumb-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            currentPath = item.dataset.path;
            loadFiles();
        });
    });
}

// 渲染文件列表
function renderFileList(files) {
    if (!files || files.length === 0) {
        fileList.innerHTML = `
            <div class="empty-state">
                <span class="empty-icon">📭</span>
                <p>文件夹为空</p>
            </div>
        `;
        return;
    }

    fileList.innerHTML = files.map(file => `
        <div class="file-item" data-name="${file.name}" data-is-dir="${file.isDirectory}">
            <span class="file-icon">${getFileIcon(file)}</span>
            <div class="file-info">
                <div class="file-name">${file.name}</div>
                <div class="file-meta">
                    ${file.isDirectory ? '文件夹' : formatSize(file.size)}
                    · ${formatDate(file.modified)}
                </div>
            </div>
            <div class="file-actions">
                <button class="btn btn-secondary download-btn" title="下载">
                    <span class="icon">⬇️</span>
                </button>
                <button class="btn btn-danger delete-btn" title="删除">
                    <span class="icon">🗑️</span>
                </button>
            </div>
        </div>
    `).join('');

    // 绑定事件
    fileList.querySelectorAll('.file-item').forEach(item => {
        const name = item.dataset.name;
        const isDir = item.dataset.isDir === 'true';

        // 点击进入目录
        item.addEventListener('click', (e) => {
            if (e.target.closest('.file-actions')) return;
            if (isDir) {
                currentPath = currentPath ? `${currentPath}/${name}` : name;
                loadFiles();
            }
        });

        // 下载
        item.querySelector('.download-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            const filePath = currentPath ? `${currentPath}/${name}` : name;
            window.location.href = `/api/download/${encodeURIComponent(filePath)}`;
        });

        // 删除
        item.querySelector('.delete-btn').addEventListener('click', async (e) => {
            e.stopPropagation();
            if (confirm(`确定要删除 "${name}" 吗？`)) {
                await deleteFile(name);
            }
        });
    });
}

// 获取文件图标
function getFileIcon(file) {
    if (file.isDirectory) return '📁';

    const ext = file.name.split('.').pop().toLowerCase();
    const iconMap = {
        // 图片
        'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️', 'webp': '🖼️', 'svg': '🖼️',
        // 视频
        'mp4': '🎬', 'mkv': '🎬', 'avi': '🎬', 'mov': '🎬', 'wmv': '🎬',
        // 音频
        'mp3': '🎵', 'wav': '🎵', 'flac': '🎵', 'aac': '🎵', 'ogg': '🎵',
        // 文档
        'pdf': '📕', 'doc': '📘', 'docx': '📘', 'xls': '📗', 'xlsx': '📗', 'ppt': '📙', 'pptx': '📙',
        'txt': '📄', 'md': '📝',
        // 代码
        'js': '💛', 'ts': '💙', 'py': '🐍', 'java': '☕', 'cpp': '⚡', 'c': '⚡',
        'html': '🌐', 'css': '🎨', 'json': '📋', 'xml': '📋',
        // 压缩
        'zip': '📦', 'rar': '📦', '7z': '📦', 'tar': '📦', 'gz': '📦',
    };

    return iconMap[ext] || '📄';
}

// 格式化文件大小
function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 格式化日期
function formatDate(date) {
    return new Date(date).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// 上传任务队列
class UploadQueue {
    constructor(concurrency = 3) {
        this.concurrency = concurrency;
        this.active = 0;
        this.queue = [];
        this.total = 0;
        this.completed = 0;
        this.failed = 0;
        this.onProgress = null;
        this.onComplete = null;
    }

    add(files) {
        this.queue.push(...files);
        this.total += files.length;
        this.process();
    }

    async process() {
        if (this.queue.length === 0 && this.active === 0) {
            if (this.onComplete) this.onComplete(this.completed, this.failed);
            return;
        }

        while (this.active < this.concurrency && this.queue.length > 0) {
            const file = this.queue.shift();
            this.active++;
            this.uploadOne(file).finally(() => {
                this.active--;
                this.process();
            });
        }
    }

    async uploadOne(file) {
        const formData = new FormData();
        formData.append('currentPath', currentPath);

        // 必须先 append 文本字段，以确保 Multer 能在处理文件前读到
        if (file.webkitRelativePath) {
            formData.append('relativePath', file.webkitRelativePath);
        }

        formData.append('file', file);

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) throw new Error('Upload failed');
            this.completed++;
        } catch (err) {
            console.error(`上传失败: ${file.name}`, err);
            this.failed++;
        }

        if (this.onProgress) {
            this.onProgress(this.completed, this.failed, this.total);
        }
    }
}

// 上传文件
async function uploadFiles(files) {
    if (!files || files.length === 0) return;

    // 显示进度条
    uploadProgress.hidden = false;
    progressFill.style.width = '0%';
    progressText.textContent = `准备上传... 0/${files.length}`;

    const queue = new UploadQueue(3); // 3并发

    queue.onProgress = (completed, failed, total) => {
        const percent = Math.round(((completed + failed) / total) * 100);
        progressFill.style.width = `${percent}%`;
        progressText.textContent = `上传中... ${completed}/${total}`;
        if (failed > 0) {
            progressText.textContent += ` (${failed} 失败)`;
        }
    };

    queue.onComplete = (completed, failed) => {
        progressText.textContent = failed > 0 ?
            `完成: ${completed} 成功, ${failed} 失败` :
            '上传完成！';

        // 延迟刷新和隐藏
        setTimeout(() => {
            uploadProgress.hidden = true;
            loadFiles();
        }, 1000); // 成功后1秒刷新
    };

    // 将 FileList 转为数组
    queue.add(Array.from(files));

    // 清空 input
    fileInput.value = '';
    folderInput.value = '';
}

// 处理拖拽
async function handleDrop(dataTransfer) {
    const items = dataTransfer.items;
    const files = [];

    // 收集所有文件
    for (const item of items) {
        if (item.kind === 'file') {
            const entry = item.webkitGetAsEntry?.() || item.getAsEntry?.();
            if (entry) {
                await traverseEntry(entry, '', files);
            } else {
                files.push(item.getAsFile());
            }
        }
    }

    if (files.length > 0) {
        uploadFiles(files);
    }
}

// 遍历目录入口
async function traverseEntry(entry, path, files) {
    if (entry.isFile) {
        const file = await new Promise((resolve) => entry.file(resolve));
        // 添加相对路径
        Object.defineProperty(file, 'webkitRelativePath', {
            value: path + file.name
        });
        files.push(file);
    } else if (entry.isDirectory) {
        const dirReader = entry.createReader();
        const entries = await new Promise((resolve) => dirReader.readEntries(resolve));
        for (const subEntry of entries) {
            await traverseEntry(subEntry, path + entry.name + '/', files);
        }
    }
}

// 创建文件夹
async function createFolder() {
    const name = folderNameInput.value.trim();
    if (!name) {
        alert('请输入文件夹名称');
        return;
    }

    try {
        const response = await fetch('/api/mkdir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentPath, name })
        });

        if (!response.ok) throw new Error('创建失败');

        newFolderModal.hidden = true;
        folderNameInput.value = '';
        loadFiles();
    } catch (err) {
        alert('创建文件夹失败: ' + err.message);
    }
}

// 删除文件
async function deleteFile(name) {
    const filePath = currentPath ? `${currentPath}/${name}` : name;

    try {
        const response = await fetch(`/api/delete/${encodeURIComponent(filePath)}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('删除失败');

        loadFiles();
    } catch (err) {
        alert('删除失败: ' + err.message);
    }
}
