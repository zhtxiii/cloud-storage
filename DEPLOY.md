# 🚀 Ubuntu 服务器部署指南

当然可以！将这个云盘项目部署到 Ubuntu 服务器非常简单。以下是详细的操作步骤。

## ⚠️ 安全警告 (非常重要)

**注意**：当前的云盘项目是一个**演示版本**，**没有任何登录验证功能**。
如果直接部署到公网服务器，任何人都可以访问、上传或删除你的文件！

**建议方案**：
1.  **仅在内网使用**：通过 VPN 访问，或者仅对特定 IP 开放端口。
2.  **配置 Nginx 密码保护**：使用 Nginx 的 `auth_basic` 功能添加一层简单的用户名/密码验证（下文会介绍）。

---

## 第一步：环境准备

连接到你的 Ubuntu 服务器，执行以下命令安装 Node.js 和 NPM。

```bash
# 更新系统包列表
sudo apt update

# 安装 Node.js (以 v18 为例)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node -v
npm -v
```

## 第二步：上传代码

你可以通过 `git` 或 `scp` 将代码传到服务器。假设我们将代码放在 `/var/www/pan` 目录。

```bash
# 创建目录
sudo mkdir -p /var/www/pan
sudo chown -R $USER:$USER /var/www/pan
```

然后将你本地的项目文件上传到该目录（排除 `node_modules` 和 `storage`）。

## 第三步：安装依赖与测试

进入项目目录并安装依赖：

```bash
cd /var/www/pan
npm install

# 临时启动测试一下 (按 Ctrl+C 停止)
npm start
```

如果看到 "云盘服务器已启动"，说明运行正常。

## 第四步：使用 PM2 后台运行

为了让服务在后台稳定运行，并且崩溃自动重启，我们使用 `pm2`。

```bash
# 全局安装 PM2
sudo npm install -g pm2

# 启动项目 (指定名称为 cloud-pan)
pm2 start server.js --name "cloud-pan"

# 保存当前进程列表，以便开机自启
pm2 save
pm2 startup
```

现在，你的服务已经在后台运行在 `3000` 端口了。

## 第五步：(可选) 配置 Nginx 反向代理与密码保护

为了通过域名访问（例如 `http://pan.yourdomain.com`）并添加基础的密码验证，我们使用 Nginx。

### 1. 安装 Nginx / Apache2-utils
```bash
sudo apt install nginx apache2-utils
```

### 2. 生成密码文件
我们需要创建一个用户名和密码，用于登录云盘。将 `your_username` 替换为你想要的用户名。
```bash
sudo htpasswd -c /etc/nginx/.htpasswd your_username
# 输入两次密码
```

### 3. 配置 Nginx
创建新的配置文件：
```bash
sudo nano /etc/nginx/sites-available/cloud-pan
```

粘贴以下内容（修改 `server_name` 为你的 IP 或域名）：

```nginx
server {
    listen 80;
    server_name your_domain_or_ip;  # 替换成你的域名或公网IP

    # 设置上传文件大小限制 (例如 100M)
    client_max_body_size 100M;

    location / {
        # 开启密码验证
        auth_basic "Restricted Access";
        auth_basic_user_file /etc/nginx/.htpasswd;

        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 4. 启用配置并重启
```bash
# 建立软链接
sudo ln -s /etc/nginx/sites-available/cloud-pan /etc/nginx/sites-enabled/

# 检查配置是否正确
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

---

## 🎉 完成！

现在，在浏览器访问 `http://你的IP` 或域名。
你应该会先看到一个弹窗要求输入用户名和密码，验证通过后即可使用你的私有云盘！
