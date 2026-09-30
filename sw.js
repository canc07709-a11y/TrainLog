/* 训练日志 · Service Worker
 * 策略：网络优先 —— 在线时永远拿最新的，断网才回退缓存。
 * 这样「改完上传新版」能立刻生效（GitHub Pages 是静态托管，靠 SW 缓存会挡住更新）。
 * 新增/删除下面的 ASSETS 文件时，记得把 CACHE 版本号 +1（trainlog-v2）。
 */
var CACHE = "trainlog-v1";
var ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable-512.png"
];

/* 安装：把清单里的文件预先缓存下来，离线才能用 */
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

/* 激活：清掉旧版本的缓存，然后立刻接管页面 */
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (ks) {
        return Promise.all(
          ks.filter(function (k) { return k !== CACHE; })
            .map(function (k) { return caches.delete(k); })
        );
      })
      .then(function () { return self.clients.claim(); })
  );
});

/* 取用：网络优先 */
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      // 只缓存正常的同源响应，别把错误页 / 跨域 opaque 响应塞进缓存
      if (res && res.ok && res.type === "basic") {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      }
      return res;
    }).catch(function () {
      // 断网：先用同 URL 的缓存，再兜底到首页
      return caches.match(e.request).then(function (r) {
        return r || caches.match("./index.html");
      });
    })
  );
});
