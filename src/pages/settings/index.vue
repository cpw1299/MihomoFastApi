<template>
  <view class="settings-container">
    <!-- 数据管理区域 -->
    <view class="section-container">
      <text class="section-title">数据管理</text>
      
      <view class="data-actions">
        <button @click="exportData" class="action-btn export-btn">
          <text class="btn-icon">📤</text>
          <text class="btn-text">导出数据</text>
        </button>
        
        <button @click="importData" class="action-btn import-btn">
          <text class="btn-icon">📥</text>
          <text class="btn-text">导入数据</text>
        </button>
      </view>

      <view class="backup-settings">
        <view class="setting-row" @click="goToBackupPage">
          <text class="setting-label">备份管理</text>
          <view class="setting-arrow">
            <text>管理备份文件</text>
            <text class="arrow">›</text>
          </view>
        </view>
        
        <view class="setting-row">
          <text class="setting-label">自动备份</text>
          <switch :checked="store.settings.autoUpload" @change="toggleAutoUpload" />
        </view>
        
        <view class="setting-row">
          <text class="setting-label">服务器类型</text>
          <picker
            mode="selector"
            :range="serverTypes"
            :value="serverTypeIndex"
            @change="onServerTypeChange"
            class="mini-picker"
          >
            <view class="picker-display">
              <text>{{ store.settings.serverType }}</text>
              <text class="picker-arrow">▼</text>
            </view>
          </picker>
        </view>
        
        <view class="setting-row">
          <text class="setting-label">服务器地址</text>
          <input
            type="text"
            v-model="store.settings.serverUrl"
            placeholder="请输入服务器地址"
            class="setting-input"
            @blur="saveSettings"
          />
        </view>
        
        <view class="setting-row">
          <text class="setting-label">远程路径</text>
          <input
            type="text"
            v-model="store.settings.remotePath"
            placeholder="请输入远程路径"
            class="setting-input"
            @blur="saveSettings"
          />
        </view>
      </view>
    </view>

    <!-- 应用设置区域 -->
    <view class="section-container">
      <text class="section-title">应用设置</text>
      
      <view class="app-info">
        <view class="info-row">
          <text class="info-label">应用名称</text>
          <text class="info-value">手工账簿</text>
        </view>
        <view class="info-row">
          <text class="info-label">版本号</text>
          <text class="info-value">v1.0.0</text>
        </view>
      </view>

      <view class="danger-zone">
        <button @click="clearData" class="danger-btn">
          <text class="btn-icon">🗑️</text>
          <text class="btn-text">清空所有数据</text>
        </button>
      </view>
    </view>

    <!-- 备份列表 -->
    <view class="section-container" v-if="store.backups.length > 0">
      <text class="section-title">备份记录</text>
      <view class="backup-list">
        <view v-for="backup in store.backups" :key="backup.fileName" class="backup-item">
          <view class="backup-info">
            <text class="backup-name">{{ backup.fileName }}</text>
            <text class="backup-time">{{ formatBackupTime(backup.generatedAt) }}</text>
          </view>
          <text class="backup-status" :class="backup.uploadStatus">{{ backup.uploadStatus }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '@/stores/app';

const store = useAppStore();
const serverTypes = ['webdav', 'http', 'sftp'];

const serverTypeIndex = computed(() => {
  return serverTypes.indexOf(store.settings.serverType);
});

function toggleAutoUpload(e) {
  store.saveSettings({ autoUpload: e.detail.value });
}

function onServerTypeChange(e) {
  const index = e.detail.value;
  if (index >= 0 && index < serverTypes.length) {
    store.saveSettings({ serverType: serverTypes[index] });
  }
}

function saveSettings() {
  store.saveSettings({
    serverUrl: store.settings.serverUrl,
    remotePath: store.settings.remotePath
  });
}

function exportData() {
  const data = store.exportData();
  const fileName = `backup_${new Date().toISOString().slice(0, 10)}_${Date.now()}.json`;
  
  // #ifdef H5
  // H5平台使用浏览器下载
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
  uni.showToast({ title: '导出成功', icon: 'success' });
  // #endif
  
  // #ifndef H5
  // 非H5平台保存到本地文件
  const filePath = `${uni.env.USER_DATA_PATH}/${fileName}`;
  uni.getFileSystemManager().writeFile({
    filePath: filePath,
    data: data,
    encoding: 'utf8',
    success: () => {
      uni.saveFile({
        tempFilePath: filePath,
        success: (res) => {
          uni.showToast({ 
            title: '导出成功，文件已保存', 
            icon: 'success' 
          });
        }
      });
    },
    fail: () => {
      uni.showToast({ title: '导出失败', icon: 'none' });
    }
  });
  // #endif
}

function importData() {
  // #ifdef H5
  // H5平台使用input file
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importResult = store.importData(event.target.result);
        if (importResult.ok) {
          uni.showToast({ 
            title: `导入成功：${importResult.productCount}个产品，${importResult.recordCount}条记录`, 
            icon: 'success' 
          });
        } else {
          uni.showToast({ title: importResult.message, icon: 'none' });
        }
      } catch (error) {
        uni.showToast({ title: '文件读取失败', icon: 'none' });
      }
    };
    reader.readAsText(file);
  };
  input.click();
  // #endif
  
  // #ifndef H5
  // 非H5平台使用uni.chooseFile
  uni.chooseFile({
    count: 1,
    type: 'file',
    extension: ['.json'],
    success: (res) => {
      const filePath = res.tempFiles[0].path;
      uni.getFileSystemManager().readFile({
        filePath: filePath,
        encoding: 'utf8',
        success: (result) => {
          const importResult = store.importData(result.data);
          if (importResult.ok) {
            uni.showToast({ 
              title: `导入成功：${importResult.productCount}个产品，${importResult.recordCount}条记录`, 
              icon: 'success' 
            });
          } else {
            uni.showToast({ title: importResult.message, icon: 'none' });
          }
        },
        fail: () => {
          uni.showToast({ title: '读取文件失败', icon: 'none' });
        }
      });
    }
  });
  // #endif
}

