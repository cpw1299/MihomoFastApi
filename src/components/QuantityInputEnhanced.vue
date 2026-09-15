<template>
  <view class="quantity-input-enhanced">
    <!-- 水平布局：减号 + 数量显示 + 加号 -->
    <view class="quantity-control-row">
      <!-- 减号按钮 -->
      <button class="control-btn minus-btn" @click="decreaseQuantity" :disabled="isAtMin">
        <text class="btn-icon">−</text>
      </button>
      
      <!-- 数量显示区域 -->
      <view class="quantity-display-area" @click="showNumberInput">
        <view class="quantity-main-display">
          <text class="quantity-number-large">{{ displayQuantity }}</text>
          <text class="quantity-unit">件</text>
          <text class="edit-hint">✏️</text>
        </view>
      </view>
      
      <!-- 加号按钮 -->
      <button class="control-btn plus-btn" @click="increaseQuantity" :disabled="isAtMax">
        <text class="btn-icon">+</text>
      </button>
    </view>

    <!-- 数字输入弹窗 -->
    <view class="number-input-modal" v-if="showModal" @click="cancelInput">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-subtitle">最大支持 {{ maxQuantity }} 件</text>
        </view>
        
        <view class="input-display">
          <text class="input-number">{{ inputValue }}</text>
          <text class="input-unit">件</text>
        </view>

        <!-- 数字键盘 -->
        <view class="number-keyboard">
          <view class="keyboard-row">
            <button class="key-btn" @click="inputNumber('1')">1</button>
            <button class="key-btn" @click="inputNumber('2')">2</button>
            <button class="key-btn" @click="inputNumber('3')">3</button>
          </view>
          <view class="keyboard-row">
            <button class="key-btn" @click="inputNumber('4')">4</button>
            <button class="key-btn" @click="inputNumber('5')">5</button>
            <button class="key-btn" @click="inputNumber('6')">6</button>
          </view>
          <view class="keyboard-row">
            <button class="key-btn" @click="inputNumber('7')">7</button>
            <button class="key-btn" @click="inputNumber('8')">8</button>
            <button class="key-btn" @click="inputNumber('9')">9</button>
          </view>
          <view class="keyboard-row">
            <button class="key-btn clear-btn" @click="clearInput">清除</button>
            <button class="key-btn" @click="inputNumber('0')">0</button>
            <button class="key-btn delete-btn" @click="deleteLast">⌫</button>
          </view>
        </view>

        <view class="modal-actions">
          <button class="action-btn cancel-btn" @click="cancelInput">取消</button>
          <button class="action-btn confirm-btn" @click="confirmInput">确定</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, watch } from 'vue';
import { QuantityValidator } from '@/utils/productIcons.js';

const props = defineProps({
  modelValue: {
    type: Number,
    default: 1
  },
  maxQuantity: {
    type: Number,
    default: 9999
  }
});

const emit = defineEmits(['update:modelValue']);

// 状态管理
const currentQuantity = ref(props.modelValue);
const showModal = ref(false);
const inputValue = ref('');

// 计算属性
const displayQuantity = computed(() => {
  // 使用简单的数字显示，避免App中toLocaleString兼容性问题
  return currentQuantity.value.toString();
});

const isAtMin = computed(() => {
  return currentQuantity.value <= 1;
});

const isAtMax = computed(() => {
  return currentQuantity.value >= props.maxQuantity;
});

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  currentQuantity.value = newVal;
});

// 方法
function showNumberInput() {
  showModal.value = true;
  // 如果当前值是1（默认值），输入框初始化为空，方便用户直接输入
  // 如果当前值大于1，显示当前值供用户修改
  inputValue.value = currentQuantity.value === 1 ? '' : currentQuantity.value.toString();
}

function hideNumberInput() {
  showModal.value = false;
  inputValue.value = '';
}

function inputNumber(num) {
  // 防止输入超过最大位数
  if (inputValue.value.length >= 4) return;
  
  // 防止前导0
  if (inputValue.value === '0' && num === '0') return;
  
  inputValue.value += num;
  
  // 实时验证
  const numValue = parseInt(inputValue.value) || 0;
  if (numValue > props.maxQuantity) {
    inputValue.value = props.maxQuantity.toString();
  }
}

