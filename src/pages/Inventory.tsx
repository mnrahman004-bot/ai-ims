import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ArrowUpDown } from "lucide-react";
import { format } from "date-fns";

const Inventory = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ product_id: "", change_type: "addition", quantity: "0", notes: "" });

  const fetchData = async () => {
    const [productsRes, logsRes] = await Promise.all([
      supabase.from("products").select("id, name, quantity"),
      supabase.from("inventory_logs").select("*, products(name)").order("created_at", { ascending: false }).limit(50),
    ]);
    setProducts(productsRes.data || []);
    setLogs(logsRes.data || []);
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  const handleUpdate = async () => {
    if (!user || !form.product_id) return;
    const product = products.find((p) => p.id === form.product_id);
    if (!product) return;

    const qty = parseInt(form.quantity);
    const change = form.change_type === "reduction" ? -qty : qty;
    const newQty = product.quantity + change;

    if (newQty < 0) {
      toast({ title: "Cannot reduce below 0", variant: "destructive" });
      return;
    }

    await supabase.from("products").update({ quantity: newQty }).eq("id", product.id);
    await supabase.from("inventory_logs").insert({
      user_id: user.id,
      product_id: product.id,
      change_type: form.change_type,
      quantity_change: change,
      previous_quantity: product.quantity,
      new_quantity: newQty,
      notes: form.notes || null,
    });

    toast({ title: "Stock updated" });
    setOpen(false);
    setForm({ product_id: "", change_type: "addition", quantity: "0", notes: "" });
    fetchData();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Inventory Control</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><ArrowUpDown className="mr-2 h-4 w-4" /> Update Stock</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Update Stock</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Product</Label>
                <Select value={form.product_id} onValueChange={(v) => setForm({ ...form, product_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
                  <SelectContent>
                    {products.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} (Current: {p.quantity})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.change_type} onValueChange={(v) => setForm({ ...form, change_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="addition">Add Stock</SelectItem>
                    <SelectItem value="reduction">Remove Stock</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>Quantity</Label><Input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></div>
              <div><Label>Notes</Label><Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Optional notes" /></div>
              <Button onClick={handleUpdate} className="w-full">Update Stock</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader><CardTitle>Recent Stock Changes</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Change</TableHead>
                <TableHead>Before → After</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{format(new Date(log.created_at), "MMM dd, HH:mm")}</TableCell>
                  <TableCell className="font-medium">{log.products?.name}</TableCell>
                  <TableCell>
                    <Badge variant={log.change_type === "addition" ? "secondary" : "destructive"}>
                      {log.change_type}
                    </Badge>
                  </TableCell>
                  <TableCell className={log.quantity_change > 0 ? "text-[hsl(var(--success))]" : "text-destructive"}>
                    {log.quantity_change > 0 ? "+" : ""}{log.quantity_change}
                  </TableCell>
                  <TableCell>{log.previous_quantity} → {log.new_quantity}</TableCell>
                  <TableCell className="text-muted-foreground">{log.notes || "—"}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No inventory changes yet</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Inventory;
