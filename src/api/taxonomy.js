import { supabase } from '../lib/supabase.js';

// แผนกวิชาและหมวดกิจกรรม (CRUD โดย Admin)
function makeApi(table) {
  return {
    async list() {
      const { data, error } = await supabase.from(table).select('*').order('name');
      if (error) throw error;
      return data;
    },
    async create(name) {
      const { error } = await supabase.from(table).insert({ name });
      if (error) throw error;
    },
    async rename(id, name) {
      const { error } = await supabase.from(table).update({ name }).eq('id', id);
      if (error) throw error;
    },
    async remove(id) {
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
    },
  };
}

export const departmentsApi = makeApi('departments');
export const categoriesApi = makeApi('event_categories');