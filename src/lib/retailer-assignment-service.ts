import { db } from '@/lib/firebase';
import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

/**
 * 零售商分配服务
 * 独立管理零售商与批发商和配送员的分配关系
 */
export class RetailerAssignmentService {
  
  /**
   * 创建零售商分配
   */
  static async createRetailerAssignment(
    retailerId: string,
    wholesalerId: string,
    assignmentData: {
      areaId: string;
      assignedLineWorkerId: string;
      zipcodes: string[];
      notes?: string;
    },
    tenantId: string
  ): Promise<string> {
    try {
      // 验证输入
      if (!retailerId || !wholesalerId || !assignmentData.areaId || !assignmentData.assignedLineWorkerId || !tenantId) {
        throw new Error('Missing required fields for retailer assignment');
      }

      // 创建分配记录
      const assignmentRef = await addDoc(collection(db, 'retailerAssignments'), {
        retailerId,
        wholesalerId,
        areaId: assignmentData.areaId,
        assignedLineWorkerId: assignmentData.assignedLineWorkerId,
        zipcodes: assignmentData.zipcodes || [],
        notes: assignmentData.notes || '',
        isActive: true,
        tenantId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        assignedBy: tenantId
      });

      console.log(`Created retailer assignment: ${assignmentRef.id} for retailer: ${retailerId}`);
      return assignmentRef.id;
    } catch (error) {
      console.error('Error creating retailer assignment:', error);
      throw error;
    }
  }

  /**
   * 更新零售商分配信息
   */
  static async updateRetailerAssignment(
    retailerId: string,
    wholesalerId: string,
    assignmentData: {
      areaId?: string;
      assignedLineWorkerId?: string;
      zipcodes?: string[];
      notes?: string;
      isActive?: boolean;
    },
    tenantId: string
  ): Promise<void> {
    try {
      // 验证输入
      if (!retailerId || !wholesalerId || !tenantId) {
        throw new Error('Missing required fields for retailer assignment update');
      }

      // 获取现有分配信息
      const existingAssignment = await this.getRetailerAssignments(retailerId, tenantId);
      const wholesalerAssignment = existingAssignment.find(a => a.wholesalerId === wholesalerId);

      if (!wholesalerAssignment) {
        throw new Error('No existing assignment found for this retailer and wholesaler');
      }

      // 准备更新数据 - 只包含提供的字段
      const updateData: any = {};
      
      if (assignmentData.areaId !== undefined) {
        updateData.areaId = assignmentData.areaId;
      }
      
      if (assignmentData.assignedLineWorkerId !== undefined) {
        updateData.assignedLineWorkerId = assignmentData.assignedLineWorkerId;
      }
      
      if (assignmentData.zipcodes !== undefined) {
        updateData.zipcodes = assignmentData.zipcodes;
      }
      
      if (assignmentData.notes !== undefined) {
        updateData.notes = assignmentData.notes;
      }
      
      if (assignmentData.isActive !== undefined) {
        updateData.isActive = assignmentData.isActive;
      }

      // 更新分配信息
      const assignmentRef = doc(db, 'retailerAssignments', wholesalerAssignment.assignmentId);
      await updateDoc(assignmentRef, {
        ...updateData,
        updatedAt: serverTimestamp(),
        updatedBy: tenantId
      });

      console.log(`Updated retailer assignment: ${retailerId} for wholesaler: ${wholesalerId}`);
    } catch (error) {
      console.error('Error updating retailer assignment:', error);
      throw error;
    }
  }

