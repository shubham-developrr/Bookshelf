-- Asset Metadata Table for Supabase Storage Integration
-- This table stores metadata for all uploaded assets (images, PDFs, videos, etc.)

CREATE TABLE IF NOT EXISTS asset_metadata (
    id TEXT PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type TEXT NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    book_id TEXT,
    chapter_id TEXT,
    tab_id TEXT,
    asset_type TEXT NOT NULL CHECK (asset_type IN ('image', 'pdf', 'video', 'audio', 'document')),
    original_name TEXT NOT NULL,
    public_url TEXT NOT NULL,
    storage_key TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_asset_metadata_user_id ON asset_metadata(user_id);
CREATE INDEX IF NOT EXISTS idx_asset_metadata_book_id ON asset_metadata(book_id);
CREATE INDEX IF NOT EXISTS idx_asset_metadata_chapter_id ON asset_metadata(chapter_id);
CREATE INDEX IF NOT EXISTS idx_asset_metadata_asset_type ON asset_metadata(asset_type);
CREATE INDEX IF NOT EXISTS idx_asset_metadata_uploaded_at ON asset_metadata(uploaded_at DESC);

-- Row Level Security (RLS) Policies
ALTER TABLE asset_metadata ENABLE ROW LEVEL SECURITY;

-- Users can only access their own assets
CREATE POLICY "Users can view their own assets" ON asset_metadata
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own assets" ON asset_metadata
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own assets" ON asset_metadata
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own assets" ON asset_metadata
    FOR DELETE USING (auth.uid() = user_id);

-- Storage Bucket Setup
-- Note: This needs to be run in the Supabase dashboard or via API
-- as it requires admin privileges

-- CREATE STORAGE BUCKET 'book-assets' (run this via Supabase dashboard):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('book-assets', 'book-assets', true);

-- Storage RLS Policies (run via Supabase dashboard):
-- CREATE POLICY "Users can upload their own assets" ON storage.objects
--     FOR INSERT WITH CHECK (bucket_id = 'book-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view their own assets" ON storage.objects
--     FOR SELECT USING (bucket_id = 'book-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete their own assets" ON storage.objects
--     FOR DELETE USING (bucket_id = 'book-assets' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_asset_metadata_updated_at
    BEFORE UPDATE ON asset_metadata
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE asset_metadata IS 'Metadata for all user-uploaded assets (images, PDFs, videos, etc.)';
COMMENT ON COLUMN asset_metadata.id IS 'Unique identifier for the asset';
COMMENT ON COLUMN asset_metadata.user_id IS 'ID of the user who uploaded the asset';
COMMENT ON COLUMN asset_metadata.file_name IS 'Original filename as provided by user';
COMMENT ON COLUMN asset_metadata.file_size IS 'File size in bytes';
COMMENT ON COLUMN asset_metadata.mime_type IS 'MIME type of the file';
COMMENT ON COLUMN asset_metadata.book_id IS 'Associated book ID (optional)';
COMMENT ON COLUMN asset_metadata.chapter_id IS 'Associated chapter ID (optional)';
COMMENT ON COLUMN asset_metadata.tab_id IS 'Associated tab ID for tab-isolated content (optional)';
COMMENT ON COLUMN asset_metadata.asset_type IS 'Type of asset: image, pdf, video, audio, or document';
COMMENT ON COLUMN asset_metadata.public_url IS 'Public URL for accessing the asset';
COMMENT ON COLUMN asset_metadata.storage_key IS 'Storage key/path in Supabase storage bucket';
