const { DataTypes, Model } = require('sequelize');
const { sequelize } = require('../config/database');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

class CaseDocument extends Model {
  static async createWithFile(data, file, options = {}) {
    // Create case directory if it doesn't exist
    const caseDir = path.join(uploadDir, data.caseId);
    if (!fs.existsSync(caseDir)) {
      fs.mkdirSync(caseDir, { recursive: true });
    }

    // Generate unique filename
    const fileName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = path.join(caseDir, fileName);

    try {
      // Move file from temp location
      await fs.promises.rename(file.path, filePath);

      // Create document record
      return await this.create({
        ...data,
        fileName,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        path: path.join(data.caseId, fileName)
      }, options);
    } catch (error) {
      // Clean up file if database operation fails
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
      throw error;
    }
  }

  async deleteWithFile() {
    try {
      const uploadDir = createUploadDir();
      const filePath = path.join(uploadDir, this.path);

      // Delete file
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }

      // Delete database record
      await this.destroy();
    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }
}

CaseDocument.init({
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  caseId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'cases',
      key: 'id'
    },
    onDelete: 'CASCADE'
  },
  fileName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  originalName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  fileType: {
    type: DataTypes.STRING
  },
  fileSize: {
    type: DataTypes.INTEGER
  },
  uploadedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  path: {
    type: DataTypes.STRING,
    allowNull: false
  }
}, {
  sequelize,
  modelName: 'CaseDocument',
  tableName: 'case_documents',
  hooks: {
    beforeDestroy: async (document) => {
      // Clean up file when record is deleted
      try {
        const uploadDir = createUploadDir();
        const filePath = path.join(uploadDir, document.path);
        if (fs.existsSync(filePath)) {
          await fs.promises.unlink(filePath);
        }
      } catch (error) {
        console.error('Error deleting file:', error);
        throw error;
      }
    }
  }
});

module.exports = CaseDocument;