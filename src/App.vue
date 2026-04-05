<template>
  <div class="app-shell">
    <router-view />
  </div>
</template>

<style>
:root {
  color-scheme: light;
  --app-bg: #f5f7fb;
  --app-text: #1f2d3d;
  --app-muted: #6f8194;
  --app-radius: 12px;
  --app-border: #dce6f2;
  --app-primary: #409eff;
}

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC",
    sans-serif;
  color: var(--app-text);
  background: var(--app-bg);
}

#app {
  min-height: 100vh;
}

.app-shell {
  min-height: 100vh;
  padding: 16px;
}

button,
.el-button {
  border-radius: var(--app-radius);
}
</style>
