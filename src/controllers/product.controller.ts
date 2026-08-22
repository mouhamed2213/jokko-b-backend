import {
  ProductController as DomainProductController,
  computePrice,
  mapProductToDto,
} from "../modules/product/product.controller.js";

export { computePrice, mapProductToDto };

export const getProducts = DomainProductController.getProducts;
export const getProductById = DomainProductController.getProductById;
export const createProduct = DomainProductController.createProduct;
export const importProductsCsv = DomainProductController.importCsv;

export const updateProduct = DomainProductController.updateProduct;
export const deleteProduct = DomainProductController.deleteProduct;
export const getLowStockProducts = DomainProductController.getLowStockProducts;
export const getOutOfStockProducts = DomainProductController.getOutOfStockProducts;
export const getSuggestedPrice = DomainProductController.getSuggestedPrice;
export const uploadProductImage = DomainProductController.uploadProductImage;
