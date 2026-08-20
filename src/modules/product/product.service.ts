import { UploadService } from "../uploads/upload.service.js";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "../../utils/errors.js";
import { getFullStorageUrl, cleanPath, validateFile } from "../../utils/file-upload.js";
import { PlanChecker } from "../../services/plan-checker.service.js";
import type {
  CreateProductDto,
  ProductListQueryDto,
  ProductPriceDto,
  SuggestedPriceDto,
  UpdateProductDto,
} from "./product.dto.js";
import { ProductRepository } from "./product.repository.js";

const assertOwner = async (ownerId: number, shopId: number) => {
  const ownership = await ProductRepository.findOwnership(ownerId, shopId);
  if (!ownership) {
    throw new UnauthorizedError("Accès non autorisé");
  }
  return ownership;
};

const extractUploadPath = (result: unknown): string | null => {
  if (typeof result === "string") return result;
  if (
    typeof result === "object" &&
    result !== null &&
    "path" in result &&
    typeof (result as { path?: unknown }).path === "string"
  ) {
    return (result as { path: string }).path;
  }
  return null;
};

export const mapProductToDto = (product: any, bucketName = "products") => ({
  ...product,
  imageUrl: getFullStorageUrl(bucketName, product.imageUrl),
});

export const computePrice = (
  product: ProductPriceDto,
  quantity: number,
): { price: number; tier: "detail" | "semiWholesale" | "wholesale" } => {
  if (
    product.wholesalePrice &&
    product.wholesaleMinQty &&
    quantity >= product.wholesaleMinQty
  ) {
    return { price: product.wholesalePrice, tier: "wholesale" };
  }

  if (
    product.semiWholesalePrice &&
    product.semiWholesaleMinQty &&
    quantity >= product.semiWholesaleMinQty
  ) {
    return { price: product.semiWholesalePrice, tier: "semiWholesale" };
  }

  return { price: product.salePrice, tier: "detail" };
};

export const ProductService = {
  getProducts: async (shopId: number, query: ProductListQueryDto) => {
    const [total, products] = await Promise.all([
      ProductRepository.countByQuery(shopId, query),
      ProductRepository.findManyByShop(shopId, query),
    ]);

    return {
      data: products.map((product) => mapProductToDto(product, "products")),
      pagination: {
        total,
        page: query.page,
        limit: query.limit,
        totalPages: Math.ceil(total / query.limit),
      },
      totalProducts: total,
    };
  },

  getProductById: async (shopId: number, id: number) => {
    const product = await ProductRepository.findByIdAndShop(id, shopId);
    if (!product) throw new NotFoundError("Produit introuvable");
    return product;
  },

  createProduct: async (
    ownerId: number,
    shopId: number,
    data: CreateProductDto,
    file?: Express.Multer.File,
  ) => {
    const ownership = await assertOwner(ownerId, shopId);
    const subscription = await PlanChecker.plan(shopId, ownership.id);
    const currentProducts = await ProductRepository.countByShop(shopId);
    const maxProducts = subscription.limits.products ?? 50;

    if (currentProducts >= maxProducts) {
      throw new ForbiddenError(
        `Vous avez atteint la limite de ${maxProducts} produits autorisés par votre abonnement.`,
      );
    }

    let imageUrl = data.imageUrl ?? null;
    if (file) {
      validateFile(file);
      const uploadResult = await UploadService.uploadFile(
        file,
        cleanPath(file),
        "product",
      );
      imageUrl = extractUploadPath(uploadResult);
    }

    return ProductRepository.create(shopId, { ...data, imageUrl });
  },

  updateProduct: async (
    shopId: number,
    id: number,
    data: UpdateProductDto,
    file?: Express.Multer.File,
  ) => {
    const existing = await ProductRepository.findByIdAndShop(id, shopId);
    if (!existing) throw new NotFoundError("Produit introuvable");

    let finalImageUrl = existing.imageUrl;
    if (file) {
      if (existing.imageUrl) {
        await UploadService.deleteFile("products", existing.imageUrl);
      }
      validateFile(file);
      const uploadResult = await UploadService.uploadFile(
        file,
        cleanPath(file),
        "product",
      );
      finalImageUrl = extractUploadPath(uploadResult);
    } else if (data.imageUrl === "" || data.imageUrl === null) {
      if (existing.imageUrl) {
        await UploadService.deleteFile("products", existing.imageUrl);
      }
      finalImageUrl = null;
    }

    const updated = await ProductRepository.update(id, {
      ...data,
      imageUrl: finalImageUrl,
    });

    return mapProductToDto(updated, "products");
  },

  deleteProduct: async (shopId: number, id: number) => {
    const existing = await ProductRepository.findByIdAndShop(id, shopId);
    if (!existing) throw new NotFoundError("Produit introuvable");
    await ProductRepository.softDelete(id);
  },

  getLowStockProducts: async (shopId: number) =>
    ProductRepository.findLowStockByShop(shopId),

  getOutOfStockProducts: async (shopId: number) =>
    ProductRepository.findOutOfStockByShop(shopId),

  getSuggestedPrice: async (
    shopId: number,
    id: number,
    quantity: number,
  ): Promise<SuggestedPriceDto> => {
    const product = await ProductRepository.findPriceByIdAndShop(id, shopId);
    if (!product) throw new NotFoundError("Produit introuvable");

    const suggested = computePrice(product, quantity);
    return {
      quantity,
      suggestedPrice: suggested.price,
      tier: suggested.tier,
      tiers: {
        detail: { price: product.salePrice, label: "Détail" },
        semiWholesale: product.semiWholesalePrice
          ? {
              price: product.semiWholesalePrice,
              minQty: product.semiWholesaleMinQty as number,
              label: "Demi-gros",
            }
          : null,
        wholesale: product.wholesalePrice
          ? {
              price: product.wholesalePrice,
              minQty: product.wholesaleMinQty as number,
              label: "Gros",
            }
          : null,
      },
    };
  },

  validateFile,
};