function clearInput() {
  inputValue.value = '';
}

function deleteLast() {
  if (inputValue.value.length > 0) {
    inputValue.value = inputValue.value.slice(0, -1);
  }
}

function confirmInput() {
  const numValue = parseInt(inputValue.value) || 0;
  const validation = QuantityValidator.validate(numValue);
  
  if (validation.valid) {
    currentQuantity.value = numValue;
    emit('update:modelValue', numValue);
    hideNumberInput();
  } else {
    uni.showToast({
      title: validation.message,
      icon: 'none',
      duration: 2000
    });
  }
}

function cancelInput() {
  hideNumberInput();
}

function increaseQuantity() {
  const newValue = currentQuantity.value + 1;
  const validation = QuantityValidator.validate(newValue);
  
  if (validation.valid) {
    currentQuantity.value = newValue;
    emit('update:modelValue', newValue);
  } else {
    uni.showToast({
      title: validation.message,
      icon: 'none',
      duration: 1500
    });
  }
}

function decreaseQuantity() {
  const newValue = currentQuantity.value - 1;
  const validation = QuantityValidator.validate(newValue);
  
  if (validation.valid) {
    currentQuantity.value = newValue;
    emit('update:modelValue', newValue);
  } else {
    uni.showToast({
      title: validation.message,
      icon: 'none',
      duration: 1500
    });
  }
}
</script>

<style scoped>
.quantity-input-enhanced {
  background: white;
  border-radius: 20rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}

/* 水平布局容器 */
.quantity-control-row {
  display: flex;
  align-items: center;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.quantity-display-area {
  flex: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 150rpx;
}

.quantity-main-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 10rpx;
  padding: 16rpx 20rpx;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 20rpx;
  cursor: pointer;
  transition: all 0.3s ease;
  width: 100%;
  box-sizing: border-box;
}

.quantity-main-display:active {
  transform: scale(0.95);
  background: linear-gradient(135deg, #e9ecef 0%, #dee2e6 100%);
}

.quantity-number-large {
  font-size: 48rpx;
  font-weight: bold;
  color: #2c3e50;
}

.quantity-unit {
  font-size: 32rpx;
  color: #7f8c8d;
}

.edit-hint {
  font-size: 28rpx;
  color: #6c757d;
  margin-left: 10rpx;
}

.quantity-subtitle {
  font-size: 24rpx;
  color: #6c757d;
  margin-top: 10rpx;
  display: block;
}

.control-btn {
  width: 80rpx;
  height: 80rpx;
  border: none;
  border-radius: 50%;
  font-size: 40rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  box-shadow: 0 4rpx 15rpx rgba(0, 0, 0, 0.2);
  flex-shrink: 0;
}

.control-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.minus-btn {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
  color: white;
}

.plus-btn {
  background: linear-gradient(135deg, #51cf66 0%, #40c057 100%);
  color: white;
}

.control-btn:not(:disabled):active {
  transform: scale(0.9);
}

.btn-icon {
  font-size: 40rpx;
}

/* 数字输入弹窗样式 */
.number-input-modal {
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

.modal-subtitle {
  font-size: 28rpx;
  color: #6c757d;
  margin-top: 10rpx;
}

.input-display {
  display: flex;
  justify-content: center;
  align-items: baseline;
  gap: 10rpx;
  margin-bottom: 40rpx;
  padding: 30rpx;
  background: #f8f9fa;
  border-radius: 16rpx;
}

.input-number {
  font-size: 50rpx;
  font-weight: bold;
  color: #2c3e50;
}

.input-unit {
  font-size: 40rpx;
  color: #7f8c8d;
}

.number-keyboard {
  margin-bottom: 30rpx;
}

.keyboard-row {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.key-btn {
  flex: 1;
  background: white;
  border: 2rpx solid #e9ecef;
  border-radius: 16rpx;
  height: 64rpx;
  padding: 0;
  font-size: 36rpx;
  font-weight: 600;
  color: #495057;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
}

.key-btn:active {
  background: #667eea;
  color: white;
  border-color: #667eea;
  transform: scale(0.95);
}

.clear-btn {
  background: #ff6b6b;
  color: white;
  border-color: #ff6b6b;
}

.delete-btn {
  background: #6c757d;
  color: white;
  border-color: #6c757d;
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