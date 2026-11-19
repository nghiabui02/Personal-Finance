/** Shared category projections for memberships and historical financial reads. */
const CATEGORY_REF_COLUMNS = 'id, name, icon, color, system_key, is_active, template:categories(default_key)'

export const CATEGORY_RELATION = `categories:user_categories(${CATEGORY_REF_COLUMNS})` as const
export const CATEGORY_COLUMNS = `${CATEGORY_REF_COLUMNS}, user_id, category_id, type` as const
export const TEMPLATE_COLUMNS = 'id, default_key, collection, type, icon, color, is_available'
