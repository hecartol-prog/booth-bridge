import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { db, saveEvaluation } from "@/utils/dbClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Building2, Star, Loader2, SlidersHorizontal } from "lucide-react";
import { Link } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

const FIELDS = [
  { key: "company_name",       label: "Company",           editable: false },
  { key: "moq",                label: "MOQ",               editable: true,  type: "number" },
  { key: "certifications",     label: "Certifications",    editable: true,  type: "text"   },
  { key: "lead_time_days",     label: "Lead Time (days)",  editable: true,  type: "number" },
  { key: "tooling_capability", label: "Tooling Capability",editable: true,  type: "text"   },
  { key: "export_markets",     label: "Export Markets",    editable: true,  type: "text"   },
  { key: "rating",             label: "Rating (1–5)",      editable: true,  type: "number" },
  { key: "evaluation_notes",   label: "Evaluation Notes",  editable: true,  type: "textarea"},
];

function StarRating({ value, onChange }) {
  return (
    <div className="flex gap-0.5">
      {[1,2,3,4,5].map(n => (
        <button key={n} onClick={() => onChange(n)} className="focus:outline-none">
          <Star className={`w-4 h-4 ${n <= (value || 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}

function EvalCell({ mapping, fieldKey, fieldType, queryClient, toast }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(mapping[fieldKey] ?? "");

  const mut = useMutation({
    mutationFn: (/** @type {any} */ v) => saveEvaluation(mapping.id, { [fieldKey]: fieldType === "number" ? Number(v) : v }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["compare-mappings"] });
      setEditing(false);
      toast({ title: "Saved" });
    },
  });

  if (fieldKey === "rating") {
    return (
      <div className="px-1">
        <StarRating value={mapping.rating} onChange={v => mut.mutate(v)} />
      </div>
    );
  }

  if (editing) {
    const onSave = () => mut.mutate(val);
    return (
      <div className="space-y-1">
        {fieldType === "textarea" ? (
          <Textarea value={val} onChange={e => setVal(e.target.value)} rows={2} className="text-xs" autoFocus />
        ) : (
          <Input value={val} onChange={e => setVal(e.target.value)} type={fieldType} className="h-7 text-xs" autoFocus onKeyDown={e => e.key === "Enter" && onSave()} />
        )}
        <div className="flex gap-1">
          <Button size="sm" className="h-6 text-xs px-2" onClick={onSave} disabled={mut.isPending}>
            {mut.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Save"}
          </Button>
          <Button size="sm" variant="ghost" className="h-6 text-xs px-2" onClick={() => setEditing(false)}>Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <button
      className="w-full text-left text-xs text-foreground hover:text-primary min-h-[24px] cursor-pointer group"
      onClick={() => setEditing(true)}
    >
      {mapping[fieldKey] ? (
        <span>{mapping[fieldKey]}</span>
      ) : (
        <span className="text-muted-foreground group-hover:text-primary italic">+ Add</span>
      )}
    </button>
  );
}

export default function SupplierCompare() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ["sourcing-projects", user?.id],
    queryFn: () => db.SourcingProject.filter({ buyer_id: user.id }, "-created_date"),
    enabled: !!user?.id,
  });

  const [selectedProject, setSelectedProject] = useState(null);
  const activeProject = selectedProject || projects.find(p => p.status === "active") || projects[0];

  const { data: mappings = [], isLoading: loadingMappings } = useQuery({
    queryKey: ["compare-mappings", activeProject?.id],
    queryFn: () => db.ProjectSupplierMapping.filter({ project_id: activeProject.id }),
    enabled: !!activeProject?.id,
  });

  const isLoading = loadingProjects || loadingMappings;

  return (
    <div className="p-4 md:p-6 max-w-full">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <Link to="/" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-display font-bold flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" /> Supplier Workspace
          </h1>
          <p className="text-xs text-muted-foreground">Compare shortlisted suppliers side-by-side</p>
        </div>
      </div>

      {/* Project selector */}
      {projects.length > 1 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setSelectedProject(p)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                (activeProject?.id === p.id) ? "bg-primary text-white border-primary" : "border-border bg-card hover:border-primary/50"
              }`}
            >
              {p.project_name}
            </button>
          ))}
        </div>
      )}

      {/* Empty states */}
      {!isLoading && projects.length === 0 && (
        <Card className="p-8 text-center">
          <SlidersHorizontal className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-sm">No sourcing projects yet</p>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Create a project from your dashboard to start comparing suppliers.</p>
          <Link to="/"><Button size="sm">Go to Dashboard</Button></Link>
        </Card>
      )}

      {!isLoading && activeProject && mappings.length === 0 && (
        <Card className="p-8 text-center">
          <Building2 className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="font-semibold text-sm">No suppliers in this project</p>
          <p className="text-xs text-muted-foreground mt-1">Save a booth and assign it to <strong>{activeProject.project_name}</strong> to start comparing.</p>
        </Card>
      )}

      {/* Comparison matrix */}
      {activeProject && mappings.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="font-semibold text-sm">{activeProject.project_name}</p>
              <p className="text-xs text-muted-foreground">{mappings.length} supplier{mappings.length !== 1 ? "s" : ""} shortlisted</p>
            </div>
            <Badge variant="outline" className="text-xs">{activeProject.status}</Badge>
          </div>

          {/* Horizontal scroll matrix */}
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="min-w-full border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-muted/80 backdrop-blur text-left text-xs font-semibold px-3 py-2 w-32 border-b border-r border-border">Field</th>
                  {mappings.map(m => (
                    <th key={m.id} className="text-left text-xs font-semibold px-3 py-2 min-w-[160px] border-b border-r border-border bg-card">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{m.company_name || "Supplier"}</span>
                      </div>
                      {m.booth_number && <p className="text-[10px] text-muted-foreground font-normal mt-0.5">Booth {m.booth_number}</p>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FIELDS.filter(f => f.key !== "company_name").map((field, fi) => (
                  <tr key={field.key} className={fi % 2 === 0 ? "bg-muted/30" : "bg-card"}>
                    <td className="sticky left-0 z-10 text-xs font-medium px-3 py-2 border-b border-r border-border bg-inherit text-muted-foreground whitespace-nowrap">
                      {field.label}
                    </td>
                    {mappings.map(m => (
                      <td key={m.id} className="px-3 py-2 border-b border-r border-border align-top min-w-[160px]">
                        {field.editable ? (
                          <EvalCell mapping={m} fieldKey={field.key} fieldType={field.type} queryClient={queryClient} toast={toast} />
                        ) : (
                          <span className="text-xs">{m[field.key] || "—"}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
}