export type { Category, CategoryNode } from "./model/types";
export { CATEGORIES } from "./model/data";
export { useCategories } from "./model/useCategories";
export { useCreateCategory } from "./model/useCreateCategory";
export { buildCategoryTree, flattenCategoryTree, MAX_CATEGORY_DEPTH } from "./lib/tree";
export { useMoveCategory } from "./model/useMoveCategory";
export { canMove, evaluateDrop, moveCategory, resolveDrop } from "./lib/move";
export type { DropZone, MoveTarget } from "./lib/move";
