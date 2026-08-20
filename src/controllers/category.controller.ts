import { CategoryController as DomainCategoryController } from "../modules/category/category.controller.js";

export const getCategories = DomainCategoryController.getCategories;
export const createCategory = DomainCategoryController.createCategory;
export const deleteCategory = DomainCategoryController.deleteCategory;
