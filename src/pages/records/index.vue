<template>
  <view class="container">
    <view class="filter-section">
      <view class="date-pickers-container">
        <!-- 选择年月 -->
        <picker mode="date" fields="month" :value="selectedYearMonth" @change="onYearMonthChange" class="date-picker month-picker">
          <view class="picker-content">
            <text>{{ selectedYearMonth || '选择年月' }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
        <!-- 选择天 -->
        <picker mode="date" :value="selectedFullDate" :start="monthStartDate" :end="monthEndDate" @change="onDayChange" class="date-picker day-picker" :disabled="!selectedYearMonth">
          <view class="picker-content" :class="{ 'disabled-picker': !selectedYearMonth }">
            <text>{{ selectedDay ? `${selectedDay}日` : '全部' }}</text>
            <text class="arrow">▼</text>
          </view>
        </picker>
      </view>

      <button @click="clearDateFilter" class="clear-btn">清除</button>
    </view>

    <view class="records-list">
      <view v-for="record in filteredRecords" :key="record.id" class="record-item">
        <view class="record-info">
          <text class="record-date">{{ formatDate(record.date) }}</text>
          <view class="record-product-row">
            <text class="record-product">{{ record.productName }}</text>
            <text class="record-price">单价: {{ record.unitPrice }} 元</text>
          </view>
          <view class="record-quantity-row">
            <text class="record-quantity">数量: {{ record.quantity }} 件</text>
            <text class="record-amount">金额: {{ record.fee }} 元</text>
          </view>
        </view>
        <button @click="deleteRecord(record.id)" class="delete-btn">删除</button>
      </view>
    </view>

    <view class="summary-section" v-if="filteredRecords.length > 0">
      <text class="summary-item">总计: {{ filteredTotal.quantity }} 件</text>
      <text class="summary-item">总金额: {{ filteredTotal.amount }} 元</text>
    </view>

    <view v-if="filteredRecords.length === 0" class="empty-state">
      <text>暂无记录</text>
    </view>
  </view>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useAppStore } from '../../stores/app';

const store = useAppStore();

// 筛选状态
const selectedYearMonth = ref(''); // 格式: YYYY-MM
const selectedDay = ref('');       // 格式: DD (例如 01, 15)
const selectedFullDate = ref('');  // 用于给原生 picker 绑定 value，格式 YYYY-MM-DD

// 计算当前选择月份的起始和结束日期，用于限制“天”选择器的范围
const monthStartDate = computed(() => {
  if (!selectedYearMonth.value) return '';
  return `${selectedYearMonth.value}-01`;
});

const monthEndDate = computed(() => {
  if (!selectedYearMonth.value) return '';
  const [year, month] = selectedYearMonth.value.split('-');
  const lastDay = new Date(year, month, 0).getDate();
  return `${selectedYearMonth.value}-${lastDay}`;
});

onMounted(() => {
  store.initProducts();
  store.initRecords();
  
  // 设置默认年月为当前月
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  selectedYearMonth.value = `${year}-${month}`;
});

const filteredRecords = computed(() => {
  if (!selectedYearMonth.value) {
    return store.records;
  }
  
  return store.records.filter(record => {
    // 如果选了天，则精确匹配 YYYY-MM-DD
    if (selectedDay.value) {
      const targetDate = `${selectedYearMonth.value}-${selectedDay.value}`;
      return record.date === targetDate;
    }
    // 如果只选了年月，则匹配该月的所有数据
    return record.date && record.date.startsWith(selectedYearMonth.value);
  });
});

const filteredTotal = computed(() => {
  const records = filteredRecords.value;
  return {
    quantity: records.reduce((sum, record) => sum + record.quantity, 0),
    amount: Number(records.reduce((sum, record) => sum + record.fee, 0).toFixed(2)),
  };
});

function onYearMonthChange(e) {
  selectedYearMonth.value = e.detail.value;
  // 切换月份时，清空之前选择的天
  selectedDay.value = '';
  selectedFullDate.value = '';
}

function onDayChange(e) {
  const fullDate = e.detail.value; // YYYY-MM-DD
  selectedFullDate.value = fullDate;
  
  if (fullDate) {
    const parts = fullDate.split('-');
    // 确保选择的日期与当前选择的月份一致（防止跨月选择的边界情况）
    if (`${parts[0]}-${parts[1]}` === selectedYearMonth.value) {
      selectedDay.value = parts[2];
    } else {
      // 如果跨月了（某些机型 picker 可能会选到其他月），则更新年月
      selectedYearMonth.value = `${parts[0]}-${parts[1]}`;
      selectedDay.value = parts[2];
    }
  } else {
    selectedDay.value = '';
  }
}

function clearDateFilter() {
  // 恢复默认年月为当前月
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  selectedYearMonth.value = `${year}-${month}`;
  
  // 清空天数选择
  selectedDay.value = '';
  selectedFullDate.value = '';
}

function deleteRecord(id) {
  uni.showModal({
    title: '确认删除',
    content: '确定要删除这条记录吗？',
    success: res => {
      if (res.confirm) {
        store.removeRecord(id);
        uni.showToast({ title: '删除成功', icon: 'success' });
      }
    },
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  
  // 解析日期字符串
  const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateStr;
  
  const [, year, month, day] = match;
  return `${year}年${month}月${day}日`;
}
</script>

<style scoped>
.container {
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.filter-section {
  display: flex;
  align-items: center;
  gap: 15px;
  margin-bottom: 20px;
  padding: 15px;
  background-color: #fff;
  border-radius: 8px;
}

.date-pickers-container {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 10px;
}

.date-picker {
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 8px 12px;
  background-color: #fff;
}

.month-picker {
  flex: 2;
}

.day-picker {
  flex: 1;
}

.disabled-picker {
  opacity: 0.5;
}

.picker-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.arrow {
  color: #999;
  font-size: 12px;
}

.clear-btn {
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 2px 16px;
  font-size: 14px;
}

.records-list {
  background-color: #fff;
  border-radius: 8px;
  margin-bottom: 20px;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px;
  border-bottom: 1px solid #eee;
}

.record-item:last-child {
  border-bottom: none;
}

.record-info {
  flex: 1;
}

.record-date {
  font-size: 14px;
  color: #6d6c6c;
  display: block;
}

.record-product-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: 4px;
}

.record-product {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.record-quantity-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-top: 4px;
}

.record-quantity {
  font-size: 14px;
  color: #666;
}

.record-price {
  font-size: 14px;
  color: #666;
}

.record-amount {
  font-size: 15px;
  font-weight: bold;
  color: #ff6b35;
}

.delete-btn {
  background-color: #dc3545;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 6px 12px;
  font-size: 12px;
  margin-left: 15px;
}

.summary-section {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
}

.summary-item {
  font-size: 16px;
  font-weight: bold;
  color: #333;
  margin: 0 10px;
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 16px;
}
</style>
