-- Migration: Update X-Ray Training Images Schema
-- Adds modality and age_group columns that were missing in the remote database

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'medical_modality') THEN
        CREATE TYPE medical_modality AS ENUM ('XRAY', 'CT');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'patient_age_group') THEN
        CREATE TYPE patient_age_group AS ENUM ('ADULT', 'PEDIATRIC');
    END IF;
END $$;

-- Alter table to add new columns if they don't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='xray_training_images' AND column_name='modality') THEN
        ALTER TABLE public.xray_training_images ADD COLUMN modality medical_modality NOT NULL DEFAULT 'XRAY';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='xray_training_images' AND column_name='age_group') THEN
        ALTER TABLE public.xray_training_images ADD COLUMN age_group patient_age_group NOT NULL DEFAULT 'ADULT';
    END IF;
END $$;

-- Update indexes
CREATE INDEX IF NOT EXISTS idx_xray_training_images_modality ON public.xray_training_images(modality);
CREATE INDEX IF NOT EXISTS idx_xray_training_images_age_group ON public.xray_training_images(age_group);

-- Ensure label column is text (flexible)
ALTER TABLE public.xray_training_images ALTER COLUMN label TYPE TEXT;
