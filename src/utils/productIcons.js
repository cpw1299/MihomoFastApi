// 产品图标管理工具
export const ProductIconManager = {
  // 预设图标映射
  iconMap: {
    '刻兜': '📿',
    '拉链': '🔗', 
    '挂饰': '🎗️',
    '手链': '📿',
    '耳饰': '💎',
    '项链': '📿',
    '钥匙扣': '🔑',
    '刺绣': '🧵',
    '布包': '👜',
    '木牌': '🪵',
    '玉石': '🟢',
    '银饰': '⚪',
    '金饰': '🟡',
    '珠子': '⚪',
    '绳子': '🪢',
    '扣子': '🔘',
    '饰品': '💍',
    '手工': '✋',
    '编织': '🧶',
    '默认': '🔧'
  },

  // 可用图标列表（用于随机分配）
  availableIcons: [
    '📿', '🔗', '🎗️', '💎', '🔑', '🧵', '👜', '🪵', '🟢', '⚪', '🟡', '🪢', 
    '🔘', '💍', '✋', '🧶', '🎨', '🎯', '🎪', '🎭', '🎸', '🎺', '🎻', '🎹',
    '🌟', '⭐', '✨', '💫', '🌙', '☀️', '🌈', '🌺', '🌸', '🌼', '🌻', '🌹',
    '🍀', '🌿', '🌱', '🌳', '🌲', '🌴', '🌵', '🌾', '🌽', '🍄', '🌰', '🥜'
  ],

  // 获取产品图标
  getIcon(productName) {
    // 1. 先尝试精确匹配关键词
    for (const [key, icon] of Object.entries(this.iconMap)) {
      if (productName.includes(key)) {
        return icon;
      }
    }
    
    // 2. 尝试模糊匹配（单个字）
    const nameChars = productName.split('');
    for (const char of nameChars) {
      for (const [key, icon] of Object.entries(this.iconMap)) {
        if (key.includes(char) && char.length > 0) {
          return icon;
        }
      }
    }
    
    // 3. 根据产品名称长度和字符生成相对稳定的图标
    return this.generateConsistentIcon(productName);
  },

  // 生成一致的随机图标（基于产品名称）
  generateConsistentIcon(productName) {
    let hash = 0;
    for (let i = 0; i < productName.length; i++) {
      hash = ((hash << 5) - hash) + productName.charCodeAt(i);
      hash = hash & hash; // 转换为32位整数
    }
    
    // 确保hash为正数且在可用图标范围内
    const index = Math.abs(hash) % this.availableIcons.length;
    return this.availableIcons[index];
  },

  // 获取图标建议（用于产品配置页面）
  getIconSuggestions(productName) {
    const suggestions = [];
    
    // 添加匹配的图标
    for (const [key, icon] of Object.entries(this.iconMap)) {
      if (productName.includes(key)) {
        suggestions.push({ icon, reason: `匹配"${key}"` });
      }
    }
    
    // 添加一些常用图标作为备选
    const commonIcons = ['🔧', '📿', '🔗', '🎗️', '💎', '🔑', '🧵', '👜'];
    commonIcons.forEach(icon => {
      if (!suggestions.some(s => s.icon === icon)) {
        suggestions.push({ icon, reason: '常用图标' });
      }
    });
    
    return suggestions.slice(0, 6); // 最多返回6个建议
  }
};

// 数量限制工具
export const QuantityValidator = {
  // 最大允许数量（4位数）
  MAX_QUANTITY: 9999,
  
  // 最小允许数量
  MIN_QUANTITY: 1,
  
  // 验证数量是否有效
  validate(quantity) {
    const num = Number(quantity);
    
    if (!Number.isInteger(num)) {
      return { valid: false, message: '数量必须是整数' };
    }
    
    if (num < this.MIN_QUANTITY) {
      return { valid: false, message: `数量不能少于${this.MIN_QUANTITY}件` };
    }
    
    if (num > this.MAX_QUANTITY) {
      return { valid: false, message: `数量不能超过${this.MAX_QUANTITY}件` };
    }
    
    return { valid: true };
  },
  
  // 修正数量到有效范围
  normalize(quantity) {
    const num = Number(quantity);
    
    if (isNaN(num)) return this.MIN_QUANTITY;
    if (!Number.isInteger(num)) return Math.round(num);
    
    return Math.max(this.MIN_QUANTITY, Math.min(this.MAX_QUANTITY, num));
  },
  
  // 格式化数量显示
  format(quantity) {
    const normalized = this.normalize(quantity);
    return normalized.toLocaleString('zh-CN'); // 添加千位分隔符
  }
};

// 快捷数量选项
export const QuickQuantityOptions = {
  // 基础快捷数量
  basic: [1, 5, 10, 20, 50],
  
  // 大数量快捷选项
  large: [100, 200, 500, 1000, 2000],
  
  // 获取适合的快捷数量选项
  getOptions(currentQuantity = 0) {
    // 如果当前数量较大，显示大数量选项
    if (currentQuantity >= 100) {
      return this.large;
    }
    
    // 默认返回基础选项
    return this.basic;
  },
  
  // 智能建议数量（基于历史数据）
  suggestSmartQuantity(productId, historicalRecords) {
    if (!historicalRecords || historicalRecords.length === 0) {
      return this.basic;
    }
    
    // 获取该产品的历史数量
    const productRecords = historicalRecords.filter(r => r.productId === productId);
    if (productRecords.length === 0) {
      return this.basic;
    }
    
    // 计算平均数量
    const quantities = productRecords.map(r => r.quantity);
    const avgQuantity = quantities.reduce((sum, q) => sum + q, 0) / quantities.length;
    
    // 生成基于平均值的建议
    const suggestions = [];
    const base = Math.round(avgQuantity);
    
    suggestions.push(base);
    if (base > 1) suggestions.push(Math.max(1, base - 5));
    suggestions.push(base + 5);
    if (base > 10) suggestions.push(Math.round(base * 0.5));
    suggestions.push(Math.round(base * 1.5));
    
    // 去重并限制范围
    return [...new Set(suggestions)]
      .map(q => QuantityValidator.normalize(q))
      .sort((a, b) => a - b)
      .slice(0, 5);
  }
};