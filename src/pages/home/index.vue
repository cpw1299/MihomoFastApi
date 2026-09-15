<template>
  <view class="home-container">
    <!-- 页面头部 -->
    <view class="page-header">
      <view class="date-selector" @click="showDatePicker">
        <text class="selected-date">{{ displayDate }}</text>
        <text class="date-hint">📅 点击选择日期</text>
      </view>
    </view>

    <!-- 主要内容区域 -->
    <view class="main-content">
      <!-- 工件选择区域 - 为年长用户优化 -->
      <view class="product-selection-section">
        <ProductSelector
          :products="products"
          :selected-product-id="selectedProductId"
          @select-product="handleProductSelect"
          @clear-selection="handleClearSelection"
        />
      </view>

      <!-- 数量输入区域 - 支持手动输入 -->
      <view class="quantity-section">
        <QuantityInputEnhanced
          v-model="quantity"
          :max-quantity="9999"
        />
      </view>

      <!-- 金额显示 -->
      <view class="amount-section">
        <text class="amount-label">{{ isToday ? '今天能赚' : '当天能赚' }}</text>
        <view class="amount-display">
          <text class="amount-currency">¥</text>
          <text class="amount-number">{{ calculatedAmount.toFixed(2) }}</text>
        </view>
      </view>

      <!-- 保存按钮 -->
      <button
        @click="handleSaveRecord"
        class="save-button"
        :disabled="!canSaveRecord"
        :class="{ 'save-button-disabled': !canSaveRecord }"
      >
        <text class="save-icon">💾</text>
        <text class="save-text">保存{{ isToday ? '今日' : '历史' }}记录</text>
      </button>

      <!-- 日期选择器弹窗 -->
      <view class="date-picker-modal" v-if="showDateModal" @click="cancelDateSelection">
        <view class="modal-content" @click.stop>
          <view class="modal-header">
            <text class="modal-title">选择做工日期</text>
            <text class="modal-subtitle">可以补录之前的记录</text>
          </view>
          
          <picker
            mode="date"
            :value="selectedDate"
            :end="todayDate"
            @change="onDateChange"
            class="date-picker"
          >
            <view class="picker-display">
              <text class="picker-date">{{ selectedDate }}</text>
              <text class="picker-hint">点击选择日期</text>
            </view>
          </picker>

          <view class="modal-actions">
            <button class="action-btn cancel-btn" @click="cancelDateSelection">取消</button>
            <button class="action-btn confirm-btn" @click="confirmDateSelection">确定</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useAppStore } from '@/stores/app';
import ProductSelector from '@/components/ProductSelector.vue';
import QuantityInputEnhanced from '@/components/QuantityInputEnhanced.vue';
import { QuantityValidator } from '@/utils/productIcons.js';

// Store
const store = useAppStore();

// 组件状态
const selectedProductId = ref('');
const quantity = ref(1);
const selectedDate = ref(''); // 格式：YYYY-MM-DD
const showDateModal = ref(false);



// 计算属性
const products = computed(() => store.products);

const selectedProduct = computed(() =>
  products.value.find(p => p.id === selectedProductId.value)
);

const calculatedAmount = computed(() => {
  if (!selectedProduct.value) {
    return 0;
  }
  const validQuantity = QuantityValidator.normalize(quantity.value);
  return validQuantity * selectedProduct.value.unitPrice;
});

const canSaveRecord = computed(() => {
  if (selectedProductId.value === '' || !selectedProduct.value) {
    return false;
  }
  const validation = QuantityValidator.validate(quantity.value);
  return validation.valid;
});

const todayDate = computed(() => {
  return new Date().toISOString().slice(0, 10);
});

const isToday = computed(() => {
  return selectedDate.value === todayDate.value;
});

const displayDate = computed(() => {
  if (isToday.value) {
    return '今天';
  }
  return formatChineseDate(selectedDate.value);
});

// 事件处理函数
function handleProductSelect(product) {
  selectedProductId.value = product.id;
}

function handleClearSelection() {
  selectedProductId.value = '';
}

function showDatePicker() {
  showDateModal.value = true;
}

function onDateChange(e) {
  selectedDate.value = e.detail.value;
}

function confirmDateSelection() {
  showDateModal.value = false;
}

function cancelDateSelection() {
  showDateModal.value = false;
}

