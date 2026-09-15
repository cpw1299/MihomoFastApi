<template>
  <view class="product-selector">
    <!-- 所有工件选择 -->
    <view class="all-products">
      <text class="section-title">所有工件</text>
      <view class="product-grid">
        <view
          v-for="product in enabledProducts"
          :key="product.id"
          class="product-card"
          :class="{ 'product-card-selected': selectedProductId === product.id }"
          @click="selectProduct(product)"
        >
          <view class="product-icon">
            <text class="icon-text">{{ getProductIcon(product.name) }}</text>
          </view>
          <text class="product-name">{{ product.name }}</text>
          <text class="product-price">{{ formatCurrency(product.unitPrice) }}</text>
        </view>
      </view>
    </view>

    <!-- 已选择的产品显示 -->
    <view class="selected-display" v-if="selectedProduct">
      <view class="selected-info">
        <text class="selected-label">已选择：</text>
        <text class="selected-name">{{ selectedProduct.name }}</text>
        <text class="selected-price">{{ formatCurrency(selectedProduct.unitPrice) }}</text>
      </view>
      <button class="change-btn" @click="clearSelection">换其他</button>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue';
import { ProductIconManager } from '@/utils/productIcons.js';

const props = defineProps({
  products: {
    type: Array,
    default: () => []
  },
  selectedProductId: {
    type: String,
    default: ''
  },
  frequentProductIds: {
    type: Array,
    default: () => []
  }
});

const emit = defineEmits(['select-product', 'clear-selection']);

// 计算属性
const enabledProducts = computed(() =>
  props.products.filter(p => p.enabled !== false)
);

const selectedProduct = computed(() =>
  enabledProducts.value.find(p => p.id === props.selectedProductId)
);

// 方法
function selectProduct(product) {
  emit('select-product', product);
}

function clearSelection() {
  emit('clear-selection');
}

function formatCurrency(amount) {
  return `¥${amount.toFixed(2)}`;
}

function getProductIcon(name) {
  // 使用图标管理器获取智能图标
  return ProductIconManager.getIcon(name);
}
</script>

<style scoped>
.product-selector {
  padding: 20rpx;
  background: white;
  border-radius: 20rpx;
  margin-bottom: 30rpx;
  /* 确保父容器根据内容自适应高度 */
  height: auto; 
}

.section-title {
  font-size: 40rpx;
  font-weight: 600;
  color: #34495e;
  margin-bottom: 30rpx;
  display: block;
  padding-left: 10rpx;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20rpx;
  /* 移除 margin-bottom: 40rpx; 以免下方产生大块多余留白 */
}

.product-card {
  background: #f8f9fa;
  border: 4rpx solid #e9ecef;
  border-radius: 20rpx;
  padding: 16rpx 12rpx;
  text-align: center;
  transition: all 0.3s ease;
  min-height: 128rpx;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.product-card:active {
  transform: scale(0.95);
}

.product-card-selected {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-color: #667eea;
  color: white;
}

.product-icon {
  font-size: 56rpx;
  margin-bottom: 12rpx;
}

.icon-text {
  font-size: 56rpx;
}

.product-name {
  font-size: 28rpx;
  font-weight: 600;
  margin-bottom: 6rpx;
  display: block;
}

.product-price {
  font-size: 24rpx;
  opacity: 0.8;
}

.selected-display {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 20rpx;
  padding: 30rpx;
  margin-top: 30rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}

.selected-info {
  flex: 1;
}

.selected-label {
  font-size: 28rpx;
  opacity: 0.9;
  display: block;
  margin-bottom: 10rpx;
}

.selected-name {
  font-size: 40rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 10rpx;
}

.selected-price {
  font-size: 32rpx;
  opacity: 0.9;
  display: block;
}

.change-btn {
  background: rgba(255, 255, 255, 0.2);
  border: 2rpx solid rgba(255, 255, 255, 0.3);
  border-radius: 16rpx;
  padding: 20rpx 30rpx;
  color: white;
  font-size: 28rpx;
  font-weight: 600;
}

.change-btn:active {
  background: rgba(255, 255, 255, 0.3);
}

/* 响应式设计 */
@media (max-width: 480rpx) {
  .product-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>