function clearData() {
  uni.showModal({
    title: '警告',
    content: '确定要清空所有数据吗？此操作不可恢复！',
    confirmText: '确定',
    cancelText: '取消',
    confirmColor: '#dc3545',
    success: (res) => {
      if (res.confirm) {
        try {
          store.clearAllData();
          uni.showToast({
            title: '数据已清空',
            icon: 'success',
          });
          
          setTimeout(() => {
            uni.reLaunch({
              url: '/pages/home/index',
            });
          }, 1500);
        } catch (error) {
          uni.showToast({
            title: '清空失败',
            icon: 'none',
          });
        }
      }
    },
  });
}

function formatBackupTime(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  
  return `${year}年${month}月${day}日 ${hours}:${minutes}:${seconds}`;
}

onMounted(() => {
  store.initProducts();
  store.initRecords();
});
</script>

<style scoped>
.settings-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20rpx;
}

.section-container {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #34495e;
  margin-bottom: 30rpx;
  display: block;
}

.data-actions {
  display: flex;
  gap: 30rpx;
  margin-bottom: 40rpx;
}

.action-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40rpx 20rpx;
  border: none;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 600;
  transition: all 0.3s ease;
}

.export-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  box-shadow: 0 8rpx 25rpx rgba(102, 126, 234, 0.3);
}

.import-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  box-shadow: 0 8rpx 25rpx rgba(240, 147, 251, 0.3);
}

.action-btn:active {
  transform: translateY(2rpx);
}

.btn-icon {
  font-size: 48rpx;
  margin-bottom: 10rpx;
}

.btn-text {
  font-size: 28rpx;
}

.backup-settings {
  border-top: 2rpx solid #e9ecef;
  padding-top: 30rpx;
}

.setting-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f8f9fa;
}

.setting-row:last-child {
  border-bottom: none;
}

.setting-label {
  font-size: 32rpx;
  color: #495057;
  font-weight: 500;
}

.mini-picker {
  background: #f8f9fa;
  border: 2rpx solid #e9ecef;
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
}

.picker-display {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.picker-arrow {
  color: #6c757d;
  font-size: 20rpx;
}

.setting-input {
  background: #f8f9fa;
  border: 2rpx solid #e9ecef;
  border-radius: 12rpx;
  padding: 16rpx 24rpx;
  font-size: 28rpx;
  color: #495057;
  width: 300rpx;
  text-align: right;
}

.app-info {
  margin-bottom: 40rpx;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f8f9fa;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 32rpx;
  color: #495057;
  font-weight: 500;
}

.info-value {
  font-size: 28rpx;
  color: #6c757d;
}

.danger-zone {
  border-top: 2rpx solid #e9ecef;
  padding-top: 30rpx;
}

.danger-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  color: white;
  border: none;
  border-radius: 16rpx;
  padding: 30rpx;
  font-size: 32rpx;
  font-weight: 600;
  box-shadow: 0 8rpx 25rpx rgba(255, 107, 107, 0.3);
}

.danger-btn:active {
  transform: translateY(2rpx);
}

.backup-list {
  margin-top: 30rpx;
}

.backup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f8f9fa;
}

.backup-item:last-child {
  border-bottom: none;
}

.backup-info {
  flex: 1;
}

.backup-name {
  font-size: 28rpx;
  color: #495057;
  font-weight: 500;
  display: block;
}

.backup-time {
  font-size: 24rpx;
  color: #6c757d;
  display: block;
}

.backup-status {
  font-size: 24rpx;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
}

.backup-status.pending {
  background-color: #ffc107;
  color: #333;
}

.backup-status.success {
  background-color: #28a745;
  color: white;
}

.backup-status.failed {
  background-color: #dc3545;
  color: white;
}
</style>