async function handleSaveRecord() {
  if (!canSaveRecord.value) {
    if (!selectedProductId.value) {
      uni.showToast({
        title: '请先选择要做的工件',
        icon: 'none',
        duration: 2000
      });
    } else {
      uni.showToast({
        title: '数量不能为0',
        icon: 'none',
        duration: 2000
      });
    }
    return;
  }

  try {
    const result = store.createRecord({
      date: selectedDate.value,
      productId: selectedProductId.value,
      quantity: quantity.value
    });

    if (result.ok) {
      // 重置表单
      quantity.value = 1;
      selectedProductId.value = '';
      
      const message = isToday.value ? '保存成功！' : '历史记录保存成功！';
      uni.showToast({
        title: message,
        icon: 'success',
        duration: 1500
      });
    } else {
      uni.showToast({
        title: result.message,
        icon: 'none',
        duration: 2000
      });
    }
  } catch (error) {
    uni.showToast({
      title: '保存失败，请重试',
      icon: 'none',
      duration: 2000
    });
  }
}



/**
 * 自定义日期格式化函数 - 解决App中toLocaleDateString兼容性问题
 */
function formatChineseDate(dateStr) {
  const date = new Date(dateStr);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];
  const weekday = weekdays[date.getDay()];
  
  return `${year}年${month}月${day}日 ${weekday}`;
}

/**
 * 设置日期为今天的函数
 */
function setDateToToday() {
  selectedDate.value = todayDate.value;
}

// 生命周期 - 页面初次加载
onMounted(() => {
  // 初始化数据
  store.initProducts();
  store.initRecords();
  
  // 设置默认日期为今天
  setDateToToday();
});

// 生命周期 - 页面每次显示（包括从其他页面返回）
onShow(() => {
  // 每次进入页面都更新为今天
  setDateToToday();
});

// 监听日期变化，重新计算汇总信息
watch(selectedDate, () => {
  // 计算属性会自动更新，这里可以添加额外的逻辑
});
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 20rpx;
}

.page-header {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 30rpx;
  padding: 30rpx;
  background: white;
  border-radius: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.date-selector {
  text-align: center;
  cursor: pointer;
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 16rpx;
  transition: all 0.3s ease;
  width: 96%;
}

.date-selector:active {
  transform: scale(0.95);
  background: #e9ecef;
}

.selected-date {
  font-size: 32rpx;
  font-weight: 600;
  color: #34495e;
  display: block;
  margin-bottom: 6rpx;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.date-hint {
  font-size: 24rpx;
  color: #6c757d;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.main-content {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.product-selection-section {
  background: white;
  border-radius: 20rpx;
  padding: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
  height: auto;
}

.quantity-section {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.amount-section {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
  text-align: center;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.amount-label {
  font-size: 36rpx;
  color: #7f8c8d;
  margin-bottom: 20rpx;
  display: block;
}

.amount-display {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 10rpx;
}

.amount-currency {
  font-size: 48rpx;
  color: #e74c3c;
}

.amount-number {
  font-size: 80rpx;
  font-weight: bold;
  color: #e74c3c;
}

.save-button {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 20rpx;
  padding: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20rpx;
  box-shadow: 0 8rpx 25rpx rgba(102, 126, 234, 0.3);
  transition: all 0.3s ease;
}

.save-button:active {
  transform: translateY(4rpx);
}

.save-button-disabled {
  background: #6c757d;
  box-shadow: none;
  opacity: 0.6;
}

.save-icon {
  font-size: 48rpx;
}

.save-text {
  font-size: 40rpx;
  font-weight: 600;
  color: white;
}

/* 日期选择器弹窗样式 */
.date-picker-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 20rpx;
  padding: 30rpx;
  width: 90%;
  max-width: 600rpx;
  max-height: 90vh;
  overflow-y: auto;
  box-sizing: border-box;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.3);
}

.modal-header {
  text-align: center;
  margin-bottom: 30rpx;
}

.modal-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #2c3e50;
  display: block;
  margin-bottom: 10rpx;
}

.modal-subtitle {
  font-size: 28rpx;
  color: #6c757d;
}

.date-picker {
  margin-bottom: 40rpx;
}

.picker-display {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  background: #f8f9fa;
  border-radius: 16rpx;
  cursor: pointer;
}

.picker-date {
  font-size: 36rpx;
  font-weight: 600;
  color: #34495e;
}

.picker-hint {
  font-size: 28rpx;
  color: #6c757d;
}

.modal-actions {
  display: flex;
  gap: 20rpx;
}

.action-btn {
  flex: 1;
  border: none;
  border-radius: 16rpx;
  height: 64rpx;
  padding: 0;
  font-size: 32rpx;
  font-weight: 600;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.cancel-btn {
  background: #6c757d;
  color: white;
}

.confirm-btn {
  background: #28a745;
  color: white;
}

.action-btn:active {
  transform: scale(0.95);
}
</style>