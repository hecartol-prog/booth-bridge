import React, { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { createSourcingProject } from "@/utils/dbClient";
import { useToast } from "@/components/ui/use-toast";
import { FolderPlus, Loader2 } from "lucide-react";

export default function CreateProjectSheet({ open, onOpenChange, buyerId, onCreated }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    project_name: "",
    description: "",
    target_moq: "",
    required_certifications: "",
    budget_range: "",
    deadline: "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.project_name.trim()) {
      toast({ title: "Project name is required", variant: "destructive" });
      return;
    }
    setLoading(true);
    const project = await createSourcingProject({
      buyer_id: buyerId,
      project_name: form.project_name.trim(),
      description: form.description,
      target_moq: form.target_moq ? Number(form.target_moq) : undefined,
      required_certifications: form.required_certifications,
      budget_range: form.budget_range,
      deadline: form.deadline || undefined,
      status: "active",
    });
    setLoading(false);
    toast({ title: "Project created!", description: form.project_name });
    setForm({ project_name: "", description: "", target_moq: "", required_certifications: "", budget_range: "", deadline: "" });
    onOpenChange(false);
    if (onCreated) onCreated(project);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <FolderPlus className="w-5 h-5 text-primary" /> New Sourcing Project
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3">
          <div>
            <Label>Project Name *</Label>
            <Input placeholder="e.g. Injection Molded Pet Products Q3" value={form.project_name} onChange={e => set("project_name", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea placeholder="What are you sourcing? Key requirements..." value={form.description} onChange={e => set("description", e.target.value)} className="mt-1" rows={2} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Target MOQ</Label>
              <Input type="number" placeholder="e.g. 500" value={form.target_moq} onChange={e => set("target_moq", e.target.value)} className="mt-1" />
            </div>
            <div>
              <Label>Budget Range</Label>
              <Input placeholder="e.g. $10k–$50k" value={form.budget_range} onChange={e => set("budget_range", e.target.value)} className="mt-1" />
            </div>
          </div>
          <div>
            <Label>Required Certifications</Label>
            <Input placeholder="ISO9001, CE, FSC (comma-separated)" value={form.required_certifications} onChange={e => set("required_certifications", e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>Deadline</Label>
            <Input type="date" value={form.deadline} onChange={e => set("deadline", e.target.value)} className="mt-1" />
          </div>
        </div>

        <SheetFooter className="mt-6 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FolderPlus className="w-4 h-4 mr-2" />}
            Create Project
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}