  /**
   * 获取零售商的所有分配信息
   */
  static async getRetailerAssignments(
    retailerId: string, 
    tenantId: string
  ): Promise<Array<{
    assignmentId: string;
    wholesalerId: string;
    areaId: string;
    assignedLineWorkerId: string;
    zipcodes: string[];
    notes: string;
    isActive: boolean;
    assignedAt: Timestamp;
    updatedAt: Timestamp;
  }>> {
    try {
      const assignmentsQuery = query(
        collection(db, 'retailerAssignments'),
        where('retailerId', '==', retailerId),
        where('tenantId', '==', tenantId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(assignmentsQuery);
      return querySnapshot.docs.map(doc => ({
        assignmentId: doc.id,
        wholesalerId: doc.data().wholesalerId,
        areaId: doc.data().areaId,
        assignedLineWorkerId: doc.data().assignedLineWorkerId,
        zipcodes: doc.data().zipcodes || [],
        notes: doc.data().notes || '',
        isActive: doc.data().isActive,
        assignedAt: doc.data().createdAt,
        updatedAt: doc.data().updatedAt
      }));
    } catch (error) {
      console.error('Error getting retailer assignments:', error);
      return [];
    }
  }

  /**
   * 获取配送员的所有零售商分配
   */
  static async getLineWorkerRetailers(
    lineWorkerId: string,
    tenantId: string
  ): Promise<Array<{
    assignmentId: string;
    retailerId: string;
    wholesalerId: string;
    areaId: string;
    zipcodes: string[];
    notes: string;
    assignedAt: Timestamp;
  }>> {
    try {
      const assignmentsQuery = query(
        collection(db, 'retailerAssignments'),
        where('assignedLineWorkerId', '==', lineWorkerId),
        where('tenantId', '==', tenantId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(assignmentsQuery);
      return querySnapshot.docs.map(doc => ({
        assignmentId: doc.id,
        retailerId: doc.data().retailerId,
        wholesalerId: doc.data().wholesalerId,
        areaId: doc.data().areaId,
        zipcodes: doc.data().zipcodes || [],
        notes: doc.data().notes || '',
        assignedAt: doc.data().createdAt
      }));
    } catch (error) {
      console.error('Error getting line worker retailers:', error);
      return [];
    }
  }

  /**
   * 获取区域的所有零售商分配
   */
  static async getAreaRetailers(
    areaId: string,
    tenantId: string
  ): Promise<Array<{
    assignmentId: string;
    retailerId: string;
    wholesalerId: string;
    assignedLineWorkerId: string;
    zipcodes: string[];
    notes: string;
    assignedAt: Timestamp;
  }>> {
    try {
      const assignmentsQuery = query(
        collection(db, 'retailerAssignments'),
        where('areaId', '==', areaId),
        where('tenantId', '==', tenantId),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(assignmentsQuery);
      return querySnapshot.docs.map(doc => ({
        assignmentId: doc.id,
        retailerId: doc.data().retailerId,
        wholesalerId: doc.data().wholesalerId,
        assignedLineWorkerId: doc.data().assignedLineWorkerId,
        zipcodes: doc.data().zipcodes || [],
        notes: doc.data().notes || '',
        assignedAt: doc.data().createdAt
      }));
    } catch (error) {
      console.error('Error getting area retailers:', error);
      return [];
    }
  }

  /**
   * 删除零售商分配（软删除）
   */
  static async deleteRetailerAssignment(
    assignmentId: string,
    tenantId: string
  ): Promise<void> {
    try {
      const assignmentRef = doc(db, 'retailerAssignments', assignmentId);
      await updateDoc(assignmentRef, {
        isActive: false,
        updatedAt: serverTimestamp(),
        deletedBy: tenantId
      });

      console.log(`Deleted retailer assignment: ${assignmentId}`);
    } catch (error) {
      console.error('Error deleting retailer assignment:', error);
      throw error;
    }
  }

  /**
   * 重新分配零售商给新的配送员
   */
  static async reassignRetailerToLineWorker(
    retailerId: string,
    newLineWorkerId: string,
    wholesalerId: string,
    tenantId: string
  ): Promise<void> {
    try {
      // 获取现有分配
      const existingAssignments = await this.getRetailerAssignments(retailerId, tenantId);
      const wholesalerAssignment = existingAssignments.find(a => a.wholesalerId === wholesalerId);

      if (!wholesalerAssignment) {
        throw new Error('No existing assignment found for this retailer and wholesaler');
      }

      // 更新分配信息
      await this.updateRetailerAssignment(
        retailerId,
        wholesalerId,
        {
          assignedLineWorkerId: newLineWorkerId
        },
        tenantId
      );

      console.log(`Reassigned retailer ${retailerId} to line worker ${newLineWorkerId}`);
    } catch (error) {
      console.error('Error reassigning retailer:', error);
      throw error;
    }
  }

  /**
   * 获取分配统计信息
   */
  static async getAssignmentStats(
    tenantId: string,
    wholesalerId?: string
  ): Promise<{
    totalAssignments: number;
    activeAssignments: number;
    assignmentsByArea: Record<string, number>;
    assignmentsByLineWorker: Record<string, number>;
  }> {
    try {
      let assignmentsQuery = query(
        collection(db, 'retailerAssignments'),
        where('tenantId', '==', tenantId)
      );

      if (wholesalerId) {
        assignmentsQuery = query(
          collection(db, 'retailerAssignments'),
          where('tenantId', '==', tenantId),
          where('wholesalerId', '==', wholesalerId)
        );
      }

      const querySnapshot = await getDocs(assignmentsQuery);
      const assignments = querySnapshot.docs.map(doc => doc.data());

      const activeAssignments = assignments.filter(a => a.isActive);
      
      const assignmentsByArea: Record<string, number> = {};
      const assignmentsByLineWorker: Record<string, number> = {};

      activeAssignments.forEach(assignment => {
        assignmentsByArea[assignment.areaId] = (assignmentsByArea[assignment.areaId] || 0) + 1;
        assignmentsByLineWorker[assignment.assignedLineWorkerId] = (assignmentsByLineWorker[assignment.assignedLineWorkerId] || 0) + 1;
      });

      return {
        totalAssignments: assignments.length,
        activeAssignments: activeAssignments.length,
        assignmentsByArea,
        assignmentsByLineWorker
      };
    } catch (error) {
      console.error('Error getting assignment stats:', error);
      return {
        totalAssignments: 0,
        activeAssignments: 0,
        assignmentsByArea: {},
        assignmentsByLineWorker: {}
      };
    }
  }
}