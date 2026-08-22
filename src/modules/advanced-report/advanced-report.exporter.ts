import type { AdvancedReport } from "./advanced-report.dto.js";

const csvValue = (value: unknown) => {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const row = (values: unknown[]) => values.map(csvValue).join(";");

export const AdvancedReportExporter = {
  toCsv: (report: AdvancedReport) => {
    const rows: string[] = [
      row(["Section", "Indicateur", "Valeur", "Détail"]),
      row(["Période", "Du", report.period.from ?? "", ""]),
      row(["Période", "Au", report.period.to ?? "", ""]),
      row(["Période", "Granularité", report.granularity, ""]),
      row(["KPI", "Chiffre d’affaires brut", report.kpis.grossRevenue, "FCFA"]),
      row(["KPI", "Remboursements", report.kpis.refunds, "FCFA"]),
      row(["KPI", "Chiffre d’affaires net", report.kpis.netRevenue, "FCFA"]),
      row(["KPI", "Coût CMP connu", report.kpis.knownCost, "FCFA"]),
      row(["KPI", "Marge connue", report.kpis.knownMargin, "FCFA"]),
      row(["KPI", "Taux de marge connu", report.kpis.knownMarginRate, "%"]),
      row(["KPI", "Dépenses opérationnelles", report.kpis.operatingExpenses, "FCFA"]),
      row(["KPI", "Résultat net connu", report.kpis.knownNetResult, "FCFA"]),
      row(["KPI", "Nombre de ventes", report.kpis.salesCount, ""]),
      row(["KPI", "Panier moyen", report.kpis.averageBasket, "FCFA"]),
      row(["KPI", "Unités vendues", report.kpis.unitsSold, ""]),
      row(["KPI", "Unités retournées", report.kpis.unitsReturned, ""]),
      row(["KPI", "Couverture des coûts", report.kpis.costCoverageRate, "%"]),
      row(["KPI", "Unités en stock", report.kpis.stockUnits, ""]),
      row(["KPI", "Valeur du stock", report.kpis.stockValue, "FCFA"]),
      row(["KPI", "Rotation du stock", report.kpis.inventoryTurnover, ""]),
      row(["Tendance", "Période", "CA brut", "Remboursements", "CA net", "Coût connu", "Marge connue", "Ventes"]),
      ...report.trend.map((item) => row(["Tendance", item.label, item.revenue, item.refunds, item.netRevenue, item.knownCost, item.knownMargin, item.salesCount])),
      row(["Produit", "Produit", "Catégorie", "Unités vendues", "Unités retournées", "CA net", "Coût connu", "Marge connue", "Stock", "Rotation", "Statut"]),
      ...report.products.map((item) => row(["Produit", item.productName, item.categoryName ?? "Sans catégorie", item.unitsSold, item.unitsReturned, item.netRevenue, item.knownCost, item.knownMargin, item.stockQuantity, item.turnover, item.costStatus])),
      row(["Catégorie", "Catégorie", "CA net", "Coût connu", "Marge connue", "Unités vendues"]),
      ...report.categories.map((item) => row(["Catégorie", item.categoryName, item.netRevenue, item.knownCost, item.knownMargin, item.unitsSold])),
      row(["Dépense", "Catégorie", "Montant"]),
      ...report.expenses.map((item) => row(["Dépense", item.category, item.amount])),
      row(["Dormant", "Produit", "Stock", "Valeur stock", "Dernier mouvement"]),
      ...report.dormantProducts.map((item) => row(["Dormant", item.productName, item.stockQuantity, item.stockValue, item.lastMovementAt ?? ""])),
    ];
    return `\uFEFF${rows.join("\r\n")}\r\n`;
  },
};
