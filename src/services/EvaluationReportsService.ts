import { supabase } from './supabaseClient';
import { EvaluationReport } from '../components/EvaluationReportsModal';

export interface EvaluationReportRecord {
  id: string;
  user_id: string;
  book_id: string;
  chapter_id: string;
  paper_title: string;
  status: 'processing' | 'completed' | 'failed';
  total_marks: number;
  obtained_marks: number;
  percentage: number;
  submitted_at: string;
  evaluation_data: EvaluationReport;
  created_at: string;
  updated_at: string;
}

export class EvaluationReportsService {
  private static instance: EvaluationReportsService;

  public static getInstance(): EvaluationReportsService {
    if (!EvaluationReportsService.instance) {
      EvaluationReportsService.instance = new EvaluationReportsService();
    }
    return EvaluationReportsService.instance;
  }

  /**
   * Create a new evaluation report in the cloud
   */
  async createEvaluationReport(
    bookId: string,
    chapterId: string,
    report: EvaluationReport
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Fetch the actual question paper data from question_papers table
      const { data: questionPaperData, error: questionPaperError } = await supabase
        .from('question_papers')
        .select('paper_data')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .eq('chapter_id', chapterId)
        .eq('title', report.paperTitle)
        .single();

      let questionPapers = [];
      if (questionPaperError) {
        console.warn(`⚠️ Could not find question paper "${report.paperTitle}" in cloud:`, questionPaperError.message);
        // Try to get from localStorage as fallback
        const localKey = `questionPapers_${bookId}_${chapterId}`;
        const localData = localStorage.getItem(localKey);
        if (localData) {
          const localPapers = JSON.parse(localData);
          const matchingPaper = localPapers.find((p: any) => p.title === report.paperTitle);
          if (matchingPaper) {
            questionPapers = [matchingPaper];
            console.log(`📝 Using localStorage fallback for "${report.paperTitle}"`);
          }
        }
      } else if (questionPaperData?.paper_data) {
        questionPapers = [questionPaperData.paper_data];
        console.log(`✅ Found question paper "${report.paperTitle}" in cloud`);
      }

      const reportRecord = {
        // Don't specify id - let database generate UUID automatically
        user_id: user.id,
        book_id: bookId,
        chapter_id: chapterId,
        paper_title: report.paperTitle,
        status: report.status,
        total_marks: report.totalMarks,
        obtained_marks: report.obtainedMarks,
        percentage: report.percentage,
        submitted_at: report.submittedAt.toISOString(),
        evaluation_data: { ...report, cloudId: undefined }, // Include original report but remove cloudId to avoid recursion
        question_papers: questionPapers // Include the actual question data
      };

      const { data, error } = await supabase
        .from('exam_evaluations')
        .insert(reportRecord)
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error creating evaluation report:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Evaluation report "${report.paperTitle}" created with cloud ID: ${data.id} (includes ${questionPapers.length} question papers)`);
      
      // Update the report with the cloud-generated UUID for future reference
      report.cloudId = data.id;
      
      return { success: true, id: data.id };
    } catch (error) {
      console.error('❌ Exception creating evaluation report:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Update an existing evaluation report in the cloud
   */
  async updateEvaluationReport(
    reportId: string,
    report: EvaluationReport
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Use cloudId if available, otherwise fall back to reportId (but this may not work for non-UUID reportIds)
      const updateId = report.cloudId || reportId;

      // Fetch the actual question paper data from question_papers table
      const { data: questionPaperData, error: questionPaperError } = await supabase
        .from('question_papers')
        .select('paper_data')
        .eq('user_id', user.id)
        .eq('title', report.paperTitle)
        .single();

      let questionPapers = [];
      if (questionPaperError) {
        console.warn(`⚠️ Could not find question paper "${report.paperTitle}" in cloud for update:`, questionPaperError.message);
      } else if (questionPaperData?.paper_data) {
        questionPapers = [questionPaperData.paper_data];
        console.log(`✅ Found question paper "${report.paperTitle}" in cloud for update`);
      }

      const { error } = await supabase
        .from('exam_evaluations')
        .update({
          paper_title: report.paperTitle,
          status: report.status,
          total_marks: report.totalMarks,
          obtained_marks: report.obtainedMarks,
          percentage: report.percentage,
          submitted_at: report.submittedAt.toISOString(),
          evaluation_data: { ...report, cloudId: undefined }, // Remove cloudId to avoid circular reference
          question_papers: questionPapers // Update with current question data
        })
        .eq('id', updateId)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error updating evaluation report:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Evaluation report "${report.paperTitle}" updated (includes ${questionPapers.length} question papers)`);
      return { success: true };
    } catch (error) {
      console.error('❌ Exception updating evaluation report:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Delete an evaluation report from the cloud
   */
  async deleteEvaluationReport(reportId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('exam_evaluations')
        .delete()
        .eq('id', reportId)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error deleting evaluation report:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Evaluation report deleted`);
      return { success: true };
    } catch (error) {
      console.error('❌ Exception deleting evaluation report:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Load all evaluation reports for a specific book/chapter from the cloud
   */
  async loadEvaluationReports(
    bookId: string,
    chapterId: string
  ): Promise<{ success: boolean; reports?: EvaluationReport[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('exam_evaluations')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .eq('chapter_id', chapterId)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading evaluation reports:', error);
        return { success: false, error: error.message };
      }

      const reports = data.map((record: EvaluationReportRecord) => ({
        ...record.evaluation_data,
        submittedAt: new Date(record.evaluation_data.submittedAt), // Ensure submittedAt is Date object
        cloudId: record.id // Add cloud ID for tracking
      }));

      console.log(`✅ Loaded ${reports.length} evaluation reports from cloud`);
      return { success: true, reports };
    } catch (error) {
      console.error('❌ Exception loading evaluation reports:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Migrate existing localStorage evaluation reports to the cloud
   */
  async migrateLocalStorageReports(
    bookId: string,
    chapterId: string,
    localReports: EvaluationReport[]
  ): Promise<{ success: boolean; migratedCount?: number; error?: string }> {
    try {
      console.log(`🔄 Migrating ${localReports.length} evaluation reports to cloud...`);
      
      let migratedCount = 0;
      const errors: string[] = [];

      for (const report of localReports) {
        // Check if this report already exists in the cloud (by ID)
        const existing = await this.findExistingReport(report.id);
        
        if (!existing.found) {
          const result = await this.createEvaluationReport(bookId, chapterId, report);
          if (result.success) {
            migratedCount++;
          } else {
            errors.push(`Failed to migrate "${report.paperTitle}": ${result.error}`);
          }
        } else {
          console.log(`📝 Report "${report.paperTitle}" already exists in cloud, skipping`);
        }
      }

      if (errors.length > 0) {
        console.warn('⚠️ Some reports failed to migrate:', errors);
      }

      console.log(`✅ Migration complete: ${migratedCount} reports migrated`);
      return { success: true, migratedCount };
    } catch (error) {
      console.error('❌ Exception during migration:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Check if a report already exists in the cloud
   */
  private async findExistingReport(reportId: string): Promise<{ found: boolean; id?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { found: false };

      const { data, error } = await supabase
        .from('exam_evaluations')
        .select('id')
        .eq('user_id', user.id)
        .eq('id', reportId)
        .limit(1);

      if (error || !data || data.length === 0) {
        return { found: false };
      }

      return { found: true, id: data[0].id };
    } catch (error) {
      console.error('❌ Error checking existing report:', error);
      return { found: false };
    }
  }

  /**
   * Sync localStorage reports with cloud (bidirectional sync)
   */
  async syncEvaluationReports(
    bookId: string,
    chapterId: string,
    localReports: EvaluationReport[]
  ): Promise<{ success: boolean; syncedReports?: EvaluationReport[]; error?: string }> {
    try {
      console.log(`🔄 Starting bidirectional sync for evaluation reports ${bookId}/${chapterId}...`);

      // 1. Load cloud reports
      const cloudResult = await this.loadEvaluationReports(bookId, chapterId);
      if (!cloudResult.success) {
        return { success: false, error: cloudResult.error };
      }

      const cloudReports = cloudResult.reports || [];
      
      // 2. Migrate any local reports not in cloud
      await this.migrateLocalStorageReports(bookId, chapterId, localReports);

      // 3. Reload cloud reports after migration
      const updatedCloudResult = await this.loadEvaluationReports(bookId, chapterId);
      if (!updatedCloudResult.success) {
        return { success: false, error: updatedCloudResult.error };
      }

      console.log(`✅ Evaluation reports sync complete: ${updatedCloudResult.reports?.length || 0} reports available`);
      return { success: true, syncedReports: updatedCloudResult.reports || [] };
    } catch (error) {
      console.error('❌ Exception during evaluation reports sync:', error);
      return { success: false, error: String(error) };
    }
  }
}

export default EvaluationReportsService.getInstance();
