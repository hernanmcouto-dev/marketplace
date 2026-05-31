-- Create table for PDF page selection presets
CREATE TABLE public.pdf_page_presets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  pages INTEGER[] NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pdf_page_presets ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view presets
CREATE POLICY "Anyone can view presets"
ON public.pdf_page_presets
FOR SELECT
USING (true);

-- Allow anyone to create presets
CREATE POLICY "Anyone can create presets"
ON public.pdf_page_presets
FOR INSERT
WITH CHECK (true);

-- Allow anyone to delete presets
CREATE POLICY "Anyone can delete presets"
ON public.pdf_page_presets
FOR DELETE
USING (true);

-- Allow anyone to update presets
CREATE POLICY "Anyone can update presets"
ON public.pdf_page_presets
FOR UPDATE
USING (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pdf_page_presets_updated_at
BEFORE UPDATE ON public.pdf_page_presets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();