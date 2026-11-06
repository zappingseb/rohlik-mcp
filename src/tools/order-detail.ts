import { z } from "zod";
import { RohlikAPI } from "../rohlik-api.js";
import { getCurrency } from "../locale.js";

export function createOrderDetailTool(createRohlikAPI: () => RohlikAPI) {
  return {
    name: "get_order_detail",
    definition: {
      title: "Get Order Detail",
      description: "Get detailed information about a specific order by its ID, including all products with quantity, price and category. Set includeCategories=false to skip per-product category lookups for a faster response.",
      inputSchema: {
        orderId: z.string().describe("The order ID to fetch details for"),
        includeCategories: z.boolean().default(true).describe("Look up each product's category (default: true). Adds one request per unique product; set false for a faster, category-less response.")
      }
    },
    handler: async (args: { orderId: string; includeCategories?: boolean }) => {
      const { orderId, includeCategories = true } = args;

      try {
        const api = createRohlikAPI();
        const orderDetail = await api.getOrderDetail(orderId, includeCategories);

        if (!orderDetail) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Order with ID ${orderId} not found.`
              }
            ]
          };
        }

        const formatProduct = (product: any, index: number): string => {
          const name = product.name || 'Unknown product';
          const amount = product.amount || 1;
          const textualAmount = product.textualAmount || '';
          const totalPrice = product.priceComposition?.total?.amount ?? 0;
          const unitPrice = product.priceComposition?.unit?.amount ?? 0;
          const productId = product.id || 'N/A';
          const category = product.mainCategory ? `\n     Category: ${product.mainCategory}` : '';
          const categoryPath = product.categoryPath && product.categoryPath !== product.mainCategory
            ? `\n     Category path: ${product.categoryPath}`
            : '';

          return `  ${index + 1}. [${productId}] ${name}
     Amount: ${amount}x (${textualAmount})
     Price: ${totalPrice} ${getCurrency()} (unit: ${unitPrice} ${getCurrency()})${category}${categoryPath}`;
        };

        const order = orderDetail;
        const orderNumber = order.id || orderId;
        const orderDate = order.orderTime || 'Unknown date';
        const totalPrice = order.priceComposition?.total?.amount ?? 'Unknown';
        const deliveryPrice = order.priceComposition?.delivery?.amount ?? 0;
        const status = order.state || 'Unknown status';
        const deliverySlot = order.deliverySlot;
        const deliveryInfo = deliverySlot
          ? `${deliverySlot.since} - ${deliverySlot.till}`
          : 'N/A';
        const items = order.items || [];

        const output = `ORDER DETAILS - ${orderNumber}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Order Date: ${orderDate}
Delivery Slot: ${deliveryInfo}
Delivery Type: ${order.deliveryType || 'N/A'}
Status: ${status}
Total: ${totalPrice} ${getCurrency()} (delivery: ${deliveryPrice} ${getCurrency()})

PRODUCTS (${items.length} items):
${items.map(formatProduct).join('\n\n')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Total: ${totalPrice} ${getCurrency()}`;

        return {
          content: [
            {
              type: "text" as const,
              text: output
            }
          ]
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text" as const,
              text: error instanceof Error ? error.message : String(error)
            }
          ],
          isError: true
        };
      }
    }
  };
}