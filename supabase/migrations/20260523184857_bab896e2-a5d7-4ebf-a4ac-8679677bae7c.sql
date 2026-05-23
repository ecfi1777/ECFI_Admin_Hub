ALTER TABLE public.schedule_entry_stone_lines
  ADD CONSTRAINT schedule_entry_stone_lines_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES public.stone_suppliers(id) ON DELETE SET NULL,
  ADD CONSTRAINT schedule_entry_stone_lines_stone_type_id_fkey
    FOREIGN KEY (stone_type_id) REFERENCES public.stone_types(id) ON DELETE SET NULL;