import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Brain, Loader2, TrendingUp } from "lucide-react";
import { subDays, format } from "date-fns";

type Prediction = {
  product_name: string;
  current_stock: number;
  predicted_demand: number;
  reorder_quantity: number;
  risk_level: "low" | "medium" | "high";
  reasoning?: string;
};

const Predictions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(false);

  const generatePredictions = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch sales from last 30 days and all products
      const [salesRes, productsRes] = await Promise.all([
        supabase
          .from("sales")
          .select("*, products(name)")
          .gte("sale_date", format(subDays(new Date(), 30), "yyyy-MM-dd")),
        supabase.from("products").select("*"),
      ]);

      const sales = salesRes.data || [];
      const products = productsRes.data || [];

      // Call edge function for AI predictions
      const { data, error } = await supabase.functions.invoke("demand-prediction", {
        body: { sales, products },
      });

      if (error) throw error;
      setPredictions(data.predictions || []);
      toast({ title: "Predictions generated!" });
    } catch (err: any) {
      toast({ title: "Prediction failed", description: err.message, variant: "destructive" });
      // Fallback: simple statistical prediction
      const fallbackPredictions = await generateFallbackPredictions();
      setPredictions(fallbackPredictions);
    } finally {
      setLoading(false);
    }
  };

  const generateFallbackPredictions = async (): Promise<Prediction[]> => {
    const [salesRes, productsRes] = await Promise.all([
      supabase.from("sales").select("*, products(name)").gte("sale_date", format(subDays(new Date(), 30), "yyyy-MM-dd")),
      supabase.from("products").select("*"),
    ]);

    const sales = salesRes.data || [];
    const products = productsRes.data || [];

    return products.map((product) => {
      const productSales = sales.filter((s) => s.product_id === product.id);
      const totalSold = productSales.reduce((sum, s) => sum + s.quantity, 0);
      const weeklyAvg = Math.ceil((totalSold / 30) * 7);
      const predicted = Math.max(weeklyAvg, 1);
      const reorder = Math.max(predicted * 2 - product.quantity, 0);
      const risk: "low" | "medium" | "high" =
        product.quantity <= product.low_stock_threshold ? "high" :
        product.quantity <= product.low_stock_threshold * 2 ? "medium" : "low";

      return {
        product_name: product.name,
        current_stock: product.quantity,
        predicted_demand: predicted,
        reorder_quantity: reorder,
        risk_level: risk,
      };
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">AI Demand Predictions</h1>
          <p className="text-muted-foreground mt-1 text-sm">Predict next week's demand and get reorder recommendations</p>
        </div>
        <Button onClick={generatePredictions} disabled={loading} className="shrink-0">
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Brain className="mr-2 h-4 w-4" />}
          {loading ? "Analyzing..." : "Generate Predictions"}
        </Button>
      </div>

      {predictions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Weekly Demand Forecast
            </CardTitle>
            <CardDescription>Based on your last 30 days of sales data</CardDescription>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table className="min-w-[500px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Predicted Demand</TableHead>
                  <TableHead>Reorder Qty</TableHead>
                  <TableHead>Risk</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {predictions.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{p.product_name}</TableCell>
                    <TableCell>{p.current_stock}</TableCell>
                    <TableCell>{p.predicted_demand}</TableCell>
                    <TableCell className="font-medium">
                      {p.reorder_quantity > 0 ? p.reorder_quantity : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={p.risk_level === "high" ? "destructive" : "secondary"}
                        className={p.risk_level === "medium" ? "bg-[hsl(var(--warning))] text-[hsl(var(--warning-foreground))]" : ""}
                      >
                        {p.risk_level}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <Card className="flex flex-col items-center justify-center py-16">
          <Brain className="h-16 w-16 text-muted-foreground/30 mb-4" />
          <h3 className="text-lg font-semibold">No predictions yet</h3>
          <p className="text-muted-foreground text-sm mt-1">Click "Generate Predictions" to analyze your sales data</p>
        </Card>
      )}
    </div>
  );
};

export default Predictions;
