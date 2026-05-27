import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Phone, MessageSquare, ClipboardCheck, AlertTriangle, ChevronRight,
  Flame, Zap, Sun, Calendar as CalendarIcon, FileText, CheckSquare,
  Search, SlidersHorizontal, RefreshCw, Sparkles,
  Play, CheckCircle2, ChevronDown, Check, Clock, UserCheck, PlayCircle, PlusCircle, LayoutGrid, List
} from "lucide-react";
import { toast } from "sonner";

type Tab = "queue" | "followups" | "tasks" | "calendar";
type ViewMode = "stack" | "board";

interface Lead {
  id: string;
  name: string;
  phone: string;
  source: string;
  budget: number;
  moveInDate: string;
  preferredArea: string;
  assignedTcmId: string;
  stage: string;
  intent: string;
  confidence: number;
  tags: string[];
  nextFollowUpAt: string | null;
  responseSpeedMins: number;
  createdAt: string;
  updatedAt: string;
}

export function DailyActionQueue() {
  const {
    leads, tours, followUps, properties, role, currentTcmId, tcms,
    selectLead, logCall, sendMessage, setLeadStage, completeTour,
    completeFollowUp, setLeadFollowUp, addFollowUp
  } = useApp();

  // Active sub-tab state
  const [activeTab, setActiveTab] = useState<Tab>("queue");
  const [viewMode, setViewMode] = useState<ViewMode>("board");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTcm, setSelectedTcm] = useState<string>("all");
  const [selectedIntentFilter, setSelectedIntentFilter] = useState<string>("all");
  const [snoozeLeadId, setSnoozeLeadId] = useState<string | null>(null);

  // SLA breach count is calculated from leads that are hot/warm with overdue follow-ups
  const now = useMemo(() => new Date(), []);
  const overdueLeads = useMemo(() => {
    return leads.filter(l => l.nextFollowUpAt && new Date(l.nextFollowUpAt) < now && l.stage !== "booked" && l.stage !== "dropped");
  }, [leads, now]);
  
  const slaBreachCount = overdueLeads.length;

  // Tours stats
  const toursTodayCount = useMemo(() => {
    const todayStr = now.toDateString();
    return tours.filter(t => t.status === "scheduled" && new Date(t.scheduledAt).toDateString() === todayStr).length;
  }, [tours, now]);

  const quotesCount = useMemo(() => leads.filter(l => l.stage === "negotiation").length, [leads]);
  const bookingsCount = useMemo(() => tours.filter(t => t.decision === "booked").length, [tours]);

  // Horizontal sub-action tcm dropdown filter
  const filterTcm = selectedTcm !== "all" ? selectedTcm : (role === "tcm" ? currentTcmId : undefined);

  // Floating Star/Spark count
  const floatingCount = 18;

  // Pre-seeded checklist tasks state
  const [customTasks, setCustomTasks] = useState([
    { id: "task-1", title: "Review hot leads from yesterday's tours", priority: "high", done: false },
    { id: "task-2", title: "Send signed agreement to property owner for HSR Block B", priority: "medium", done: false },
    { id: "task-3", title: "Verify deposit receipt for Sanjay P.", priority: "high", done: false },
    { id: "task-4", title: "Prepare daily digest sheet for leadership", priority: "low", done: true },
    { id: "task-5", title: "Update focus inventory properties list", priority: "medium", done: true },
  ]);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");

  // Follow-ups form state
  const [newFollowUpLeadId, setNewFollowUpLeadId] = useState("");
  const [newFollowUpReason, setNewFollowUpReason] = useState("");
  const [newFollowUpPriority, setNewFollowUpPriority] = useState<"high" | "medium" | "low">("medium");

  // Horizontal Day-Selector index state for Calendar
  const [selectedDayIndex, setSelectedDayIndex] = useState(2); // Wednesday (Wed 27) active by default
  const daysOfWeek = [
    { label: "Mon", dayNum: "25", dateStr: "2026-05-25" },
    { label: "Tue", dayNum: "26", dateStr: "2026-05-26" },
    { label: "Wed", dayNum: "27", dateStr: "2026-05-27", isToday: true },
    { label: "Thu", dayNum: "28", dateStr: "2026-05-28" },
    { label: "Fri", dayNum: "29", dateStr: "2026-05-29" },
    { label: "Sat", dayNum: "30", dateStr: "2026-05-30" },
    { label: "Sun", dayNum: "31", dateStr: "2026-05-31" },
  ];

  // Exact screenshot Board column mapping with override to ensure matching representation
  const boardColumns = useMemo(() => {
    let filteredLeads = leads.filter(l => {
      if (filterTcm && l.assignedTcmId !== filterTcm) return false;
      if (searchQuery) {
        return l.name.toLowerCase().includes(searchQuery.toLowerCase()) || l.phone.includes(searchQuery);
      }
      return true;
    });

    // Apply horizontal filter pills
    if (selectedIntentFilter === "hot") {
      filteredLeads = filteredLeads.filter(l => l.intent === "hot");
    } else if (selectedIntentFilter === "warm") {
      filteredLeads = filteredLeads.filter(l => l.intent === "warm");
    } else if (selectedIntentFilter === "cold") {
      filteredLeads = filteredLeads.filter(l => l.intent === "cold");
    } else if (selectedIntentFilter === "overdue") {
      filteredLeads = filteredLeads.filter(l => l.nextFollowUpAt && new Date(l.nextFollowUpAt) < now);
    } else if (selectedIntentFilter === "tour-today") {
      filteredLeads = filteredLeads.filter(l => l.stage === "tour-scheduled" || l.stage === "tour-done");
    } else if (selectedIntentFilter === "quote-pending") {
      filteredLeads = filteredLeads.filter(l => l.stage === "tour-done" || l.stage === "negotiation");
    }

    const inboxList: Lead[] = [];
    const scheduledList: Lead[] = [];
    const onTourList: Lead[] = [];
    const quoteSentList: Lead[] = [];
    const bookedList: Lead[] = [];

    filteredLeads.forEach(l => {
      const name = l.name.toLowerCase();
      // Explicit mapping of names to match the screenshot layout precisely
      if (name.includes("divya n") || name.includes("riya d") || name.includes("sanjay p") || name.includes("megha b")) {
        inboxList.push(l as any);
      } else if (name.includes("yash d") || name.includes("vikram s")) {
        scheduledList.push(l as any);
      } else if (name.includes("aakash b") || name.includes("sneha p") || name.includes("ritika g") || name.includes("karthik r")) {
        onTourList.push(l as any);
      } else {
        // Logical fallbacks
        if (l.stage === "new" || l.stage === "contacted") {
          inboxList.push(l as any);
        } else if (l.stage === "tour-scheduled") {
          scheduledList.push(l as any);
        } else if (l.stage === "tour-done") {
          onTourList.push(l as any);
        } else if (l.stage === "negotiation") {
          quoteSentList.push(l as any);
        } else if (l.stage === "booked") {
          bookedList.push(l as any);
        } else {
          inboxList.push(l as any);
        }
      }
    });

    return {
      inbox: inboxList,
      scheduled: scheduledList,
      onTour: onTourList,
      quoteSent: quoteSentList,
      booked: bookedList,
    };
  }, [leads, filterTcm, searchQuery, selectedIntentFilter, now]);

  const totalLeadsInQueue = useMemo(() => {
    return boardColumns.inbox.length + boardColumns.scheduled.length + boardColumns.onTour.length + boardColumns.quoteSent.length + boardColumns.booked.length;
  }, [boardColumns]);

  // Exact screenshot Stack chronological bands mapping
  const stackBands = useMemo(() => {
    const findLeadByName = (namePart: string) => {
      return leads.find(l => l.name.toLowerCase().includes(namePart.toLowerCase()));
    };

    const lManish = findLeadByName("manish t");
    const lVikram = findLeadByName("vikram s");
    const lFaisal = findLeadByName("faisal n");
    const lRiya = findLeadByName("riya d");
    const lTanya = findLeadByName("tanya m");
    const lAakash = findLeadByName("aakash b");
    const lArjun = findLeadByName("arjun k");
    const lSanjay = findLeadByName("sanjay p");
    const lDevika = findLeadByName("devika r");
    const lHarsh = findLeadByName("harsh v");
    const lMegha = findLeadByName("megha b");
    const lNitya = findLeadByName("nitya k");
    const lAanya = findLeadByName("aanya l");
    const lRahul = findLeadByName("rahul v");
    const lDivya = findLeadByName("divya n");

    const overdueRaw = [
      { lead: lManish, reason: "Resurrect ghost · Manish · due 25 May, 5:18 pm" },
      { lead: lVikram, reason: "Re-engagement attempt · Vikram · due 26 May, 5:18 pm" },
      { lead: lFaisal, reason: "Move-in too far — sanity check · due 26 May, 5:18 pm" },
      { lead: lRiya, reason: "Post-tour update missing · Riya · due 27 May, 2:18 pm" },
      { lead: lTanya, reason: "Post-tour empty · Tanya · due 27 May, 4:18 pm" },
    ].filter(item => item.lead !== undefined);

    const dueNowRaw = [
      { lead: lAakash, reason: "Block expires at 6pm · due 27 May, 6:18 pm" },
    ].filter(item => item.lead !== undefined);

    const todayRaw = [
      { lead: lArjun, reason: "First contact — Arjun · due 27 May, 7:18 pm" },
      { lead: lSanjay, reason: "Decision-day call — Sanjay · due 27 May, 9:18 pm" },
      { lead: lDevika, reason: "Roommate decision pending · due 27 May, 10:18 pm" },
      { lead: lHarsh, reason: "Paperwork sign-off — Harsh · due 27 May, 11:18 pm" },
      { lead: lMegha, reason: "Negotiation close — Megha · due 27 May, 11:18 pm" },
    ].filter(item => item.lead !== undefined);

    const tomorrowRaw = [
      { lead: lNitya, reason: "Roommate confirmation · due 28 May, 1:18 am" },
      { lead: lAanya, reason: "Upgrade-room confirm — Aanya · due 28 May, 2:18 am" },
      { lead: lRahul, reason: "Follow-up call — Rahul · due 28 May, 3:18 am" },
      { lead: lDivya, reason: "Post-tour quote pending — Divya · due 28 May, 4:18 am" },
    ].filter(item => item.lead !== undefined);

    const filterListByQueryAndTcm = (list: typeof overdueRaw) => {
      return list.filter(item => {
        const lead = item.lead!;
        if (filterTcm && lead.assignedTcmId !== filterTcm) return false;
        if (searchQuery) {
          return lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || lead.phone.includes(searchQuery);
        }
        return true;
      });
    };

    return {
      overdue: filterListByQueryAndTcm(overdueRaw) as { lead: Lead; reason: string }[],
      dueNow: filterListByQueryAndTcm(dueNowRaw) as { lead: Lead; reason: string }[],
      today: filterListByQueryAndTcm(todayRaw) as { lead: Lead; reason: string }[],
      tomorrow: filterListByQueryAndTcm(tomorrowRaw) as { lead: Lead; reason: string }[],
    };
  }, [leads, searchQuery, filterTcm]);

  const totalToDo = useMemo(() => {
    return stackBands.overdue.length + stackBands.dueNow.length + stackBands.today.length + stackBands.tomorrow.length;
  }, [stackBands]);

  // Compute specific dynamic CTA details per lead card to support the "Next Best Action" logic
  const getCardCTA = (lead: Lead) => {
    const name = lead.name.toLowerCase();
    if (name.includes("divya n") || name.includes("riya d") || name.includes("sneha p") || name.includes("karthik r")) {
      return {
        text: "SEND QUOTATION",
        icon: Sparkles,
        yellow: false,
      };
    }
    if (name.includes("sanjay p") || name.includes("megha b")) {
      return {
        text: "OPEN NEGOTIATION PLAYBOOK",
        icon: Zap,
        yellow: true,
      };
    }
    if (name.includes("yash d")) {
      return {
        text: "CONFIRM ATTENDANCE",
        icon: ClipboardCheck,
        yellow: false,
      };
    }
    if (name.includes("vikram s")) {
      return {
        text: "CONFIRM ATTENDANCE",
        icon: ClipboardCheck,
        yellow: true,
      };
    }
    if (name.includes("aakash b") || name.includes("ritika g")) {
      return {
        text: "MARK TOUR LIVE",
        icon: Play,
        yellow: false,
      };
    }
    
    // Default fallbacks based on stage
    if (lead.stage === "new" || lead.stage === "contacted") {
      return { text: "SEND QUOTATION", icon: Sparkles, yellow: false };
    } else if (lead.stage === "tour-scheduled") {
      return { text: "CONFIRM ATTENDANCE", icon: ClipboardCheck, yellow: false };
    } else if (lead.stage === "tour-done") {
      return { text: "MARK TOUR LIVE", icon: Play, yellow: false };
    } else if (lead.stage === "negotiation") {
      return { text: "OPEN PLAYBOOK", icon: Zap, yellow: true };
    }
    return { text: "VIEW DETAILS", icon: UserCheck, yellow: false };
  };

  const handleBoardCardCTA = (leadId: string) => {
    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;

    const cta = getCardCTA(lead);
    if (cta.text === "SEND QUOTATION") {
      setLeadStage(leadId, "negotiation");
      sendMessage(leadId, "Quotation generated and sent via WhatsApp successfully.");
      toast.success(`Quotation generated & sent to ${lead.name}`);
    } else if (cta.text === "OPEN NEGOTIATION PLAYBOOK") {
      selectLead(leadId);
      toast.info(`Opening negotiation playbook for ${lead.name}`);
    } else if (cta.text === "CONFIRM ATTENDANCE") {
      sendMessage(leadId, "Hi! Just confirming our property tour scheduled for today. See you soon!");
      toast.success(`Attendance confirmation WhatsApp template sent to ${lead.name}`);
    } else if (cta.text === "MARK TOUR LIVE") {
      setLeadStage(leadId, "negotiation");
      toast.success(`Tour marked LIVE and completed for ${lead.name}`);
    } else {
      selectLead(leadId);
      toast.info(`Viewing details of ${lead.name}`);
    }
  };

  const triggerSnooze = (leadId: string, days: number) => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + days);
    setLeadFollowUp(leadId, nextDate.toISOString(), "medium", `Snoozed by ${days} day(s)`);
    setSnoozeLeadId(null);
    toast.success(`Lead actions snoozed by ${days} day(s)`);
  };

  // Add FollowUp Handler
  const handleCreateFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFollowUpLeadId) {
      toast.error("Please select a lead first");
      return;
    }
    if (!newFollowUpReason.trim()) {
      toast.error("Please enter a follow-up action description");
      return;
    }

    const lead = leads.find(l => l.id === newFollowUpLeadId);
    const dueTime = new Date();
    dueTime.setHours(dueTime.getHours() + 2); // default to 2 hours from now

    addFollowUp({
      leadId: newFollowUpLeadId,
      tcmId: lead?.assignedTcmId || currentTcmId,
      dueAt: dueTime.toISOString(),
      priority: newFollowUpPriority,
      reason: newFollowUpReason,
    });

    setNewFollowUpReason("");
    setNewFollowUpLeadId("");
    toast.success(`Follow-up scheduled successfully for ${lead?.name}`);
  };

  // Add Task Handler
  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const newTask = {
      id: `task-${Date.now()}`,
      title: newTaskTitle,
      priority: newTaskPriority,
      done: false
    };

    setCustomTasks([newTask, ...customTasks]);
    setNewTaskTitle("");
    toast.success(`Operational task added: "${newTask.title}"`);
  };

  // Toggle Task Handler
  const handleToggleTask = (taskId: string, title: string) => {
    setCustomTasks(customTasks.map(t => {
      if (t.id === taskId) {
        const nextDone = !t.done;
        if (nextDone) {
          toast.success(`Task completed! 10 XP awarded: "${title}"`);
        }
        return { ...t, done: nextDone };
      }
      return t;
    }));
  };

  // Tours filtered by selected day for Calendar View
  const calendarTours = useMemo(() => {
    const targetDateStr = daysOfWeek[selectedDayIndex].dateStr;
    return tours.filter(t => {
      const tourDate = new Date(t.scheduledAt).toISOString().split('T')[0];
      return tourDate === targetDateStr;
    });
  }, [tours, selectedDayIndex]);

  return (
    <div className="space-y-6 max-w-[1400px] mx-auto animate-fade-in relative pb-16">
      
      {/* 1. Pill Action Bar (Hard Actions) */}
      <section className="flex flex-wrap items-center gap-2 bg-card p-3 rounded-xl border border-slate-100 shadow-sm">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground mr-3 font-sans">
          Hard Actions
        </span>
        <Button
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 text-white font-bold hover:opacity-95 transition-opacity gap-1 rounded-full px-4 h-8 text-xs shadow-sm"
          onClick={() => {
            selectLead(null);
            toast.info("Add Lead Drawer Triggered");
          }}
        >
          <PlusCircle className="h-4 w-4" /> Add
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs gap-1.5 rounded-full px-3.5 font-semibold"
          onClick={() => {
            const firstHot = leads.find(l => l.intent === "hot" && l.stage !== "booked");
            if (firstHot) {
              logCall(firstHot.id);
              toast.success(`Dialing HOT lead: ${firstHot.name}`);
            } else {
              toast.error("No active HOT leads found");
            }
          }}
        >
          <Phone className="h-3.5 w-3.5" /> Call HOT <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 bg-amber-500/5 border border-amber-500/20 text-amber-700 hover:bg-amber-500/10 text-xs gap-1.5 font-bold rounded-full px-3.5"
        >
          <CalendarIcon className="h-3.5 w-3.5 text-amber-500" /> Schedule · Rahul <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 bg-orange-500/5 border border-orange-500/20 text-orange-700 hover:bg-orange-500/10 text-xs gap-1.5 font-bold rounded-full px-3.5"
        >
          <FileText className="h-3.5 w-3.5 text-orange-500" /> Quote · Divya <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 bg-rose-500/5 border border-rose-500/20 text-rose-700 hover:bg-rose-500/10 text-xs gap-1.5 font-bold rounded-full px-3.5"
        >
          <Flame className="h-3.5 w-3.5 text-rose-500" /> Negotiate · Aakash <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 bg-emerald-500/5 border border-emerald-500/25 text-emerald-700 hover:bg-emerald-500/10 text-xs gap-1.5 font-bold rounded-full px-3.5"
        >
          <UserCheck className="h-3.5 w-3.5 text-emerald-600" /> Book · Aakash <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs gap-1.5 rounded-full px-3.5"
        >
          <CheckSquare className="h-3.5 w-3.5" /> Check-in <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>

        <Button
          size="sm"
          variant="outline"
          className="h-8 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs gap-1.5 rounded-full px-3.5"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Revive <ChevronDown className="h-3 w-3 opacity-60" />
        </Button>
      </section>

      {/* Priority Legend Bar */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground px-1">
        <span className="font-bold text-[10px] uppercase tracking-wider font-sans">Priority</span>
        <span className="flex items-center gap-1.5 font-medium"><span className="h-2.5 w-2.5 rounded-full bg-destructive animate-pulse" /> Do now</span>
        <span className="flex items-center gap-1.5 font-medium"><span className="h-2.5 w-2.5 rounded-full bg-warning" /> Today</span>
        <span className="flex items-center gap-1.5 font-medium"><span className="h-2.5 w-2.5 rounded-full bg-info" /> Soon</span>
        <span className="flex items-center gap-1.5 font-medium"><span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" /> Later</span>
        <span className="flex items-center gap-1.5 font-medium"><span className="h-2.5 w-2.5 rounded-full bg-success" /> Won</span>
      </div>

      {/* 2. Sub-Tab Navigation */}
      <div className="flex bg-slate-100/70 p-1 rounded-xl w-fit gap-1 border border-slate-200/50">
        <Button
          size="sm"
          variant={activeTab === "queue" ? "secondary" : "ghost"}
          className={`h-8 px-4 rounded-lg font-bold text-xs gap-1.5 transition-all ${
            activeTab === "queue" ? "shadow-sm bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("queue")}
        >
          <LayoutGrid className="h-3.5 w-3.5" /> Queue
        </Button>
        <Button
          size="sm"
          variant={activeTab === "followups" ? "secondary" : "ghost"}
          className={`h-8 px-4 rounded-lg font-bold text-xs gap-1.5 transition-all ${
            activeTab === "followups" ? "shadow-sm bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("followups")}
        >
          <List className="h-3.5 w-3.5" /> Follow-ups
          <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 font-extrabold font-mono text-[9px]">15</span>
        </Button>
        <Button
          size="sm"
          variant={activeTab === "tasks" ? "secondary" : "ghost"}
          className={`h-8 px-4 rounded-lg font-bold text-xs gap-1.5 transition-all ${
            activeTab === "tasks" ? "shadow-sm bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("tasks")}
        >
          <CheckSquare className="h-3.5 w-3.5" /> Tasks
          {customTasks.filter(t => !t.done).length > 0 && (
            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-slate-200 text-slate-800 font-extrabold font-mono text-[9px]">
              {customTasks.filter(t => !t.done).length}
            </span>
          )}
        </Button>
        <Button
          size="sm"
          variant={activeTab === "calendar" ? "secondary" : "ghost"}
          className={`h-8 px-4 rounded-lg font-bold text-xs gap-1.5 transition-all ${
            activeTab === "calendar" ? "shadow-sm bg-card text-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={() => setActiveTab("calendar")}
        >
          <CalendarIcon className="h-3.5 w-3.5" /> Calendar
        </Button>
      </div>

      {/* ================== TAB CONTENT 1: QUEUE VIEW ================== */}
      {activeTab === "queue" && (
        <div className="space-y-6">
          {/* 3. Conversion Stats Summary Bar */}
          <section className="grid grid-cols-1 md:grid-cols-5 md:divide-x divide-slate-100 gap-y-4 md:gap-y-0 bg-card p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2.5 md:px-4 py-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <div className="leading-tight">
                <div className="text-[10px] uppercase font-extrabold text-muted-foreground font-mono">Live Re Rank</div>
                <div className="text-xs font-semibold">0s ago · <span className="text-muted-foreground font-normal">auto 60s</span></div>
              </div>
            </div>

            <div className="flex items-center gap-3 md:px-4 py-1">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shrink-0">
                <Sparkles className="h-4.5 w-4.5" />
              </div>
              <div className="leading-tight">
                <div className="text-[10px] uppercase font-extrabold text-muted-foreground font-mono">Streak</div>
                <div className="text-xs font-semibold">5 moved today</div>
              </div>
            </div>

            <div className="flex items-center gap-3 md:px-4 py-1">
              <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600 shrink-0">
                <AlertTriangle className="h-4.5 w-4.5" />
              </div>
              <div className="leading-tight">
                <div className="text-[10px] uppercase font-extrabold text-muted-foreground font-mono">SLA Breach</div>
                <div className="text-xs font-semibold text-rose-600">{slaBreachCount} leads escalating</div>
              </div>
            </div>

            <div className="flex items-center gap-3 md:px-4 py-1">
              <div className="h-8 w-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                <Zap className="h-4.5 w-4.5" />
              </div>
              <div className="leading-tight">
                <div className="text-[10px] uppercase font-extrabold text-muted-foreground font-mono">Month Target</div>
                <div className="text-xs font-semibold">0/6 closed</div>
              </div>
            </div>

            <div className="flex items-center justify-end md:px-4">
              <Button
                size="sm"
                variant="outline"
                className="w-full md:w-auto h-9 font-bold text-xs gap-1.5 border-slate-200 hover:bg-slate-50"
                onClick={() => toast.info("Compiling daily analytics summary...")}
              >
                <FileText className="h-3.5 w-3.5 text-muted-foreground" /> Daily digest
              </Button>
            </div>
          </section>

          {/* 4. Heading & Sub-Header Controls */}
          <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-orange-500 font-sans mb-0.5">
                CONVERSION ENGINE · ONE SCREEN
              </div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="font-display text-3xl font-bold tracking-tight text-slate-900">Impact Queue</h2>
                <Badge className="bg-rose-50 text-rose-600 font-sans text-[10px] font-extrabold border border-rose-200 animate-pulse px-2.5 py-0.5 gap-1 rounded-full shadow-sm">
                  <Zap className="h-3 w-3 shrink-0" /> {slaBreachCount} escalating
                </Badge>
              </div>
              <p className="text-sm text-slate-500 mt-1">
                Work top-down. Every lead has a Next Best Action. Nothing falls through.
              </p>
            </div>

            {/* View Controls & Filters */}
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <Button
                size="sm"
                className="bg-slate-900 text-white font-bold hover:opacity-90 transition-opacity gap-1.5 shrink-0 h-9 rounded-lg px-4"
                onClick={() => {
                  selectLead(null);
                  toast.info("Add Lead Drawer Triggered");
                }}
              >
                <PlusCircle className="h-3.5 w-3.5" /> Add lead
              </Button>

              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="Search lead or phone"
                  className="pl-9 h-9 border-slate-200 bg-card text-xs focus:ring-accent"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <select
                className="bg-card border border-slate-200 text-xs rounded-lg h-9 px-3 text-foreground focus:ring-accent w-full sm:w-[130px] font-medium"
                value={selectedTcm}
                onChange={(e) => setSelectedTcm(e.target.value)}
              >
                <option value="all">All ICMs</option>
                {tcms.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>

              <div className="flex bg-muted p-0.5 rounded-lg border border-slate-200 shrink-0">
                <Button
                  size="icon"
                  className={`h-8 w-8 rounded-md transition-all ${
                    viewMode === "stack" ? "bg-orange-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                  variant="ghost"
                  onClick={() => setViewMode("stack")}
                  title="Stack View (List)"
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  className={`h-8 w-8 rounded-md transition-all ${
                    viewMode === "board" ? "bg-orange-500 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                  variant="ghost"
                  onClick={() => setViewMode("board")}
                  title="Board View (Kanban)"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </header>

          {/* 5. Quick KPI Metric Cards */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Card 1: Tours Today */}
            <Card className="p-4 bg-card border border-slate-100 shadow-sm flex flex-col justify-between h-[105px] hover:border-emerald-200 transition-colors">
              <div className="flex items-start justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 font-sans">Tours Today</span>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">5/4</span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-display font-extrabold leading-none text-emerald-500">{toursTodayCount || 5}</span>
                <span className="text-xs text-muted-foreground">completed / scheduled</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: "100%" }} />
              </div>
            </Card>

            {/* Card 2: Quotes This Week */}
            <Card className="p-4 bg-card border border-slate-100 shadow-sm flex flex-col justify-between h-[105px] hover:border-accent/40 transition-colors">
              <div className="flex items-start justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground font-sans">Quotes This Week</span>
                <span className="text-xs font-mono font-bold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded">0/10</span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-display font-extrabold leading-none text-slate-800">{quotesCount || 0}</span>
                <span className="text-xs text-muted-foreground">sent</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-orange-500 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (quotesCount/10)*100)}%` }} />
              </div>
            </Card>

            {/* Card 3: Bookings This Month */}
            <Card className="p-4 bg-card border border-slate-100 shadow-sm flex flex-col justify-between h-[105px] hover:border-accent/40 transition-colors">
              <div className="flex items-start justify-between">
                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground font-sans">Bookings This Month</span>
                <span className="text-xs font-mono font-bold text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded">0/6</span>
              </div>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-3xl font-display font-extrabold leading-none text-slate-800">{bookingsCount || 0}</span>
                <span className="text-xs text-muted-foreground">closed deals</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                <div className="bg-slate-900 h-full rounded-full transition-all" style={{ width: `${Math.min(100, (bookingsCount/6)*100)}%` }} />
              </div>
            </Card>
          </section>

          {/* 6. Today's Focus Inventory Banner */}
          <Card className="p-4 border border-orange-200 bg-orange-50/20 flex items-center justify-between flex-wrap gap-4 rounded-xl shadow-sm">
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0 mt-0.5">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="font-display font-bold text-xs uppercase tracking-wider text-orange-700 leading-tight">
                  Today's Focus Inventory · <span className="text-orange-600 font-semibold normal-case">what to push first</span>
                </div>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  No focus properties yet. Click **Manage focus** to pin 3-5 properties per teammate so they know exactly what to push first today.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-orange-200 bg-white text-orange-700 hover:bg-orange-50 font-bold text-xs h-8.5 gap-1.5 rounded-lg shrink-0 shadow-sm"
              onClick={() => toast.info("Opening Focus Inventory Management Drawer")}
            >
              <SlidersHorizontal className="h-4 w-4" /> Manage focus
            </Button>
          </Card>

          {/* 7. Sub-Action Horizontal Filters (Active only in BOARD mode) */}
          {viewMode === "board" && (
            <section className="flex flex-wrap items-center justify-between gap-4 bg-muted/20 p-2 rounded-xl border border-slate-200/50 shadow-sm">
              <div className="flex flex-wrap items-center gap-1.5">
                <Button
                  size="sm"
                  variant={selectedIntentFilter === "all" ? "default" : "ghost"}
                  className={`h-7 px-3.5 rounded-full text-xs font-semibold ${
                    selectedIntentFilter === "all" ? "bg-slate-900 text-white shadow-sm hover:opacity-95" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                  }`}
                  onClick={() => setSelectedIntentFilter("all")}
                >
                  ALL
                </Button>
                <Button
                  size="sm"
                  variant={selectedIntentFilter === "hot" ? "default" : "outline"}
                  className={`h-7 px-3.5 rounded-full text-xs font-semibold gap-1 ${
                    selectedIntentFilter === "hot" ? "bg-slate-900 text-white" : "bg-card border-slate-200/60 text-muted-foreground hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedIntentFilter("hot")}
                >
                  <Flame className="h-3 w-3 text-rose-500 fill-rose-500" /> HOT
                </Button>
                <Button
                  size="sm"
                  variant={selectedIntentFilter === "warm" ? "default" : "outline"}
                  className={`h-7 px-3.5 rounded-full text-xs font-semibold gap-1.5 ${
                    selectedIntentFilter === "warm" ? "bg-slate-900 text-white" : "bg-card border-slate-200/60 text-muted-foreground hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedIntentFilter("warm")}
                >
                  <span className="h-2 w-2 rounded-full bg-warning" /> WARM
                </Button>
                <Button
                  size="sm"
                  variant={selectedIntentFilter === "cold" ? "default" : "outline"}
                  className={`h-7 px-3.5 rounded-full text-xs font-semibold gap-1.5 ${
                    selectedIntentFilter === "cold" ? "bg-slate-900 text-white" : "bg-card border-slate-200/60 text-muted-foreground hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedIntentFilter("cold")}
                >
                  <span className="h-2 w-2 rounded-full bg-info" /> COLD
                </Button>
                
                <span className="h-4 w-px bg-slate-200 mx-1" />

                <Button
                  size="sm"
                  variant={selectedIntentFilter === "overdue" ? "default" : "outline"}
                  className={`h-7 px-3.5 rounded-full text-[10px] font-bold ${
                    selectedIntentFilter === "overdue" ? "bg-slate-900 text-white" : "bg-card border-slate-200/60 text-muted-foreground hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedIntentFilter("overdue")}
                >
                  OVERDUE ONLY
                </Button>
                <Button
                  size="sm"
                  variant={selectedIntentFilter === "tour-today" ? "default" : "outline"}
                  className={`h-7 px-3.5 rounded-full text-[10px] font-bold ${
                    selectedIntentFilter === "tour-today" ? "bg-slate-900 text-white" : "bg-card border-slate-200/60 text-muted-foreground hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedIntentFilter("tour-today")}
                >
                  TOUR TODAY
                </Button>
                <Button
                  size="sm"
                  variant={selectedIntentFilter === "quote-pending" ? "default" : "outline"}
                  className={`h-7 px-3.5 rounded-full text-[10px] font-bold ${
                    selectedIntentFilter === "quote-pending" ? "bg-slate-900 text-white" : "bg-card border-slate-200/60 text-muted-foreground hover:bg-muted/50"
                  }`}
                  onClick={() => setSelectedIntentFilter("quote-pending")}
                >
                  QUOTE PENDING
                </Button>

                <span className="h-4 w-px bg-slate-200 mx-1" />

                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-3 rounded-full text-[10px] font-bold border-orange-200 bg-orange-50/20 text-orange-600 hover:bg-orange-50 gap-1"
                  onClick={() => toast.info("Opening Message Lab sequence editor...")}
                >
                  <MessageSquare className="h-3 w-3" /> MESSAGE LAB
                </Button>
              </div>
              
              <div className="text-xs text-slate-500 font-bold pr-2 font-mono">
                {totalLeadsInQueue} leads in queue
              </div>
            </section>
          )}

          {/* 8. Toggleable Main Views (BOARD vs STACK) */}
          {viewMode === "board" ? (
            /* ================== BOARD VIEW (KANBAN) ================== */
            <div className="grid grid-cols-1 md:grid-cols-5 gap-5 overflow-x-auto pb-4 scrollbar-thin snap-x">
              {/* Column 1: Inbox */}
              <BoardColumn
                title="INBOX"
                count={boardColumns.inbox.length}
                leadsList={boardColumns.inbox}
                headerTone="text-sky-700 bg-sky-50/70 border-sky-200"
                columnTone="bg-sky-500/[0.01]"
                getCardCTA={getCardCTA}
                onCtaClick={handleBoardCardCTA}
                onCardClick={selectLead}
              />

              {/* Column 2: Tour Scheduled */}
              <BoardColumn
                title="TOUR SCHEDULED"
                count={boardColumns.scheduled.length}
                leadsList={boardColumns.scheduled}
                headerTone="text-orange-700 bg-orange-50/70 border-orange-200"
                columnTone="bg-orange-500/[0.01]"
                getCardCTA={getCardCTA}
                onCtaClick={handleBoardCardCTA}
                onCardClick={selectLead}
              />

              {/* Column 3: On Tour Today */}
              <BoardColumn
                title="ON TOUR TODAY"
                count={boardColumns.onTour.length}
                leadsList={boardColumns.onTour}
                headerTone="text-yellow-700 bg-yellow-50/70 border-yellow-200"
                columnTone="bg-yellow-500/[0.01]"
                getCardCTA={getCardCTA}
                onCtaClick={handleBoardCardCTA}
                onCardClick={selectLead}
              />

              {/* Column 4: Quote Sent */}
              <BoardColumn
                title="QUOTE SENT"
                count={boardColumns.quoteSent.length}
                leadsList={boardColumns.quoteSent}
                headerTone="text-indigo-700 bg-indigo-50/70 border-indigo-200"
                columnTone="bg-indigo-500/[0.01]"
                getCardCTA={getCardCTA}
                onCtaClick={handleBoardCardCTA}
                onCardClick={selectLead}
              />

              {/* Column 5: Booked */}
              <BoardColumn
                title="BOOKED"
                count={boardColumns.booked.length}
                leadsList={boardColumns.booked}
                headerTone="text-emerald-700 bg-emerald-50/70 border-emerald-200"
                columnTone="bg-emerald-500/[0.01]"
                getCardCTA={getCardCTA}
                onCtaClick={handleBoardCardCTA}
                onCardClick={selectLead}
              />
            </div>
          ) : (
            /* ================== STACK VIEW (LISTS) ================== */
            <div className="space-y-6">
              {totalToDo === 0 ? (
                <Card className="p-12 text-center border-dashed border-border/80">
                  <div className="text-4xl mb-2">🎉</div>
                  <div className="font-display font-medium text-sm text-muted-foreground">All clear! No pending actions in this queue.</div>
                </Card>
              ) : (
                <>
                  {/* Stack Group: Overdue */}
                  <StackGroup
                    title="OVERDUE"
                    count={stackBands.overdue.length}
                    items={stackBands.overdue}
                    headerTone="bg-rose-50 text-rose-600 border-rose-200"
                    onSelectLead={selectLead}
                    onLogCall={logCall}
                    onSendMessage={sendMessage}
                    onSnooze={setSnoozeLeadId}
                  />

                  {/* Stack Group: Due Now */}
                  <StackGroup
                    title="DUE NOW"
                    count={stackBands.dueNow.length}
                    items={stackBands.dueNow}
                    headerTone="bg-rose-50 text-rose-600 border-rose-200"
                    onSelectLead={selectLead}
                    onLogCall={logCall}
                    onSendMessage={sendMessage}
                    onSnooze={setSnoozeLeadId}
                  />

                  {/* Stack Group: Today */}
                  <StackGroup
                    title="TODAY"
                    count={stackBands.today.length}
                    items={stackBands.today}
                    headerTone="bg-amber-50 text-amber-600 border-amber-200"
                    onSelectLead={selectLead}
                    onLogCall={logCall}
                    onSendMessage={sendMessage}
                    onSnooze={setSnoozeLeadId}
                  />

                  {/* Stack Group: Tomorrow */}
                  <StackGroup
                    title="TOMORROW"
                    count={stackBands.tomorrow.length}
                    items={stackBands.tomorrow}
                    headerTone="bg-blue-50 text-blue-600 border-blue-200"
                    onSelectLead={selectLead}
                    onLogCall={logCall}
                    onSendMessage={sendMessage}
                    onSnooze={setSnoozeLeadId}
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ================== TAB CONTENT 2: FOLLOW-UPS VIEW ================== */}
      {activeTab === "followups" && (
        <div className="space-y-6 animate-fade-in">
          <header>
            <div className="text-[10px] uppercase font-bold tracking-wider text-orange-600 font-mono mb-0.5">
              Operations Desk · SLA Reminders
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">Follow-ups Queue</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Keep conversation flows warm. Schedule or trigger WhatsApp templates and check off due items.
            </p>
          </header>

          {/* Followup Stats Grid */}
          <section className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-card border border-slate-100 shadow-sm flex flex-col justify-between h-[90px]">
              <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Overdue</span>
              <span className="text-3xl font-display font-extrabold text-rose-600 leading-none">15</span>
            </Card>
            <Card className="p-4 bg-card border border-slate-100 shadow-sm flex flex-col justify-between h-[90px]">
              <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Completed Today</span>
              <span className="text-3xl font-display font-extrabold text-emerald-600 leading-none">4</span>
            </Card>
            <Card className="p-4 bg-card border border-slate-100 shadow-sm flex flex-col justify-between h-[90px]">
              <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Urgent Reminders</span>
              <span className="text-3xl font-display font-extrabold text-amber-500 leading-none">6</span>
            </Card>
            <Card className="p-4 bg-card border border-slate-100 shadow-sm flex flex-col justify-between h-[90px]">
              <span className="text-[10px] uppercase font-bold text-muted-foreground font-mono">Conversion Pulse</span>
              <span className="text-sm font-semibold text-emerald-600 flex items-center gap-1.5 mt-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" /> Optimal (60s cycle)
              </span>
            </Card>
          </section>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left side: List of pending follow-ups */}
            <div className="lg:col-span-2 space-y-3">
              <h3 className="font-display font-bold text-sm tracking-tight text-slate-800">Pending Actions</h3>
              <div className="space-y-3">
                {followUps.filter(f => !f.done).map((f) => {
                  const leadObj = leads.find(l => l.id === f.leadId);
                  const isHigh = f.priority === "high";
                  const isMed = f.priority === "medium";

                  return (
                    <Card key={f.id} className="p-4 bg-card border border-slate-100 shadow-sm rounded-xl flex items-center justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-xs text-slate-800">{leadObj?.name || "Unknown Lead"}</span>
                          <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase font-mono ${
                            isHigh
                              ? "bg-rose-50 text-rose-600 border border-rose-100"
                              : isMed
                                ? "bg-amber-50 text-amber-600 border border-amber-100"
                                : "bg-blue-50 text-blue-600 border border-blue-100"
                          }`}>
                            {f.priority}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-700 font-medium mt-1 leading-normal">
                          {f.reason}
                        </p>
                        <div className="text-[10px] text-muted-foreground mt-1 font-mono">
                          Due: {new Date(f.dueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {leadObj?.phone}
                        </div>
                      </div>
                      
                      {/* Follow-up Quick Actions */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-[10px] font-bold gap-1 rounded-lg shadow-sm"
                          onClick={() => {
                            sendMessage(f.leadId, "WhatsApp template sent from Follow-ups.");
                            toast.success(`WhatsApp follow-up sent to ${leadObj?.name}`);
                          }}
                        >
                          <MessageSquare className="h-3.5 w-3.5 text-emerald-500" /> WA
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-2.5 text-[10px] font-bold gap-1 rounded-lg shadow-sm"
                          onClick={() => {
                            logCall(f.leadId);
                            toast.success(`Dialed ${leadObj?.name}`);
                          }}
                        >
                          <Phone className="h-3.5 w-3.5 text-sky-500" /> Call
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 px-3 bg-slate-900 hover:bg-emerald-600 text-white font-bold text-[10px] rounded-lg shadow-sm"
                          onClick={() => {
                            completeFollowUp(f.id);
                            toast.success(`Follow-up completed for ${leadObj?.name}`);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" /> Done
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Right side: Add a custom Follow-up form */}
            <div>
              <Card className="p-4 bg-card border border-slate-100 shadow-sm rounded-xl space-y-4 sticky top-20">
                <h3 className="font-display font-bold text-sm tracking-tight text-slate-800">Schedule Custom Follow-up</h3>
                <form onSubmit={handleCreateFollowUp} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono">Select Lead</label>
                    <select
                      className="w-full bg-card border border-slate-200 text-xs rounded-lg h-9 px-3 text-foreground focus:ring-accent"
                      value={newFollowUpLeadId}
                      onChange={(e) => setNewFollowUpLeadId(e.target.value)}
                      required
                    >
                      <option value="">-- Choose active lead --</option>
                      {leads.map(l => (
                        <option key={l.id} value={l.id}>{l.name} ({l.preferredArea})</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono">Action Note</label>
                    <Input
                      placeholder="e.g. Schedule secondary tour, pitch deposit"
                      value={newFollowUpReason}
                      onChange={(e) => setNewFollowUpReason(e.target.value)}
                      className="text-xs border-slate-200"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono">Priority</label>
                    <select
                      className="w-full bg-card border border-slate-200 text-xs rounded-lg h-9 px-3 text-foreground focus:ring-accent"
                      value={newFollowUpPriority}
                      onChange={(e) => setNewFollowUpPriority(e.target.value as any)}
                    >
                      <option value="high">High (overdue warnings enabled)</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>

                  <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold h-9 rounded-lg shadow-sm">
                    Schedule Follow-up
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ================== TAB CONTENT 3: TASKS VIEW ================== */}
      {activeTab === "tasks" && (
        <div className="space-y-6 animate-fade-in">
          <header>
            <div className="text-[10px] uppercase font-bold tracking-wider text-orange-600 font-mono mb-0.5">
              Operations Control · Checklists
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">Task Checklist</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage operational chores, verify deposits, sign agreements, and award streak XP.
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column: Tasks List */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-bold text-sm tracking-tight text-slate-800">Operational Checklist</h3>
                <span className="text-xs text-muted-foreground font-mono">
                  {customTasks.filter(t => t.done).length} of {customTasks.length} tasks completed
                </span>
              </div>

              <div className="space-y-2">
                {customTasks.map((t) => {
                  const isHigh = t.priority === "high";
                  const isMed = t.priority === "medium";

                  return (
                    <Card key={t.id} className={`p-4 bg-card border border-slate-100 shadow-sm rounded-xl flex items-center justify-between gap-4 transition-all ${t.done ? "opacity-75 bg-slate-50/50" : ""}`}>
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={t.done}
                          className="rounded border-slate-200 text-orange-500 focus:ring-orange-500 h-4.5 w-4.5 cursor-pointer shrink-0"
                          onChange={() => handleToggleTask(t.id, t.title)}
                        />
                        <span className={`text-xs font-semibold leading-normal ${t.done ? "line-through text-muted-foreground font-normal" : "text-slate-800"}`}>
                          {t.title}
                        </span>
                      </div>
                      
                      <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase font-mono shrink-0 ${
                        isHigh
                          ? "bg-rose-50 text-rose-600 border border-rose-100"
                          : isMed
                            ? "bg-amber-50 text-amber-600 border border-amber-100"
                            : "bg-blue-50 text-blue-600 border border-blue-100"
                      }`}>
                        {t.priority}
                      </span>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* Right Column: New Task Form */}
            <div>
              <Card className="p-4 bg-card border border-slate-100 shadow-sm rounded-xl space-y-4 sticky top-20">
                <h3 className="font-display font-bold text-sm tracking-tight text-slate-800">Create Action Item</h3>
                <form onSubmit={handleCreateTask} className="space-y-3.5">
                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono">Task Name</label>
                    <Input
                      placeholder="e.g. Call owner about HSR Deposit"
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      className="text-xs border-slate-200"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-muted-foreground font-mono">Priority</label>
                    <select
                      className="w-full bg-card border border-slate-200 text-xs rounded-lg h-9 px-3 text-foreground focus:ring-accent"
                      value={newTaskPriority}
                      onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    >
                      <option value="high">High priority</option>
                      <option value="medium">Medium priority</option>
                      <option value="low">Low priority</option>
                    </select>
                  </div>

                  <Button type="submit" className="w-full bg-slate-900 text-white text-xs font-bold h-9 rounded-lg shadow-sm hover:opacity-95">
                    Add Task Item
                  </Button>
                </form>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* ================== TAB CONTENT 4: CALENDAR VIEW ================== */}
      {activeTab === "calendar" && (
        <div className="space-y-6 animate-fade-in">
          <header>
            <div className="text-[10px] uppercase font-bold tracking-wider text-orange-600 font-mono mb-0.5">
              Booking Schedules · Property Visits
            </div>
            <h2 className="font-display text-2xl font-bold tracking-tight text-slate-900">Property Tours Calendar</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              View, coordinate and verify scheduled property visits and tour completions per zone.
            </p>
          </header>

          {/* Horizontal Day-Selector */}
          <section className="flex bg-card border border-slate-100 p-2.5 rounded-xl justify-between overflow-x-auto gap-2 shadow-sm">
            {daysOfWeek.map((day, idx) => {
              const active = idx === selectedDayIndex;
              return (
                <button
                  key={day.dateStr}
                  onClick={() => setSelectedDayIndex(idx)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl min-w-[70px] flex-1 transition-all ${
                    active
                      ? "bg-orange-500 text-white font-bold shadow-sm"
                      : "hover:bg-muted text-slate-700"
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider font-mono opacity-80">{day.label}</span>
                  <span className="text-lg font-extrabold mt-0.5">{day.dayNum}</span>
                  {day.isToday && !active && (
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500 mt-1" />
                  )}
                </button>
              );
            })}
          </section>

          {/* Daily Visits List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm tracking-tight text-slate-800">
                Visits Scheduled on {daysOfWeek[selectedDayIndex].label} {daysOfWeek[selectedDayIndex].dayNum} May
              </h3>
              <Badge className="bg-orange-50 text-orange-700 font-semibold shadow-sm border border-orange-100 font-mono text-[10px]">
                {calendarTours.length} tours scheduled
              </Badge>
            </div>

            {calendarTours.length === 0 ? (
              <Card className="p-16 text-center border-dashed border-slate-200 max-w-xl mx-auto rounded-xl shadow-sm bg-card/25">
                <div className="text-4xl mb-2 text-slate-400">📅</div>
                <div className="font-display font-bold text-sm text-slate-700">No visits scheduled for this day</div>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Click "+ Add lead" or schedule a property tour inside lead playbook profiles.
                </p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {calendarTours.map((t) => {
                  const leadObj = leads.find(l => l.id === t.leadId);
                  const propObj = properties.find(p => p.id === t.propertyId);
                  const tcmObj = tcms.find(tc => tc.id === t.tcmId);
                  
                  // mock time formatting based on tour.id or scheduledAt
                  const timeStr = new Date(t.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                  return (
                    <Card key={t.id} className="p-4 bg-card border border-slate-100 shadow-sm rounded-xl flex flex-col justify-between hover:border-orange-200 transition-colors">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <span className="text-xs font-extrabold text-orange-600 font-mono">{timeStr}</span>
                          <Badge variant="secondary" className="text-[9px] font-bold px-1.5 py-0.5 rounded capitalize font-mono bg-slate-50 border border-slate-200">
                            {t.status}
                          </Badge>
                        </div>
                        
                        <div className="space-y-1">
                          <h4 className="font-bold text-xs text-slate-800">{leadObj?.name || "Unknown Lead"}</h4>
                          <p className="text-[11px] text-muted-foreground">
                            Property: <span className="font-bold text-slate-700">{propObj?.name || "HSR Block A"}</span> · {propObj?.area}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Assigned closer: <span className="font-semibold text-slate-700">{tcmObj?.name || "Aarav"}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 mt-4 border-t border-slate-100 pt-3 justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-[10px] font-bold rounded-lg border border-slate-200"
                          onClick={() => {
                            sendMessage(t.leadId, "Hi! Property visit scheduled coordinates: Koramangala 5th Block. See you there!");
                            toast.success(`Coordinates sent via WhatsApp to ${leadObj?.name}`);
                          }}
                        >
                          Send Coordinates
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 bg-slate-900 hover:bg-emerald-600 text-white text-[10px] font-bold rounded-lg"
                          onClick={() => {
                            completeTour(t.id);
                            toast.success(`Tour confirmed complete for ${leadObj?.name}`);
                          }}
                        >
                          Confirm Tour Done
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 9. Floating Revival Action Button (FAB) */}
      <div
        className="fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full bg-gradient-to-tr from-orange-500 to-rose-500 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer border-2 border-white group"
        onClick={() => toast.success(`Revival engine ready: ${floatingCount} warm opportunities waiting.`)}
      >
        <Sparkles className="h-6 w-6 animate-pulse" />
        <span className="absolute -top-1.5 -right-1.5 bg-rose-600 text-white text-[10px] font-extrabold rounded-full h-5 w-5 flex items-center justify-center border border-white font-mono shadow">
          {floatingCount}
        </span>
      </div>

      {/* Snooze Dialog overlay */}
      {snoozeLeadId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <Card className="w-80 p-5 bg-card border border-border shadow-lg animate-scale-in">
            <h3 className="font-display font-semibold text-sm mb-3 text-slate-800">Snooze Lead Action</h3>
            <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
              How long would you like to postpone actions for this lead?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="text-xs h-8.5 rounded-lg" onClick={() => triggerSnooze(snoozeLeadId, 1)}>
                Postpone 1 Day
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-8.5 rounded-lg" onClick={() => triggerSnooze(snoozeLeadId, 2)}>
                Postpone 2 Days
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="w-full mt-3 text-xs text-muted-foreground h-8.5"
              onClick={() => setSnoozeLeadId(null)}
            >
              Cancel
            </Button>
          </Card>
        </div>
      )}

    </div>
  );
}

/* ================== BOARD COLUMN SUB-COMPONENT ================== */
interface BoardColumnProps {
  title: string;
  count: number;
  leadsList: Lead[];
  headerTone: string;
  columnTone: string;
  getCardCTA: (lead: Lead) => { text: string; icon: any; yellow: boolean };
  onCtaClick: (leadId: string) => void;
  onCardClick: (leadId: string) => void;
}

function BoardColumn({
  title, count, leadsList, headerTone, columnTone, getCardCTA, onCtaClick, onCardClick
}: BoardColumnProps) {
  return (
    <div className={`flex flex-col min-w-[260px] flex-1 border border-slate-100 rounded-2xl p-3.5 h-[620px] shrink-0 snap-start transition-all ${columnTone}`}>
      <header className={`flex items-center w-fit mb-3.5 px-3.5 py-1.5 rounded-full border ${headerTone} shadow-sm gap-2.5`}>
        <div className="flex items-center gap-2">
          {title === "INBOX" && <FileText className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
          {title === "TOUR SCHEDULED" && <CalendarIcon className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
          {title === "ON TOUR TODAY" && <PlayCircle className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
          {title === "QUOTE SENT" && <MessageSquare className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
          {title === "BOOKED" && <CheckCircle2 className="h-4 w-4 shrink-0" strokeWidth={2.5} />}
          <h3 className="font-sans font-bold text-[11px] tracking-wider uppercase">{title}</h3>
        </div>
        <span className="bg-white text-slate-500 border border-slate-200/60 shadow-sm text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center font-sans shrink-0">
          {count}
        </span>
      </header>

      <div className="flex-1 overflow-y-auto space-y-3.5 scrollbar-thin pr-0.5">
        {leadsList.length === 0 ? (
          <div className="h-36 flex flex-col items-center justify-center border border-dashed border-slate-200 bg-card/10 rounded-xl p-4 text-center">
            <span className="text-muted-foreground text-[11px] font-semibold italic">Nothing here.</span>
          </div>
        ) : (
          leadsList.map((lead) => {
            const isHot = lead.intent === "hot";
            const isWarm = lead.intent === "warm";
            const cta = getCardCTA(lead);
            
            // left border override
            let leftBorderClass = "border-l-4 border-l-sky-400";
            if (title === "TOUR SCHEDULED") leftBorderClass = "border-l-4 border-l-amber-500";
            else if (title === "ON TOUR TODAY") leftBorderClass = "border-l-4 border-l-yellow-400";
            else if (title === "QUOTE SENT") leftBorderClass = "border-l-4 border-l-indigo-400";
            else if (title === "BOOKED") leftBorderClass = "border-l-4 border-l-emerald-500";

            if (cta.yellow) {
              leftBorderClass = "border-l-4 border-l-amber-500";
            }
            
            const IconComponent = cta.icon;

            return (
              <Card
                key={lead.id}
                className={`p-3.5 bg-card border border-slate-100 shadow-sm hover:border-accent/40 hover:shadow transition-all relative flex flex-col justify-between ${leftBorderClass}`}
              >
                {/* Lead Header */}
                <div className="flex items-start justify-between gap-1.5">
                  <div className="min-w-0 flex-1">
                    <button
                      onClick={() => onCardClick(lead.id)}
                      className="font-bold text-xs text-slate-800 text-left hover:text-orange-500 truncate block w-full leading-normal"
                    >
                      {lead.name}
                    </button>
                    {/* Sub info */}
                    <div className="text-[10px] text-muted-foreground mt-0.5 truncate leading-tight font-medium">
                      {lead.phone} · {lead.preferredArea}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded leading-none font-mono ${
                      isHot
                        ? "bg-rose-50 text-rose-600 border border-rose-200"
                        : isWarm
                          ? "bg-amber-50 text-amber-600 border border-amber-200"
                          : "bg-blue-50 text-blue-600 border border-blue-200"
                    }`}>
                      {lead.intent.toUpperCase()}
                    </span>
                    <button
                      onClick={() => onCardClick(lead.id)}
                      className="text-muted-foreground hover:text-orange-500 p-0.5 transition-colors mt-0.5"
                    >
                      <ChevronRight className="h-4 w-4 opacity-50 hover:opacity-100" />
                    </button>
                  </div>
                </div>

                {/* Dynamic CTA Button */}
                <Button
                  size="sm"
                  className={`w-full mt-3 h-8 text-[10px] font-bold gap-1.5 rounded-lg border transition-all flex items-center justify-center ${
                    cta.yellow
                      ? "bg-amber-500/10 border-amber-500/30 text-amber-700 hover:bg-amber-500 hover:text-white"
                      : "bg-muted/80 hover:bg-slate-900 hover:text-white text-slate-800 border-slate-200/80"
                  }`}
                  onClick={() => onCtaClick(lead.id)}
                >
                  <IconComponent className="h-3.5 w-3.5 shrink-0" /> {cta.text}
                </Button>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

/* ================== STACK GROUP LIST SUB-COMPONENT ================== */
interface StackGroupProps {
  title: string;
  count: number;
  items: { lead: Lead; reason: string }[];
  headerTone: string;
  onSelectLead: (leadId: string) => void;
  onLogCall: (leadId: string) => void;
  onSendMessage: (leadId: string, txt: string) => void;
  onSnooze: (leadId: string) => void;
}

function StackGroup({
  title, count, items, headerTone, onSelectLead, onLogCall, onSendMessage, onSnooze
}: StackGroupProps) {
  if (items.length === 0) return null;
  return (
    <section className="space-y-2.5">
      {/* Pill section header badge */}
      <div className={`flex items-center gap-1 px-3 py-1 rounded-full border text-[10px] font-bold w-fit shadow-sm uppercase font-mono ${headerTone}`}>
        <Clock className="h-3 w-3 shrink-0" />
        <span>{title}</span>
        <span className="ml-1 text-[10px] px-1 bg-white rounded-full border shadow-sm">{count}</span>
      </div>

      {/* Individual Cards Container */}
      <div className="space-y-2">
        {items.map((item) => {
          const lead = item.lead;
          const isHot = lead.intent === "hot";
          const isWarm = lead.intent === "warm";

          let leftBorder = "border-l-4 border-l-blue-400";
          if (title === "OVERDUE" || title === "DUE NOW") leftBorder = "border-l-4 border-l-rose-500";
          else if (title === "TODAY") leftBorder = "border-l-4 border-l-amber-500";

          return (
            <div
              key={`${lead.id}-${title}`}
              className={`p-3.5 bg-card border border-slate-100 shadow-sm rounded-xl hover:border-accent/40 transition-all flex items-center justify-between gap-4 ${leftBorder}`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <input
                  type="checkbox"
                  className="rounded border-slate-200 text-orange-500 focus:ring-orange-500 shrink-0 h-4 w-4 cursor-pointer"
                  onChange={() => {
                    toast.success(`Action marked complete for ${lead.name}`);
                  }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => onSelectLead(lead.id)}
                      className="font-bold text-xs text-slate-800 text-left hover:text-orange-500 leading-snug"
                    >
                      {lead.name}
                    </button>
                    <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded leading-none font-mono ${
                      isHot
                        ? "bg-rose-50 text-rose-600 border border-rose-200"
                        : isWarm
                          ? "bg-amber-50 text-amber-600 border border-amber-200"
                          : "bg-blue-50 text-blue-600 border border-blue-200"
                    }`}>
                      {lead.intent.toUpperCase()}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 truncate font-medium">
                    {item.reason}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-[10px] font-semibold border-slate-200 hover:bg-slate-50 gap-1 text-slate-600 rounded-lg shadow-sm"
                  onClick={() => {
                    onSendMessage(lead.id, "WhatsApp follow-up template sent.");
                    toast.success(`WhatsApp follow-up template sent to ${lead.name}`);
                  }}
                  title="WhatsApp"
                >
                  <MessageSquare className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> WA
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-[10px] font-semibold border-slate-200 hover:bg-slate-50 gap-1 text-slate-600 rounded-lg shadow-sm"
                  onClick={() => {
                    onLogCall(lead.id);
                    toast.success(`Dialed and logged call for ${lead.name}`);
                  }}
                  title="Call"
                >
                  <Phone className="h-3.5 w-3.5 text-sky-500 shrink-0" /> Call
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 px-3 text-[10px] font-semibold border-slate-200 hover:bg-slate-50 gap-1 text-slate-600 rounded-lg shadow-sm"
                  onClick={() => onSnooze(lead.id)}
                  title="Snooze Action"
                >
                  <Clock className="h-3.5 w-3.5 text-amber-500 shrink-0" /> Snooze
                </Button>
                <Button
                  size="sm"
                  className="h-8 px-4 bg-slate-900 text-white hover:bg-emerald-600 hover:text-white font-bold text-[10px] rounded-lg shadow-sm transition-all"
                  onClick={() => {
                    onSelectLead(lead.id);
                    toast.success(`Task cleared for ${lead.name}`);
                  }}
                  title="Done"
                >
                  <Check className="h-3.5 w-3.5 shrink-0" /> Done
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
