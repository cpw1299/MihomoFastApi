<script>
// import { backupManager, backupScheduler } from '@/utils/backup';
import { useAppStore } from '@/stores/app';

export default {
  onLaunch: function () {
    // 初始化数据
    const store = useAppStore();
    store.initProducts();
    store.initRecords();
  },
  // onShow: function () {
  //   console.log('App Show');
    
  //   // 应用显示时检查是否需要备份
  //   // #ifdef APP-PLUS
  //   // backupManager.checkAndBackup();
  //   // #endif
  // },
  // onHide: function () {
  //   console.log('App Hide');
  // },
  // onUnload: function () {
  //   console.log('App Unload');
    
  //   // 应用卸载时停止备份服务
  //   // #ifdef APP-PLUS
  //   // backupManager.stopAutoBackup();
  //   // backupScheduler.stop();
  //   // #endif
  // },
};
</script>

<style>
/*每个页面公共css */
</style>
