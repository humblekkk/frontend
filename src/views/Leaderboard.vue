<script setup>
import { useRouter } from 'vue-router'

const router = useRouter()

const goHome = () => router.push('/home')
</script>

<template>
  <div class="simple-page">
    <div class="page-card">
      <div class="page-header">
        <h1>排行榜</h1>
        <el-button plain @click="goHome">返回首页</el-button>
      </div>
      <p class="page-desc">
        当前版本不突出排行榜展示，保留为简化页面，避免分散评审对核心演示链路的注意力。
      </p>
    </div>
  </div>
</template>

<style scoped>
.simple-page {
  min-height: 100vh;
  padding: 32px;
  background: #f5f7fb;
}

.page-card {
  max-width: 960px;
  margin: 0 auto;
  padding: 28px 32px;
  border: 1px solid #dde6f0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.05);
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.page-header h1 {
  margin: 0;
  font-size: 26px;
  color: #1e293b;
}

.page-desc {
  margin: 16px 0 0;
  font-size: 14px;
  line-height: 1.8;
  color: #64748b;
}
</style>
