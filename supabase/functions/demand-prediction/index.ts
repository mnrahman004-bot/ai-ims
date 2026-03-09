import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { sales, products } = await req.json();

    // Build predictions using statistical analysis
    const predictions = products.map((product: any) => {
      const productSales = sales.filter((s: any) => s.product_id === product.id);
      const totalSold = productSales.reduce((sum: number, s: any) => sum + s.quantity, 0);
      const daysWithData = 30;
      const dailyAvg = totalSold / daysWithData;
      const weeklyPredicted = Math.ceil(dailyAvg * 7);

      // Simple trend: compare last 2 weeks
      const now = Date.now();
      const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
      const twoWeeksAgo = now - 14 * 24 * 60 * 60 * 1000;

      const recentSales = productSales.filter((s: any) => new Date(s.sale_date).getTime() > oneWeekAgo);
      const priorSales = productSales.filter((s: any) => {
        const t = new Date(s.sale_date).getTime();
        return t > twoWeeksAgo && t <= oneWeekAgo;
      });

      const recentQty = recentSales.reduce((sum: number, s: any) => sum + s.quantity, 0);
      const priorQty = priorSales.reduce((sum: number, s: any) => sum + s.quantity, 0);

      // Trend factor
      const trendFactor = priorQty > 0 ? recentQty / priorQty : 1;
      const adjustedDemand = Math.max(Math.ceil(weeklyPredicted * Math.min(trendFactor, 2)), 1);

      const reorderQty = Math.max(adjustedDemand * 2 - product.quantity, 0);
      const riskLevel: string =
        product.quantity <= product.low_stock_threshold ? "high" :
        product.quantity <= product.low_stock_threshold * 2 ? "medium" : "low";

      return {
        product_name: product.name,
        current_stock: product.quantity,
        predicted_demand: adjustedDemand,
        reorder_quantity: reorderQty,
        risk_level: riskLevel,
      };
    });

    return new Response(JSON.stringify({ predictions }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
