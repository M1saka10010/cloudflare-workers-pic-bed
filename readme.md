# 一个用 Cloudflare Workers + KV 搭建的屎山图床

## 使用方法

1. 注册 Cloudflare 账号

2. 在 Cloudflare 中添加一个 Worker

3. 将`index.js`中的 `password` 修改为你的密码

4. 新建一个 KV 命名空间

5. 在刚刚新建的 Worker 中添加 KV 命名空间为`data`的绑定
