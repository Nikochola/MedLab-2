-- Migration: Integrate Kaggle Chest X-Ray (NIH) and CT Dataset
-- Supports multiple modalities and age groups

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'xray_pathology_label') THEN
        CREATE TYPE xray_pathology_label AS ENUM ('normal', 'pneumonia', 'nodule', 'mass', 'effusion', 'pneumothorax');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medical_modality') THEN
        CREATE TYPE medical_modality AS ENUM ('XRAY', 'CT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patient_age_group') THEN
        CREATE TYPE patient_age_group AS ENUM ('ADULT', 'PEDIATRIC');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.xray_training_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_path TEXT NOT NULL,
  storage_provider TEXT NOT NULL DEFAULT 'r2',
  modality medical_modality NOT NULL DEFAULT 'XRAY',
  age_group patient_age_group NOT NULL DEFAULT 'ADULT',
  label TEXT NOT NULL, -- Flexible label string
  dataset_source TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT xray_training_images_storage_path_key UNIQUE (storage_path)
);

-- Indexing for fast retrieval and filtering
CREATE INDEX IF NOT EXISTS idx_xray_training_images_modality ON public.xray_training_images(modality);
CREATE INDEX IF NOT EXISTS idx_xray_training_images_age_group ON public.xray_training_images(age_group);
CREATE INDEX IF NOT EXISTS idx_xray_training_images_label ON public.xray_training_images(label);

-- Enable RLS
ALTER TABLE public.xray_training_images ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read the training images
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'authenticated_view_training_images' AND tablename = 'xray_training_images'
    ) THEN
        CREATE POLICY "authenticated_view_training_images" 
        ON public.xray_training_images 
        FOR SELECT 
        TO authenticated 
        USING (true);
    END IF;
END $$;

-- Allow service role to manage (for ingestion scripts)
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE policyname = 'service_role_manage_training_images' AND tablename = 'xray_training_images'
    ) THEN
        CREATE POLICY "service_role_manage_training_images" 
        ON public.xray_training_images 
        FOR ALL 
        TO service_role 
        USING (true) 
        WITH CHECK (true);
    END IF;
END $$;
