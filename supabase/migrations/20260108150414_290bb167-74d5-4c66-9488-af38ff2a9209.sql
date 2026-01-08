-- Add foreign key constraints for brand_id and unit_id in inventory_items
ALTER TABLE public.inventory_items 
ADD CONSTRAINT inventory_items_brand_id_fkey 
FOREIGN KEY (brand_id) REFERENCES public.inventory_brands(id) ON DELETE SET NULL;

ALTER TABLE public.inventory_items 
ADD CONSTRAINT inventory_items_unit_id_fkey 
FOREIGN KEY (unit_id) REFERENCES public.inventory_units(id) ON DELETE SET NULL;