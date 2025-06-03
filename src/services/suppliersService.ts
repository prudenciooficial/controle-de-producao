import { supabase } from "@/integrations/supabase/client";
import { Supplier } from "../types";
import { createLogEntry } from "./logService";

export const fetchSuppliers = async (): Promise<Supplier[]> => {
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .order("name");
  
  if (error) throw error;
  
  return data.map(supplier => ({
    ...supplier,
    id: supplier.id,
    name: supplier.name,
    code: supplier.code,
    contacts: supplier.contacts,
    notes: supplier.notes,
    createdAt: new Date(supplier.created_at),
    updatedAt: new Date(supplier.updated_at)
  }));
};

export const createSupplier = async (
  supplier: Omit<Supplier, "id" | "createdAt" | "updatedAt">,
  userId?: string,
  userDisplayName?: string
): Promise<Supplier> => {
  const { data, error } = await supabase
    .from("suppliers")
    .insert({
      name: supplier.name,
      code: supplier.code,
      contacts: supplier.contacts,
      notes: supplier.notes
    })
    .select()
    .single();
  
  if (error) throw error;
  
  const newSupplier = {
    ...data,
    id: data.id,
    name: data.name,
    code: data.code,
    contacts: data.contacts,
    notes: data.notes,
    createdAt: new Date(data.created_at),
    updatedAt: new Date(data.updated_at)
  };
  
  await createLogEntry({
    user_id: userId,
    user_description: userDisplayName,
    action_type: "CREATE",
    entity_type: "suppliers",
    entity_id: newSupplier.id,
    details: { message: `Fornecedor '${newSupplier.name}' (ID: ${newSupplier.id}) criado.`, data: newSupplier }
  });
  
  return newSupplier;
};

export const updateSupplier = async (
  id: string,
  supplier: Partial<Supplier>,
  userId?: string,
  userDisplayName?: string
): Promise<void> => {
  const updates: any = {};
  
  if (supplier.name) updates.name = supplier.name;
  if (supplier.code !== undefined) updates.code = supplier.code;
  if (supplier.contacts !== undefined) updates.contacts = supplier.contacts;
  if (supplier.notes !== undefined) updates.notes = supplier.notes;
  
  const { error } = await supabase
    .from("suppliers")
    .update(updates)
    .eq("id", id);
  
  if (error) throw error;
  
  await createLogEntry({
    user_id: userId,
    user_description: userDisplayName,
    action_type: "UPDATE",
    entity_type: "suppliers",
    entity_id: id,
    details: { message: `Fornecedor (ID: ${id}) atualizado.`, changes: updates }
  });
};

export const deleteSupplier = async (
  id: string,
  userId?: string,
  userDisplayName?: string
): Promise<void> => {
  const { error } = await supabase
    .from("suppliers")
    .delete()
    .eq("id", id);
  
  if (error) throw error;
  
  await createLogEntry({
    user_id: userId,
    user_description: userDisplayName,
    action_type: "DELETE",
    entity_type: "suppliers",
    entity_id: id,
    details: { message: `Fornecedor (ID: ${id}) excluído.` }
  });
};
