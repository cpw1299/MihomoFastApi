import type { BackupMeta } from '@/types';
import { STORAGE_KEYS, readVersionedJson, writeVersionedJson } from './storage';

/**
 * 备份管理器
 * 负责数据的自动备份、文件管理和上传调度
 */
export class BackupManager {
  private static instance: BackupManager;
  private backupDir = '_doc/backups';
  private maxLocalBackups = 7; // 保留最近7天的本地备份
  private checkInterval = 60 * 60 * 1000; // 每小时检查一次
  private timer: number | null = null;

  private constructor() {}

  static getInstance(): BackupManager {
    if (!BackupManager.instance) {
      BackupManager.instance = new BackupManager();
    }
    return BackupManager.instance;
  }

  /**
   * 初始化备份管理器
   */
  async init(): Promise<void> {
    await this.ensureBackupDirectory();
    this.startAutoBackup();
    await this.cleanupOldBackups();
  }

  /**
   * 确保备份目录存在
   */
  private async ensureBackupDirectory(): Promise<void> {
    return new Promise((resolve) => {
      plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fs) => {
        fs.root.getDirectory(this.backupDir, { create: true }, () => {
          resolve();
        }, () => {
          resolve(); // 即使创建失败也继续
        });
      });
    });
  }

  /**
   * 开始自动备份
   */
  private startAutoBackup(): void {
    // 立即执行一次检查
    this.checkAndBackup();
    
    // 设置定时器，每小时检查一次
    this.timer = setInterval(() => {
      this.checkAndBackup();
    }, this.checkInterval);
  }

  /**
   * 停止自动备份
   */
  stopAutoBackup(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 检查并执行备份
   */
  async checkAndBackup(): Promise<void> {
    const now = new Date();
    const lastBackup = await this.getLastBackupTime();
    
    // 如果今天还没有备份，或者最后一次备份是昨天及以前
    if (!lastBackup || !this.isSameDay(lastBackup, now)) {
      await this.createDailyBackup();
    }
  }

  /**
   * 获取最后一次备份时间
   */
  private async getLastBackupTime(): Promise<Date | null> {
    const { data: backups } = readVersionedJson<BackupMeta[]>(STORAGE_KEYS.backups, []);
    if (backups.length === 0) return null;
    
    const latestBackup = backups.reduce((latest, current) => 
      current.generatedAt > latest.generatedAt ? current : latest
    );
    
    return new Date(latestBackup.generatedAt);
  }

  /**
   * 判断两个日期是否为同一天
   */
  private isSameDay(date1: Date, date2: Date): boolean {
    return date1.getFullYear() === date2.getFullYear() &&
           date1.getMonth() === date2.getMonth() &&
           date1.getDate() === date2.getDate();
  }

  /**
   * 创建每日备份
   */
  private async createDailyBackup(): Promise<void> {
    try {
      const date = new Date();
      const fileName = `backup_${this.formatDate(date)}.json`;
      const filePath = `${this.backupDir}/${fileName}`;

      // 准备备份数据
      const backupData = await this.prepareBackupData();
      
      // 写入文件
      await this.writeBackupFile(filePath, backupData);
      
      // 更新备份元数据
      const backupMeta: BackupMeta = {
        fileName,
        localPath: filePath,
        generatedAt: date.getTime(),
        uploadStatus: 'pending',
        retryCount: 0,
      };
      
      this.upsertBackupMeta(backupMeta);
      
      console.log(`每日备份创建成功: ${fileName}`);
    } catch (error) {
      console.error('创建每日备份失败:', error);
    }
  }

  /**
   * 准备备份数据
   */
  private async prepareBackupData(): Promise<string> {
    const { data: products } = readVersionedJson<any>(STORAGE_KEYS.products, []);
    const { data: records } = readVersionedJson<any>(STORAGE_KEYS.records, []);
    const { data: settings } = readVersionedJson<any>(STORAGE_KEYS.settings, {});

    const backupData = {
      schemaVersion: 1,
      exportedAt: Date.now(),
      products,
      records,
      settings,
    };

    return JSON.stringify(backupData, null, 2);
  }

  /**
   * 写入备份文件
   */
  private async writeBackupFile(filePath: string, data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fs) => {
        fs.root.getFile(filePath, { create: true }, (fileEntry) => {
          fileEntry.createWriter((writer) => {
            writer.onwrite = () => resolve();
            writer.onerror = (error) => reject(error);
            writer.write(data);
          }, reject);
        }, reject);
      }, reject);
    });
  }

  /**
   * 更新备份元数据
   */
  private upsertBackupMeta(meta: BackupMeta): void {
    const { data: backups } = readVersionedJson<BackupMeta[]>(STORAGE_KEYS.backups, []);
    
    const existingIndex = backups.findIndex(b => b.fileName === meta.fileName);
    if (existingIndex >= 0) {
      backups[existingIndex] = meta;
    } else {
      backups.push(meta);
    }
    
    // 按生成时间排序，最新的在前
    backups.sort((a, b) => b.generatedAt - a.generatedAt);
    
    writeVersionedJson(STORAGE_KEYS.backups, backups);
  }

  /**
   * 清理旧备份
   */
  private async cleanupOldBackups(): Promise<void> {
    try {
      const { data: backups } = readVersionedJson<BackupMeta[]>(STORAGE_KEYS.backups, []);
      
      if (backups.length <= this.maxLocalBackups) return;
      
      // 获取需要删除的旧备份
      const backupsToRemove = backups.slice(this.maxLocalBackups);
      
      // 删除文件
      for (const backup of backupsToRemove) {
        await this.removeBackupFile(backup.localPath);
      }
      
      // 更新元数据
      const remainingBackups = backups.slice(0, this.maxLocalBackups);
      writeVersionedJson(STORAGE_KEYS.backups, remainingBackups);
      
      console.log(`清理了 ${backupsToRemove.length} 个旧备份`);
    } catch (error) {
      console.error('清理旧备份失败:', error);
    }
  }

  /**
   * 删除备份文件
   */
  private async removeBackupFile(filePath: string): Promise<void> {
    return new Promise((resolve) => {
      plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fs) => {
        fs.root.getFile(filePath, {}, (fileEntry) => {
          fileEntry.remove(() => {
            resolve();
          }, () => {
            resolve(); // 即使删除失败也继续
          });
        }, () => {
          resolve(); // 文件不存在也视为成功
        });
      });
    });
  }

  /**
   * 获取所有备份列表
   */
  getBackupList(): BackupMeta[] {
    const { data: backups } = readVersionedJson<BackupMeta[]>(STORAGE_KEYS.backups, []);
    return backups;
  }

  /**
   * 读取备份文件内容
   */
  async readBackupFile(filePath: string): Promise<string> {
    return new Promise((resolve, reject) => {
      plus.io.requestFileSystem(plus.io.PRIVATE_DOC, (fs) => {
        fs.root.getFile(filePath, {}, (fileEntry) => {
          fileEntry.file((file) => {
            const reader = new plus.io.FileReader();
            reader.onloadend = (e) => {
              resolve(e.target?.result as string);
            };
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
          }, reject);
        }, reject);
      }, reject);
    });
  }

  /**
   * 手动触发备份
   */
  async triggerManualBackup(): Promise<string> {
    const date = new Date();
    const fileName = `manual_backup_${this.formatDateTime(date)}.json`;
    const filePath = `${this.backupDir}/${fileName}`;

    try {
      const backupData = await this.prepareBackupData();
      await this.writeBackupFile(filePath, backupData);
      
      const backupMeta: BackupMeta = {
        fileName,
        localPath: filePath,
        generatedAt: date.getTime(),
        uploadStatus: 'pending',
        retryCount: 0,
      };
      
      this.upsertBackupMeta(backupMeta);
      
      return fileName;
    } catch (error) {
      console.error('手动备份失败:', error);
      throw error;
    }
  }

  /**
   * 格式化日期 (YYYY-MM-DD)
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 格式化日期时间 (YYYY-MM-DD_HH-mm-ss)
   */
  private formatDateTime(date: Date): string {
    const dateStr = this.formatDate(date);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${dateStr}_${hours}-${minutes}-${seconds}`;
  }
}

/**
 * 备份调度器
 * 处理自动上传和重试逻辑
 */
export class BackupScheduler {
  private static instance: BackupScheduler;
  private uploadInterval = 30 * 60 * 1000; // 30分钟检查一次
  private maxRetryCount = 3;
  private timer: number | null = null;

  private constructor() {}

  static getInstance(): BackupScheduler {
    if (!BackupScheduler.instance) {
      BackupScheduler.instance = new BackupScheduler();
    }
    return BackupScheduler.instance;
  }

  /**
   * 启动调度器
   */
  start(): void {
    this.processPendingUploads();
    
    this.timer = setInterval(() => {
      this.processPendingUploads();
    }, this.uploadInterval);
  }

  /**
   * 停止调度器
   */
  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 处理待上传的备份
   */
  private async processPendingUploads(): Promise<void> {
    const { data: backups } = readVersionedJson<BackupMeta[]>(STORAGE_KEYS.backups, []);
    
    const pendingBackups = backups.filter(backup => 
      backup.uploadStatus === 'pending' || 
      (backup.uploadStatus === 'failed' && (backup.retryCount || 0) < this.maxRetryCount)
    );

    for (const backup of pendingBackups) {
      await this.uploadBackup(backup);
    }
  }

  /**
   * 上传备份文件
   * 这里预留了上传接口，后期可以接入WebDAV、HTTP等上传方式
   */
  private async uploadBackup(backup: BackupMeta): Promise<void> {
    try {
      // TODO: 实现具体的上传逻辑
      // 可以支持多种上传方式：WebDAV、HTTP、FTP等
      
      console.log(`开始上传备份: ${backup.fileName}`);
      
      // 模拟上传过程
      await this.simulateUpload(backup);
      
      // 更新备份状态
      backup.uploadStatus = 'success';
      backup.lastUploadAttempt = Date.now();
      
      console.log(`备份上传成功: ${backup.fileName}`);
    } catch (error) {
      console.error(`备份上传失败: ${backup.fileName}`, error);
      
      backup.uploadStatus = 'failed';
      backup.lastUploadAttempt = Date.now();
      backup.retryCount = (backup.retryCount || 0) + 1;
    }
    
    // 更新备份元数据
    const backupManager = BackupManager.getInstance();
    backupManager.upsertBackupMeta(backup);
  }

  /**
   * 模拟上传过程
   * 实际项目中需要替换为真实的上传逻辑
   */
  private async simulateUpload(backup: BackupMeta): Promise<void> {
    return new Promise((resolve, reject) => {
      // 模拟网络延迟
      setTimeout(() => {
        // 模拟90%成功率
        if (Math.random() > 0.1) {
          resolve();
        } else {
          reject(new Error('网络错误'));
        }
      }, 2000);
    });
  }
}

// 导出单例实例
export const backupManager = BackupManager.getInstance();
export const backupScheduler = BackupScheduler.getInstance();