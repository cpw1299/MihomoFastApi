<template>
  <view class="container">
    <view class="add-product-section">
      <view class="form-item">
        <text class="label">产品名称:</text>
        <input 
          type="text" 
          v-model="newProductName" 
          placeholder="请输入产品名称" 
          class="input"
          @input="onProductNameInput"
        />
      </view>

      <view class="form-item">
        <text class="label">单价:</text>
        <input 
          type="digit" 
          v-model="newProductPrice" 
          placeholder="请输入单价" 
          class="input" 
        />
      </view>

      <!-- 图标选择区域 -->
      <view class="icon-selection" v-if="iconSuggestions.length > 0">
        <text class="icon-label">选择图标:</text>
        <view class="icon-grid">
          <view
            v-for="(suggestion, index) in iconSuggestions"
            :key="index"
            class="icon-option"
            :class="{ 'icon-selected': selectedIcon === suggestion.icon }"
            @click="selectIcon(suggestion.icon)"
          >
            <text class="icon-emoji">{{ suggestion.icon }}</text>
            <text class="icon-reason">{{ suggestion.reason }}</text>
          </view>
        </view>
      </view>

      <button @click="addProduct" class="add-btn">添加产品</button>
    </view>

    <view class="product-list">
      <view v-for="product in store.products" :key="product.id" class="product-item">
        <view class="product-info">
          <text class="product-icon">{{ getProductIcon(product.name) }}</text>
          <view class="product-details">
            <text class="product-name">{{ product.name }}</text>
            <text class="product-price">¥{{ product.unitPrice }}</text>
          </view>
        </view>
        <view class="product-controls">
          <view class="switch-container">
            <text class="switch-label">显示</text>
            <switch 
              :checked="product.enabled !== false" 
              @change="toggleProductEnabled(product)"
              color="#007AFF"
            />
          </view>
          <view class="product-actions">
            <button @click="editProduct(product)" class="edit-btn">编辑</button>
            <button @click="deleteProduct(product.id)" class="delete-btn">删除</button>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '../../stores/app';
import { ProductIconManager } from '@/utils/productIcons.js';

const store = useAppStore();
const newProductName = ref('');
const newProductPrice = ref('');
const selectedIcon = ref('');
const iconSuggestions = ref([]);

onMounted(() => {
  store.initProducts();
});

// 计算属性
const productIconMap = computed(() => {
  const map = {};
  store.products.forEach(product => {
    map[product.id] = ProductIconManager.getIcon(product.name);
  });
  return map;
});

// 方法
function getProductIcon(productName) {
  return ProductIconManager.getIcon(productName);
}

function onProductNameInput() {
  const name = newProductName.value.trim();
  if (name) {
    iconSuggestions.value = ProductIconManager.getIconSuggestions(name);
    // 默认选择第一个建议
    if (iconSuggestions.value.length > 0 && !selectedIcon.value) {
      selectedIcon.value = iconSuggestions.value[0].icon;
    }
  } else {
    iconSuggestions.value = [];
    selectedIcon.value = '';
  }
}

function selectIcon(icon) {
  selectedIcon.value = icon;
}

function addProduct() {
  const name = newProductName.value.trim();
  const price = Number(newProductPrice.value);

  if (!name) {
    uni.showToast({ title: '请输入产品名称', icon: 'none' });
    return;
  }
  if (!price || price <= 0) {
    uni.showToast({ title: '请输入有效的单价', icon: 'none' });
    return;
  }

  const result = store.createProduct({ name, unitPrice: price });
  if (!result.ok) {
    uni.showToast({ title: result.message, icon: 'none' });
    return;
  }

  uni.showToast({ title: '添加成功', icon: 'success' });
  
  // 重置表单
  newProductName.value = '';
  newProductPrice.value = '';
  selectedIcon.value = '';
  iconSuggestions.value = [];
}

function editProduct(product) {
  uni.showModal({
    title: '编辑产品',
    editable: true,
    placeholderText: '产品名称',
    content: product.name,
    success: res => {
      if (res.confirm && res.content) {
        const result = store.updateProductBasic(product.id, {
          name: res.content,
          unitPrice: product.unitPrice,
        });
        if (!result.ok) {
          uni.showToast({ title: result.message, icon: 'none' });
        } else {
          uni.showToast({ title: '修改成功', icon: 'success' });
        }
      }
    },
  });
}

function deleteProduct(id) {
  const result = store.removeProduct(id);
  if (!result.ok) {
    uni.showToast({ title: result.message, icon: 'none' });
  } else {
    uni.showToast({ title: '删除成功', icon: 'success' });
  }
}

function toggleProductEnabled(product) {
  const newEnabled = !product.enabled;
  const result = store.updateProductEnabled(product.id, newEnabled);
  if (!result.ok) {
    uni.showToast({ title: result.message, icon: 'none' });
  }
}
</script>

<style scoped>
.container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.add-product-section {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.form-item {
  display: flex;
  align-items: center;
  margin-bottom: 15px;
}

.label {
  width: 80px;
  font-size: 14px;
  color: #333;
}

.input {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 12px;
  font-size: 14px;
}

.icon-selection {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.icon-label {
  display: block;
  font-size: 14px;
  color: #333;
  margin-bottom: 10px;
  font-weight: 500;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.icon-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 10px;
  background-color: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.icon-option:active,
.icon-selected {
  border-color: #007aff;
  background-color: #e3f2fd;
  transform: scale(0.95);
}

.icon-emoji {
  font-size: 24px;
  margin-bottom: 4px;
}

.icon-reason {
  font-size: 10px;
  color: #666;
  text-align: center;
}

.add-btn {
  width: 100%;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px;
  font-size: 16px;
  margin-top: 10px;
}

.product-list {
  background-color: #fff;
  border-radius: 8px;
}

.product-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.product-item:last-child {
  border-bottom: none;
}

.product-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.product-icon {
  font-size: 24px;
  margin-right: 12px;
}

.product-details {
  flex: 1;
}

.product-name {
  font-size: 16px;
  color: #333;
  display: block;
}

.product-price {
  font-size: 14px;
  color: #ff6b35;
  margin-top: 4px;
  display: block;
}

.product-controls {
  display: flex;
  align-items: center;
  gap: 15px;
}

.switch-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-label {
  font-size: 12px;
  color: #666;
}

.product-actions {
  display: flex;
  gap: 10px;
}

.edit-btn {
  background-color: #007aff;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
}

.delete-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
}
</style>