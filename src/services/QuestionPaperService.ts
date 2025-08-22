import { supabase } from './supabaseClient';
import { QuestionPaper } from '../types/types';

export interface QuestionPaperRecord {
  id: string;
  user_id: string;
  book_id: string;
  chapter_id: string;
  title: string;
  category: 'previous-year' | 'mock' | 'custom';
  year?: string;
  paper_data: QuestionPaper;
  created_at: string;
  updated_at: string;
}

export class QuestionPaperService {
  private static instance: QuestionPaperService;

  public static getInstance(): QuestionPaperService {
    if (!QuestionPaperService.instance) {
      QuestionPaperService.instance = new QuestionPaperService();
    }
    return QuestionPaperService.instance;
  }

  /**
   * Create a new question paper in the cloud
   */
  async createQuestionPaper(
    bookId: string,
    chapterId: string,
    paper: QuestionPaper
  ): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const paperRecord = {
        user_id: user.id,
        book_id: bookId,
        chapter_id: chapterId,
        title: paper.title,
        category: paper.category,
        year: paper.year,
        paper_data: paper
      };

      const { data, error } = await supabase
        .from('question_papers')
        .insert(paperRecord)
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error creating question paper:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Question paper "${paper.title}" created with ID: ${data.id}`);
      return { success: true, id: data.id };
    } catch (error) {
      console.error('❌ Exception creating question paper:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Update an existing question paper in the cloud
   */
  async updateQuestionPaper(
    paperId: string,
    paper: QuestionPaper
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('question_papers')
        .update({
          title: paper.title,
          category: paper.category,
          year: paper.year,
          paper_data: paper
        })
        .eq('id', paperId)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error updating question paper:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Question paper "${paper.title}" updated`);
      return { success: true };
    } catch (error) {
      console.error('❌ Exception updating question paper:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Delete a question paper from the cloud
   */
  async deleteQuestionPaper(paperId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { error } = await supabase
        .from('question_papers')
        .delete()
        .eq('id', paperId)
        .eq('user_id', user.id);

      if (error) {
        console.error('❌ Error deleting question paper:', error);
        return { success: false, error: error.message };
      }

      console.log(`✅ Question paper deleted`);
      return { success: true };
    } catch (error) {
      console.error('❌ Exception deleting question paper:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Load all question papers for a specific book/chapter from the cloud
   */
  async loadQuestionPapers(
    bookId: string,
    chapterId: string
  ): Promise<{ success: boolean; papers?: QuestionPaper[]; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('question_papers')
        .select('*')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .eq('chapter_id', chapterId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading question papers:', error);
        return { success: false, error: error.message };
      }

      const papers = data.map((record: QuestionPaperRecord) => ({
        ...record.paper_data,
        cloudId: record.id, // Add cloud ID for tracking
        createdAt: new Date(record.paper_data.createdAt), // Ensure createdAt is Date object
      }));

      console.log(`✅ Loaded ${papers.length} question papers from cloud`);
      return { success: true, papers };
    } catch (error) {
      console.error('❌ Exception loading question papers:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Migrate existing localStorage question papers to the cloud
   */
  async migrateLocalStoragePapers(
    bookId: string,
    chapterId: string,
    localPapers: QuestionPaper[]
  ): Promise<{ success: boolean; migratedCount?: number; error?: string }> {
    try {
      console.log(`🔄 Migrating ${localPapers.length} question papers to cloud...`);
      
      let migratedCount = 0;
      const errors: string[] = [];

      for (const paper of localPapers) {
        // Check if this paper already exists in the cloud (by title and created date)
        const existing = await this.findExistingPaper(bookId, chapterId, paper);
        
        if (!existing.found) {
          const result = await this.createQuestionPaper(bookId, chapterId, paper);
          if (result.success) {
            migratedCount++;
          } else {
            errors.push(`Failed to migrate "${paper.title}": ${result.error}`);
          }
        } else {
          console.log(`📝 Paper "${paper.title}" already exists in cloud, skipping`);
        }
      }

      if (errors.length > 0) {
        console.warn('⚠️ Some papers failed to migrate:', errors);
      }

      console.log(`✅ Migration complete: ${migratedCount} papers migrated`);
      return { success: true, migratedCount };
    } catch (error) {
      console.error('❌ Exception during migration:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Check if a paper already exists in the cloud
   */
  private async findExistingPaper(
    bookId: string,
    chapterId: string,
    paper: QuestionPaper
  ): Promise<{ found: boolean; id?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { found: false };

      const { data, error } = await supabase
        .from('question_papers')
        .select('id')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .eq('chapter_id', chapterId)
        .eq('title', paper.title)
        .limit(1);

      if (error || !data || data.length === 0) {
        return { found: false };
      }

      return { found: true, id: data[0].id };
    } catch (error) {
      console.error('❌ Error checking existing paper:', error);
      return { found: false };
    }
  }

  /**
   * Sync localStorage papers with cloud (bidirectional sync)
   */
  async syncQuestionPapers(
    bookId: string,
    chapterId: string,
    localPapers: QuestionPaper[]
  ): Promise<{ success: boolean; syncedPapers?: QuestionPaper[]; error?: string }> {
    try {
      console.log(`🔄 Starting bidirectional sync for ${bookId}/${chapterId}...`);

      // 1. Load cloud papers
      const cloudResult = await this.loadQuestionPapers(bookId, chapterId);
      if (!cloudResult.success) {
        return { success: false, error: cloudResult.error };
      }

      const cloudPapers = cloudResult.papers || [];
      
      // 2. Migrate any local papers not in cloud
      await this.migrateLocalStoragePapers(bookId, chapterId, localPapers);

      // 3. Reload cloud papers after migration
      const updatedCloudResult = await this.loadQuestionPapers(bookId, chapterId);
      if (!updatedCloudResult.success) {
        return { success: false, error: updatedCloudResult.error };
      }

      console.log(`✅ Sync complete: ${updatedCloudResult.papers?.length || 0} papers available`);
      return { success: true, syncedPapers: updatedCloudResult.papers || [] };
    } catch (error) {
      console.error('❌ Exception during sync:', error);
      return { success: false, error: String(error) };
    }
  }
}

export default QuestionPaperService.getInstance();
