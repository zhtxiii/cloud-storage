# 🍎 macOS 本地服务器部署记录

这份文档记录了在本机 (local machine, IP: `192.168.x.x`) 上部署云盘服务的详细过程。

## 1. 环境准备

确保处于项目根目录：
```bash
cd /path/to/pan
```

安装项目依赖：
```bash
npm install
```

## 2. 安装进程管理工具 (PM2)

为了处理复杂的环境变量路径（如 Wine 相关的带空格路径），我们需要**全局安装** PM2：

```bash
sudo npm install -g pm2
```

## 3. 启动服务

启动应用并命名为 `cloud-pan`：

```bash
pm2 start server.js --name "cloud-pan"
```

此时服务已运行在端口 `3000`。
- 本机访问：[http://localhost:3000](http://localhost:3000)
- 局域网访问：`http://192.168.x.x:3000`

## 4. 配置开机自启 (关键步骤)

在 macOS 上配置 `launchd` 自启动时，由于系统环境变量中包含带空格的路径，**必须使用双引号包裹 PATH**。

请**完整复制**并运行以下命令：

```bash
sudo env PATH="$PATH:/opt/homebrew/Cellar/node/25.2.1/bin" /opt/homebrew/lib/node_modules/pm2/bin/pm2 startup launchd -u example --hp /Users/example
```

> **注意**：如果未来 Node.js 版本变化，路径中的 `25.2.1` 可能需要调整。

## 5. 保存当前状态

确保当前服务列表被保存，以便下次开机自动恢复：

```bash
pm2 save
```

## 🛠日常维护命令

- **查看服务状态**：
  ```bash
  pm2 status
  ```
- **查看实时日志** (排查报错)：
  ```bash
  pm2 logs cloud-pan
  ```
- **重启服务** (代码修改后)：
  ```bash
  pm2 restart cloud-pan
  ```
- **停止服务**：
  ```bash
  pm2 stop cloud-pan
  ```
- **移除开机自启**：
  ```bash
  pm2 unstartup launchd
  ```
