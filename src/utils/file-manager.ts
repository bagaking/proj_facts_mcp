import { IFileManager } from '../interfaces/core-interfaces.js';
import { promises as fs } from 'fs';
import path from 'path';

export class FileManager implements IFileManager {
  async exists(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      // Ensure directory exists
      const dir = path.dirname(filePath);
      await this.createDirectory(dir);
      
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async listFiles(directory: string): Promise<string[]> {
    try {
      if (!await this.exists(directory)) {
        return [];
      }
      
      return await fs.readdir(directory);
    } catch (error) {
      throw new Error(`Failed to list files in ${directory}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createDirectory(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      throw new Error(`Failed to create directory ${dirPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}