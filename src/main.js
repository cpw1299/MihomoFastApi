import { createSSRApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { backupManager, backupScheduler } from '@/utils/backup';

export function createApp() {
  const app = createSSRApp(App);
  const pinia = createPinia();
  app.use(pinia);
  
  // 初始化备份管理器（仅在App端）
  // #ifdef APP-PLUS
  backupManager.init().catch(error => {
    console.error('备份管理器初始化失败:', error);
  });
  
  // 启动备份调度器
  backupScheduler.start();
  // #endif
  
  return {
    app,
  };
}
