python

from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import mm, cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, HRFlowable, KeepTogether
)
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.lib.colors import HexColor
import datetime

# ── Colour palette ──────────────────────────────────────────────────────────
AWS_DARK   = HexColor("#0D1B2A")   # near-black navy
AWS_BLUE   = HexColor("#1A6FA8")   # AWS primary blue
AWS_ORANGE = HexColor("#FF9900")   # AWS signature orange
AWS_LIGHT  = HexColor("#E8F4FD")   # light blue tint
AWS_ACCENT = HexColor("#2D9CDB")   # accent blue
GRAY_DARK  = HexColor("#2C3E50")
GRAY_MID   = HexColor("#546E7A")
GRAY_LIGHT = HexColor("#ECEFF1")
WHITE      = HexColor("#FFFFFF")
WARN_RED   = HexColor("#C0392B")
WARN_BG    = HexColor("#FDEDEC")
SUCCESS    = HexColor("#1E8449")
SUCCESS_BG = HexColor("#EAFAF1")

W, H = A4

# ── Style sheet ─────────────────────────────────────────────────────────────
def build_styles():
    base = getSampleStyleSheet()
    S = {}

    S["cover_title"] = ParagraphStyle("cover_title", fontSize=32, leading=40,
        textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=6)
    S["cover_sub"] = ParagraphStyle("cover_sub", fontSize=15, leading=20,
        textColor=HexColor("#B0C4DE"), fontName="Helvetica", alignment=TA_CENTER)
    S["cover_badge"] = ParagraphStyle("cover_badge", fontSize=11, leading=15,
        textColor=AWS_ORANGE, fontName="Helvetica-Bold", alignment=TA_CENTER)

    S["domain_title"] = ParagraphStyle("domain_title", fontSize=22, leading=28,
        textColor=WHITE, fontName="Helvetica-Bold", alignment=TA_LEFT,
        spaceBefore=4, spaceAfter=4)
    S["domain_num"] = ParagraphStyle("domain_num", fontSize=11, leading=14,
        textColor=AWS_ORANGE, fontName="Helvetica-Bold", alignment=TA_LEFT)

    S["h2"] = ParagraphStyle("h2", fontSize=14, leading=18,
        textColor=AWS_BLUE, fontName="Helvetica-Bold",
        spaceBefore=14, spaceAfter=4, borderPad=2)
    S["h3"] = ParagraphStyle("h3", fontSize=12, leading=16,
        textColor=GRAY_DARK, fontName="Helvetica-Bold",
        spaceBefore=10, spaceAfter=3)
    S["h4"] = ParagraphStyle("h4", fontSize=10, leading=14,
        textColor=AWS_ACCENT, fontName="Helvetica-Bold",
        spaceBefore=7, spaceAfter=2)

    S["body"] = ParagraphStyle("body", fontSize=9, leading=13,
        textColor=GRAY_DARK, fontName="Helvetica",
        spaceAfter=4, alignment=TA_JUSTIFY)
    S["body_bold"] = ParagraphStyle("body_bold", fontSize=9, leading=13,
        textColor=GRAY_DARK, fontName="Helvetica-Bold", spaceAfter=3)
    S["bullet"] = ParagraphStyle("bullet", fontSize=9, leading=13,
        textColor=GRAY_DARK, fontName="Helvetica",
        leftIndent=12, spaceAfter=2,
        bulletIndent=4, bulletFontSize=9)

    S["warn_title"] = ParagraphStyle("warn_title", fontSize=9, leading=12,
        textColor=WARN_RED, fontName="Helvetica-Bold", spaceAfter=2)
    S["warn_body"] = ParagraphStyle("warn_body", fontSize=9, leading=12,
        textColor=GRAY_DARK, fontName="Helvetica", spaceAfter=2)
    S["success_title"] = ParagraphStyle("success_title", fontSize=9, leading=12,
        textColor=SUCCESS, fontName="Helvetica-Bold", spaceAfter=2)
    S["success_body"] = ParagraphStyle("success_body", fontSize=9, leading=12,
        textColor=GRAY_DARK, fontName="Helvetica", spaceAfter=2)

    S["toc_h1"] = ParagraphStyle("toc_h1", fontSize=11, leading=16,
        fontName="Helvetica-Bold", textColor=AWS_BLUE)
    S["toc_h2"] = ParagraphStyle("toc_h2", fontSize=9, leading=13,
        fontName="Helvetica", leftIndent=12, textColor=GRAY_DARK)
    S["footer"] = ParagraphStyle("footer", fontSize=7.5, leading=10,
        textColor=GRAY_MID, fontName="Helvetica", alignment=TA_CENTER)
    S["page_label"] = ParagraphStyle("page_label", fontSize=8,
        textColor=GRAY_MID, fontName="Helvetica", alignment=TA_CENTER)
    return S

S = build_styles()

# ── Helper flowables ─────────────────────────────────────────────────────────
def spacer(h=6): return Spacer(1, h)

def hr(color=AWS_BLUE, thickness=0.8):
    return HRFlowable(width="100%", thickness=thickness, color=color,
                      spaceAfter=4, spaceBefore=4)

def section_header(num, title):
    """Coloured banner for each domain."""
    data = [[Paragraph(f"DOMAIN {num}", S["domain_num"]),
             Paragraph(title, S["domain_title"])]]
    t = Table(data, colWidths=[55*mm, 120*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), AWS_DARK),
        ("TOPPADDING",  (0,0), (-1,-1), 10),
        ("BOTTOMPADDING",(0,0),(-1,-1), 10),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
        ("VALIGN",      (0,0), (-1,-1), "MIDDLE"),
        ("ROWBACKGROUNDS",(0,0),(-1,-1),[AWS_DARK]),
    ]))
    return t

def service_table(headers, rows, col_widths=None):
    if col_widths is None:
        col_widths = [45*mm, 50*mm, 80*mm]
    all_data = [headers] + rows
    t = Table(all_data, colWidths=col_widths)
    style = [
        ("BACKGROUND",    (0,0), (-1,0),  AWS_BLUE),
        ("TEXTCOLOR",     (0,0), (-1,0),  WHITE),
        ("FONTNAME",      (0,0), (-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,0),  8.5),
        ("FONTNAME",      (0,1), (-1,-1), "Helvetica"),
        ("FONTSIZE",      (0,1), (-1,-1), 8),
        ("TEXTCOLOR",     (0,1), (-1,-1), GRAY_DARK),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),  [WHITE, GRAY_LIGHT]),
        ("GRID",          (0,0), (-1,-1), 0.4, HexColor("#BDC3C7")),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
        ("WORDWRAP",      (0,0), (-1,-1), "CJK"),
    ]
    t.setStyle(TableStyle(style))
    return t

def info_box(title, items, bg=AWS_LIGHT, title_color=AWS_BLUE):
    content = [Paragraph(title, ParagraphStyle("ib_t", fontSize=9.5, leading=13,
                textColor=title_color, fontName="Helvetica-Bold", spaceAfter=3))]
    for item in items:
        content.append(Paragraph(f"• {item}", S["bullet"]))
    data = [[content]]
    t = Table(data, colWidths=[175*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,-1), bg),
        ("LEFTPADDING",   (0,0), (-1,-1), 10),
        ("RIGHTPADDING",  (0,0), (-1,-1), 10),
        ("TOPPADDING",    (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
        ("BOX",           (0,0), (-1,-1), 1, title_color),
    ]))
    return t

def warn_box(title, body_lines):
    return _coloured_box(title, body_lines, WARN_BG, WARN_RED)

def success_box(title, body_lines):
    return _coloured_box(title, body_lines, SUCCESS_BG, SUCCESS)

def _coloured_box(title, lines, bg, accent):
    content = [Paragraph(title, ParagraphStyle("cb_t", fontSize=9.5, leading=13,
                textColor=accent, fontName="Helvetica-Bold", spaceAfter=3))]
    for l in lines:
        content.append(Paragraph(l, S["body"]))
    data = [[content]]
    t = Table(data, colWidths=[175*mm])
    t.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), bg),
        ("LEFTPADDING",  (0,0),(-1,-1), 10),
        ("RIGHTPADDING", (0,0),(-1,-1), 10),
        ("TOPPADDING",   (0,0),(-1,-1), 8),
        ("BOTTOMPADDING",(0,0),(-1,-1), 8),
        ("LINEAFTER",    (0,0), (0,-1), 3, accent),
    ]))
    return t

def label(txt, col=AWS_ORANGE):
    return Paragraph(f'<font color="{col.hexval() if hasattr(col,"hexval") else col}"><b>{txt}</b></font>', S["body"])

# ── Page templates ───────────────────────────────────────────────────────────
class NumberedCanvas:
    # We'll add page numbers via onLaterPages
    pass

def on_first_page(canvas, doc):
    pass  # Cover page handled inline

def on_later_pages(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(GRAY_MID)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawCentredString(W/2, 18*mm,
        "AWS Certification Technical Manual  •  Confidential Study Resource")
    canvas.drawRightString(W - 20*mm, 18*mm, f"Page {doc.page}")
    canvas.setStrokeColor(AWS_BLUE)
    canvas.setLineWidth(0.5)
    canvas.line(20*mm, 22*mm, W-20*mm, 22*mm)
    canvas.restoreState()

# ── Cover page ───────────────────────────────────────────────────────────────
def cover_page():
    story = []

    # Big banner
    banner = Table([[""]], colWidths=[175*mm], rowHeights=[68*mm])
    banner.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1), AWS_DARK)]))
    story.append(banner)
    story.append(Spacer(1, -68*mm))  # overlap

    # Title block (drawn over banner via a nested table trick)
    inner = [
        [Paragraph("AWS SOLUTIONS ARCHITECT", S["cover_badge"])],
        [Paragraph("Technical Certification Manual", S["cover_title"])],
        [Paragraph("Six-Domain Deep Dive: Service Taxonomy, Best-Fit Logic,\nExam Scenarios & Key Constraints", S["cover_sub"])],
        [Spacer(1, 4)],
        [Paragraph(f"Prepared: {datetime.date.today().strftime('%B %Y')}  •  All Six Exam Domains", S["cover_sub"])],
    ]
    title_tbl = Table(inner, colWidths=[175*mm])
    title_tbl.setStyle(TableStyle([
        ("TOPPADDING",    (0,0),(-1,-1), 6),
        ("BOTTOMPADDING", (0,0),(-1,-1), 6),
        ("ALIGN",         (0,0),(-1,-1), "CENTER"),
    ]))
    story.append(title_tbl)
    story.append(spacer(8))

    # Domain pills
    domains = ["01 Compute","02 Storage","03 Database","04 Networking","05 Identity","06 Monitoring"]
    pill_data = [[Paragraph(d, ParagraphStyle("pill", fontSize=9, textColor=WHITE,
                             fontName="Helvetica-Bold", alignment=TA_CENTER)) for d in domains]]
    pill_tbl = Table(pill_data, colWidths=[29*mm]*6)
    pill_tbl.setStyle(TableStyle([
        ("BACKGROUND",   (0,0),(-1,-1), AWS_BLUE),
        ("TOPPADDING",   (0,0),(-1,-1), 6),
        ("BOTTOMPADDING",(0,0),(-1,-1), 6),
        ("GRID",         (0,0),(-1,-1), 0.5, AWS_DARK),
    ]))
    story.append(pill_tbl)
    story.append(spacer(12))
    story.append(hr(AWS_ORANGE, 2))
    story.append(spacer(6))

    intro_text = (
        "This manual is structured for AWS certification candidates targeting the Solutions Architect "
        "Associate or Professional exam. For every service, you will find a complete Service Taxonomy "
        "with types and primary use cases, Best-Fit decision logic, a challenging Exam Scenario with "
        "a correct solution, and Key Limits & Constraints (the 'gotchas' that trips most candidates). "
        "Study each domain systematically and cross-reference the comparison tables before your exam."
    )
    story.append(Paragraph(intro_text, S["body"]))
    story.append(PageBreak())
    return story

# ═══════════════════════════════════════════════════════════════════════════
# DOMAIN 1 – COMPUTE
# ═══════════════════════════════════════════════════════════════════════════
def domain_compute():
    s = []
    s.append(section_header("01", "Compute"))
    s.append(spacer(8))

    # ── EC2 Instance Families ───────────────────────────────────────────────
    s.append(Paragraph("1.1  EC2 Instance Families", S["h2"]))
    s.append(hr())

    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers = [Paragraph(h, ParagraphStyle("th", fontSize=8.5, textColor=WHITE,
               fontName="Helvetica-Bold")) for h in ["Family / Class", "Example Types", "Primary Use Case"]]
    rows = [
        [Paragraph("General Purpose", S["body"]), Paragraph("t3, t4g, m6i, m7g", S["body"]),
         Paragraph("Balanced CPU/RAM. Web servers, small DBs, dev/test environments. t-types use burstable CPU credits; m-types deliver consistent baseline.", S["body"])],
        [Paragraph("Compute Optimised", S["body"]), Paragraph("c6i, c7g, c6gn", S["body"]),
         Paragraph("High CPU-to-memory ratio. HPC, batch processing, video encoding, gaming servers, scientific modelling.", S["body"])],
        [Paragraph("Memory Optimised", S["body"]), Paragraph("r6i, r7g, x2idn, z1d", S["body"]),
         Paragraph("Large in-memory datasets. In-memory caches (Redis), SAP HANA, real-time big-data analytics, large relational DBs.", S["body"])],
        [Paragraph("Storage Optimised", S["body"]), Paragraph("i4i, d3, h1", S["body"]),
         Paragraph("Very high sequential I/O or large local NVMe storage. Data warehouses, Hadoop HDFS, NoSQL with local storage.", S["body"])],
        [Paragraph("Accelerated Computing", S["body"]), Paragraph("p4, g5, inf2, trn1", S["body"]),
         Paragraph("GPU/custom silicon. ML training & inference, deep learning, 3-D rendering, HPC with CUDA workloads.", S["body"])],
        [Paragraph("High Memory", S["body"]), Paragraph("u-6tb1, u-12tb1", S["body"]),
         Paragraph("Bare-metal instances up to 24 TB RAM for SAP HANA scale-up and in-memory workloads requiring terabytes of RAM.", S["body"])],
    ]
    s.append(service_table(headers, rows, [40*mm, 38*mm, 97*mm]))
    s.append(spacer(8))

    s.append(Paragraph("Best-Fit Logic", S["h3"]))
    s.append(info_box("Choosing the Right EC2 Family", [
        "Use t3/t4g when average CPU < 40 % with occasional bursts — they are cheapest but will throttle if credit balance empties.",
        "Switch from t3 to m6i when workload is sustained (24/7 high CPU) — m-types have no credit concept.",
        "Choose c-family over m-family when CPU is the bottleneck and memory is not (ratio ~2:1 vs 4:1 GB/vCPU).",
        "Choose r-family when the JVM heap, in-memory cache, or working dataset must fit in RAM (ratio ~8:1 GB/vCPU).",
        "Graviton (g suffix: t4g, m7g, c7g, r7g) delivers ~40 % better price/performance for ARM-compatible workloads.",
        "Spot Instances save up to 90 % but can be interrupted — use only for stateless, fault-tolerant, or batch jobs.",
    ]))
    s.append(spacer(8))

    s.append(Paragraph("Exam Scenario", S["h3"]))
    s.append(warn_box("❌  Wrong Choice — Throttled Production DB",
        ["Problem: A team runs a large PostgreSQL DB on a t3.xlarge to save cost. Under month-end reporting load CPU credits exhaust, throughput collapses, and RDS read queries time out.",
         "Correct Fix: Migrate to m6i.xlarge (consistent baseline) or r6i.xlarge (if buffer pool needs > 16 GB RAM). Reserve 1-year term to reclaim most cost savings without the burst risk."]))
    s.append(spacer(6))

    s.append(Paragraph("Key Limits & Constraints", S["h3"]))
    s.append(info_box("EC2 Gotchas", [
        "Default vCPU limit per region: 32 vCPUs for On-Demand Standard. Submit a quota increase before large deployments.",
        "Placement Groups — Cluster PG requires homogeneous instance types; mixing families risks launch failure.",
        "t-type CPU credits: t3.micro earns 6 credits/hr, each credit = 1 vCPU × 1 minute at 100 %. Running out = hard throttle to baseline (10-20 %).",
        "EBS-optimised: not enabled by default on older generations; without it, network and storage share bandwidth.",
        "Instance metadata IMDSv2 is mandatory for newer security postures — ensure userdata scripts use token-based calls.",
    ], bg=GRAY_LIGHT, title_color=GRAY_DARK))
    s.append(spacer(10))

    # ── Lambda ──────────────────────────────────────────────────────────────
    s.append(Paragraph("1.2  AWS Lambda", S["h2"]))
    s.append(hr())

    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers2 = [Paragraph(h, ParagraphStyle("th2", fontSize=8.5, textColor=WHITE,
                fontName="Helvetica-Bold")) for h in ["Dimension", "Options / Types", "Primary Use Case"]]
    rows2 = [
        [Paragraph("Runtime", S["body"]), Paragraph("Node.js 20, Python 3.12, Java 21, Go 1.x, Ruby 3.3, .NET 8, Custom Runtime (AL2023)", S["body"]),
         Paragraph("Match language to team skill; custom runtime for unsupported languages via provided.al2023.", S["body"])],
        [Paragraph("Invocation Model", S["body"]), Paragraph("Synchronous (API GW, ALB), Asynchronous (S3, SNS, EventBridge), Polling (SQS, Kinesis, DynamoDB Streams)", S["body"]),
         Paragraph("Sync for real-time API responses; Async for event-driven fire-and-forget; Polling for stream/queue consumers.", S["body"])],
        [Paragraph("Concurrency Type", S["body"]), Paragraph("Unreserved, Reserved, Provisioned", S["body"]),
         Paragraph("Reserved = hard cap to protect downstream; Provisioned = pre-warm to eliminate cold starts for latency-sensitive paths.", S["body"])],
        [Paragraph("Deployment Package", S["body"]), Paragraph("Zip (50 MB direct / 250 MB unzipped), Container Image (up to 10 GB)", S["body"]),
         Paragraph("Container images for large ML models or complex dependency trees; Zip for everything else.", S["body"])],
        [Paragraph("Memory / Power", S["body"]), Paragraph("128 MB – 10,240 MB (CPU scales proportionally)", S["body"]),
         Paragraph("Increase memory to get more vCPU time — useful for CPU-bound tasks even when data fits in less RAM.", S["body"])],
    ]
    s.append(service_table(headers2, rows2, [38*mm, 60*mm, 77*mm]))
    s.append(spacer(8))

    s.append(Paragraph("Best-Fit Logic", S["h3"]))
    s.append(info_box("Lambda vs EC2/Fargate", [
        "Use Lambda when execution is short (≤15 min), event-driven, and traffic is spiky or unpredictable.",
        "Prefer EC2/Fargate for long-running processes, persistent connections (WebSockets), or > 10 GB memory needs.",
        "Provisioned Concurrency is expensive — only apply to functions on the critical path with strict p99 SLA.",
        "SQS + Lambda: Lambda scales up to 1,000 concurrent executions per minute per queue. Use reserved concurrency to throttle.",
        "For VPC-bound Lambda: attach to private subnets with a NAT Gateway for internet; VPC adds ~1 ms cold-start latency.",
    ]))
    s.append(spacer(8))

    s.append(Paragraph("Exam Scenario", S["h3"]))
    s.append(warn_box("❌  Wrong Choice — Lambda Timeout on Large Report",
        ["Problem: An analytics Lambda reads 500 MB from S3, transforms it, and writes to Redshift. It hits the 15-minute timeout and fails mid-run.",
         "Correct Fix: Move to AWS Glue (ETL job, no timeout) or Fargate task. If Lambda must be kept, split the work into smaller chunks with Step Functions and pass state via S3."]))
    s.append(spacer(6))

    s.append(Paragraph("Key Limits & Constraints", S["h3"]))
    s.append(info_box("Lambda Gotchas", [
        "Hard execution timeout: 15 minutes. No exceptions.",
        "Ephemeral /tmp storage: 512 MB default, max 10,240 MB (additional cost).",
        "Account-level concurrency default: 1,000 (soft limit, can be raised). Reserved concurrency reduces the shared pool.",
        "Cold starts: Java & .NET runtimes are worst; use Provisioned Concurrency or SnapStart (Java only) to mitigate.",
        "Lambda@Edge: 30-second timeout for origin requests, 5 seconds for viewer requests; US East 1 only for deployment.",
        "Environment variables: max 4 KB total. Use SSM Parameter Store or Secrets Manager for larger config.",
    ], bg=GRAY_LIGHT, title_color=GRAY_DARK))
    s.append(spacer(10))

    # ── ECS / EKS / Fargate ─────────────────────────────────────────────────
    s.append(Paragraph("1.3  ECS, EKS, and Fargate", S["h2"]))
    s.append(hr())

    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers3 = [Paragraph(h, ParagraphStyle("th3", fontSize=8.5, textColor=WHITE,
                fontName="Helvetica-Bold")) for h in ["Service", "Launch Type", "Primary Use Case"]]
    rows3 = [
        [Paragraph("ECS (Elastic Container Service)", S["body"]), Paragraph("EC2 or Fargate", S["body"]),
         Paragraph("AWS-native container orchestration. Simpler operational model, deep AWS integration (IAM, ALB, CloudMap). Best for teams avoiding Kubernetes complexity.", S["body"])],
        [Paragraph("EKS (Elastic Kubernetes Service)", S["body"]), Paragraph("EC2, Fargate, or Hybrid (Outposts)", S["body"]),
         Paragraph("Managed Kubernetes. Best for teams with existing K8s expertise, multi-cloud portability, or complex scheduling (affinity rules, custom controllers).", S["body"])],
        [Paragraph("Fargate (serverless compute for containers)", S["body"]), Paragraph("Works with ECS & EKS", S["body"]),
         Paragraph("No EC2 management. Pay per vCPU/GB-second. Ideal for variable workloads, isolation-by-task security, and teams without platform engineering.", S["body"])],
        [Paragraph("ECS on EC2", S["body"]), Paragraph("EC2 (self-managed cluster)", S["body"]),
         Paragraph("Cost optimisation via Reserved/Spot EC2 capacity. Use when Fargate per-task pricing exceeds EC2 cluster cost at sustained high load.", S["body"])],
    ]
    s.append(service_table(headers3, rows3, [48*mm, 42*mm, 85*mm]))
    s.append(spacer(8))

    s.append(Paragraph("Best-Fit Logic", S["h3"]))
    s.append(info_box("ECS vs EKS vs Fargate Decision Tree", [
        "No Kubernetes expertise + AWS-only: choose ECS.",
        "Kubernetes expertise or multi-cloud portability required: choose EKS.",
        "No capacity planning burden or spiky traffic: add Fargate launch type to either ECS or EKS.",
        "Sustained high-throughput containers (100+ always-on tasks): EC2 launch type with Reserved Instances is cheaper than Fargate.",
        "Fargate Spot: up to 70 % savings for interruptible tasks (batch, CI/CD jobs).",
        "EKS Anywhere: run EKS on-premises — useful for data residency or air-gapped environments.",
    ]))
    s.append(spacer(8))

    s.append(Paragraph("Exam Scenario", S["h3"]))
    s.append(warn_box("❌  Wrong Choice — Over-engineered Kubernetes for Simple Microservice",
        ["Problem: A 3-person startup deploys a single Node.js API on EKS with managed node groups. Cluster maintenance, add-ons, and RBAC consume 40 % of engineering time.",
         "Correct Fix: ECS + Fargate with an ALB. Zero node management, native IAM task roles, and service auto-scaling. EKS is warranted only when Kubernetes-native features (CRDs, Helm, custom operators) are actually needed."]))
    s.append(spacer(6))

    s.append(Paragraph("Key Limits & Constraints", S["h3"]))
    s.append(info_box("ECS / EKS / Fargate Gotchas", [
        "Fargate max task size: 16 vCPU and 120 GB memory. Not suitable for large ML inference (use GPU EC2 or SageMaker).",
        "EKS control plane cost: $0.10/hr (~$73/month) even with zero worker nodes.",
        "ECS Service Discovery via Cloud Map has a default 300-second TTL — plan for it in blue/green deployments.",
        "EKS Fargate does not support DaemonSets — use node-level agents only on EC2 node groups.",
        "Fargate networking: every task gets its own ENI (awsvpc mode). Account ENI limits can be exhausted in large clusters.",
        "Container image pull time counts against task start time — use ECR in the same region and cache base layers.",
    ], bg=GRAY_LIGHT, title_color=GRAY_DARK))

    s.append(PageBreak())
    return s

# ═══════════════════════════════════════════════════════════════════════════
# DOMAIN 2 – STORAGE
# ═══════════════════════════════════════════════════════════════════════════
def domain_storage():
    s = []
    s.append(section_header("02", "Storage"))
    s.append(spacer(8))

    # S3
    s.append(Paragraph("2.1  Amazon S3 Storage Classes", S["h2"]))
    s.append(hr())
    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers = [Paragraph(h, ParagraphStyle("th", fontSize=8.5, textColor=WHITE,
               fontName="Helvetica-Bold")) for h in ["Storage Class", "Availability / Durability", "Primary Use Case"]]
    rows = [
        ["S3 Standard", "99.99 % avail / 11 9s durability", "Frequently accessed data, dynamic websites, content distribution."],
        ["S3 Intelligent-Tiering", "Same as Standard", "Unknown or changing access patterns. Auto-moves objects between tiers with no retrieval fees."],
        ["S3 Standard-IA", "99.9 % avail", "Infrequently accessed but rapid retrieval needed. Backups, DR copies, older media assets."],
        ["S3 One Zone-IA", "99.5 % avail (single AZ)", "Re-creatable infrequent data. Secondary backups where AZ loss is acceptable."],
        ["S3 Glacier Instant Retrieval", "99.9 % avail", "Archive data accessed once per quarter with millisecond retrieval (e.g., medical images)."],
        ["S3 Glacier Flexible Retrieval", "99.99 % avail", "Archive with 1-5 min (expedited) to 3-5 hr (standard) retrieval. Compliance archives."],
        ["S3 Glacier Deep Archive", "99.99 % avail", "Lowest cost. 7-10 yr regulatory retention. 12 hr standard / 48 hr bulk retrieval."],
        ["S3 Express One Zone", "Single AZ, sub-ms latency", "Latency-sensitive ML training data, HPC scratch, analytics hot-tier. New in 2023."],
    ]
    rows = [[Paragraph(r[0], S["body_bold"]), Paragraph(r[1], S["body"]), Paragraph(r[2], S["body"])] for r in rows]
    s.append(service_table(headers, rows, [48*mm, 45*mm, 82*mm]))
    s.append(spacer(8))

    s.append(Paragraph("Best-Fit Logic", S["h3"]))
    s.append(info_box("S3 Class Selection Rules", [
        "Access frequency unknown? Start with Intelligent-Tiering — no retrieval charge and no management overhead.",
        "Data retrieved < once/month but must be available in seconds? Standard-IA. Note the 30-day minimum storage charge.",
        "Compliance archive (WORM) with years of retention? Glacier Deep Archive + S3 Object Lock in Compliance mode.",
        "Cost comparison: Standard ~$0.023/GB, Standard-IA ~$0.0125/GB, Glacier Deep Archive ~$0.00099/GB.",
        "Retrieval fees are the hidden cost — Glacier Flexible expedited retrieval is $0.03/GB extra.",
    ]))
    s.append(spacer(8))

    s.append(Paragraph("Exam Scenario", S["h3"]))
    s.append(warn_box("❌  Wrong Class — Glacier Delay Breaks SLA",
        ["Problem: A healthcare company stores patient X-rays in Glacier Flexible Retrieval to cut costs. An emergency radiology request requires immediate access. Retrieval takes 3-5 hours, violating clinical SLA.",
         "Correct Fix: Use Glacier Instant Retrieval — same archive pricing tier but millisecond access. Or Standard-IA for very frequent emergency access patterns."]))
    s.append(spacer(6))

    s.append(Paragraph("Key Limits & Constraints", S["h3"]))
    s.append(info_box("S3 Gotchas", [
        "Minimum storage duration: Standard-IA & Glacier Instant = 30 days; Glacier Flexible = 90 days; Deep Archive = 180 days. Deleted early = still charged.",
        "S3 max object size: 5 TB. Multipart upload required for objects > 100 MB (recommended) and mandatory > 5 GB.",
        "S3 bucket names are globally unique — namespace conflicts can block deployments.",
        "Cross-Region Replication does NOT replicate existing objects retroactively; only new objects after rule creation.",
        "S3 Event Notifications: eventual consistency means a very brief window where notifications may be duplicated or missed for rapid overwrites.",
        "Requestor Pays buckets: requester pays data transfer; useful for public datasets shared with third parties.",
    ], bg=GRAY_LIGHT, title_color=GRAY_DARK))
    s.append(spacer(10))

    # EBS
    s.append(Paragraph("2.2  Amazon EBS Volume Types", S["h2"]))
    s.append(hr())
    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers2 = [Paragraph(h, ParagraphStyle("th2", fontSize=8.5, textColor=WHITE,
                fontName="Helvetica-Bold")) for h in ["Volume Type", "IOPS / Throughput", "Primary Use Case"]]
    rows2 = [
        ["gp3 (General Purpose SSD)", "Up to 16,000 IOPS / 1,000 MB/s (independently configurable)", "Default for most workloads. Boot volumes, small/medium DBs, dev/test. Cheaper than gp2 at same performance."],
        ["gp2 (General Purpose SSD – Legacy)", "Up to 16,000 IOPS (3 IOPS/GB, burstable)", "Legacy default. Replaced by gp3 — migrate gp2 → gp3 for cost savings."],
        ["io2 Block Express (Provisioned IOPS SSD)", "Up to 256,000 IOPS / 4,000 MB/s, 99.999 % durability", "Mission-critical DBs: Oracle RAC, SQL Server, SAP HANA. Sub-millisecond latency."],
        ["io1 (Provisioned IOPS SSD – Legacy)", "Up to 64,000 IOPS", "Being superseded by io2 Block Express at same cost with higher durability."],
        ["st1 (Throughput Optimised HDD)", "Up to 500 MB/s", "Big data, Kafka, log processing, data warehouses. Sequential read-heavy. Cannot be a boot volume."],
        ["sc1 (Cold HDD)", "Up to 250 MB/s", "Lowest cost EBS. Infrequently accessed large datasets. Cannot be boot volume."],
    ]
    rows2 = [[Paragraph(r[0], S["body_bold"]), Paragraph(r[1], S["body"]), Paragraph(r[2], S["body"])] for r in rows2]
    s.append(service_table(headers2, rows2, [45*mm, 48*mm, 82*mm]))
    s.append(spacer(8))

    s.append(Paragraph("Best-Fit Logic", S["h3"]))
    s.append(info_box("EBS Type Selection", [
        "Default choice: gp3 — always migrate away from gp2 unless there's a reason not to.",
        "Need > 16,000 IOPS or 99.999 % volume durability? io2 Block Express is the only option.",
        "Large sequential workloads (Kafka, Hadoop): st1 delivers cost-effective throughput; IOPS is irrelevant here.",
        "IMPORTANT: EBS volumes are AZ-locked. You cannot attach a volume to an instance in a different AZ.",
        "Multi-attach io1/io2: a single EBS volume can attach to up to 16 Nitro instances in the same AZ — requires cluster-aware filesystem (e.g., GFS2, not ext4).",
    ]))
    s.append(spacer(8))

    s.append(Paragraph("Exam Scenario", S["h3"]))
    s.append(warn_box("❌  Wrong Type — EBS for Multi-Instance Shared Storage",
        ["Problem: A team mounts one gp3 EBS volume to two EC2 web servers expecting shared file access (like NFS). Only the first instance can write; the second sees a stale view. Data corruption occurs.",
         "Correct Fix: Use EFS (for Linux shared access across AZs) or FSx for Windows (for SMB/Windows workloads). EBS is single-attach (except io1/io2 multi-attach with cluster FS)."]))
    s.append(spacer(6))

    s.append(Paragraph("Key Limits & Constraints", S["h3"]))
    s.append(info_box("EBS Gotchas", [
        "EBS snapshots are incremental but restore is lazy — first access of unloaded blocks is slow. Use fio/dd to pre-warm after restore.",
        "gp3 IOPS and throughput are independently configurable (unlike gp2 which ties IOPS to size).",
        "Max volume size: 64 TiB for all SSD types.",
        "Encryption: encrypted volumes use AWS KMS CMK. Snapshots of encrypted volumes are also encrypted; you cannot remove encryption.",
        "io2 Multi-Attach limit: 16 instances per volume, same AZ only.",
    ], bg=GRAY_LIGHT, title_color=GRAY_DARK))
    s.append(spacer(10))

    # EFS & FSx
    s.append(Paragraph("2.3  EFS and FSx", S["h2"]))
    s.append(hr())
    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers3 = [Paragraph(h, ParagraphStyle("th3", fontSize=8.5, textColor=WHITE,
                fontName="Helvetica-Bold")) for h in ["Service / Type", "Protocol & OS", "Primary Use Case"]]
    rows3 = [
        ["EFS Standard", "NFS v4.1 / Linux", "Shared POSIX filesystem across multiple EC2, ECS, Lambda in multiple AZs. CMS, DevOps shared code."],
        ["EFS One Zone", "NFS v4.1 / Linux (single AZ)", "Lower cost (~47 % less). Dev environments, non-critical shared storage where AZ HA not needed."],
        ["FSx for Windows File Server", "SMB / Windows & Linux", "Active Directory-integrated file shares. Lift-and-shift Windows apps, SQL Server backups, user profiles."],
        ["FSx for Lustre", "Lustre / Linux", "HPC, ML training, video rendering. Sub-millisecond latency, hundreds of GB/s throughput. Integrates natively with S3."],
        ["FSx for NetApp ONTAP", "NFS, SMB, iSCSI / Multi-OS", "Lift-and-shift NetApp storage. Multi-protocol, data tiering to S3, SnapMirror replication."],
        ["FSx for OpenZFS", "NFS / Linux & macOS", "Low-latency shared storage with ZFS features (snapshots, clones). Dev/test, CI/CD pipelines."],
    ]
    rows3 = [[Paragraph(r[0], S["body_bold"]), Paragraph(r[1], S["body"]), Paragraph(r[2], S["body"])] for r in rows3]
    s.append(service_table(headers3, rows3, [50*mm, 42*mm, 83*mm]))
    s.append(spacer(8))

    s.append(Paragraph("Best-Fit Logic & Key Limits", S["h3"]))
    s.append(info_box("EFS / FSx Decision", [
        "Linux shared storage across AZs: EFS. No capacity management, pay-per-GB-used.",
        "Windows SMB shares or AD integration: FSx for Windows. Supports DFS namespaces.",
        "HPC / ML training that needs scratch storage alongside an S3 data lake: FSx for Lustre (can auto-import from S3).",
        "EFS Throughput modes: Bursting (default, scales with storage), Provisioned (set MB/s independently), Elastic (auto-scales, recommended for variable workloads).",
        "EFS max file size: 52 TiB. Per-directory quotas not supported natively.",
        "FSx for Lustre scratch filesystems are NOT persistent — data is lost on failure. Use Persistent type for durable workloads.",
    ], bg=GRAY_LIGHT, title_color=GRAY_DARK))

    s.append(PageBreak())
    return s

# ═══════════════════════════════════════════════════════════════════════════
# DOMAIN 3 – DATABASE
# ═══════════════════════════════════════════════════════════════════════════
def domain_database():
    s = []
    s.append(section_header("03", "Database"))
    s.append(spacer(8))

    # RDS
    s.append(Paragraph("3.1  Amazon RDS — Multi-AZ vs. Read Replicas", S["h2"]))
    s.append(hr())
    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers = [Paragraph(h, ParagraphStyle("th", fontSize=8.5, textColor=WHITE,
               fontName="Helvetica-Bold")) for h in ["Feature", "Multi-AZ Deployment", "Read Replica"]]
    rows = [
        ["Purpose", "High Availability & failover", "Read scaling & analytics offload"],
        ["Replication", "Synchronous to standby (same or different AZ)", "Asynchronous to replica (same region or cross-region)"],
        ["Failover time", "~60-120 seconds (automatic DNS flip)", "Manual promotion required (minutes)"],
        ["Readable?", "No — standby is not accessible", "Yes — endpoint exposed for read traffic"],
        ["Use for DR?", "Yes — automatic failover on AZ/host failure", "Yes — cross-region replica for RPO/RTO"],
        ["Cost", "~2x single instance (primary + standby)", "Per-replica compute + storage cost"],
        ["Supported engines", "MySQL, PostgreSQL, MariaDB, Oracle, SQL Server", "MySQL, PostgreSQL, MariaDB, Oracle (limited)"],
    ]
    rows = [[Paragraph(r[0], S["body_bold"]), Paragraph(r[1], S["body"]), Paragraph(r[2], S["body"])] for r in rows]
    s.append(service_table(headers, rows, [45*mm, 65*mm, 65*mm]))
    s.append(spacer(8))

    s.append(Paragraph("Best-Fit Logic", S["h3"]))
    s.append(info_box("RDS HA vs. Read Scaling", [
        "Multi-AZ = HA. Use it in production for any OLTP database where downtime is unacceptable.",
        "Read Replica = performance. Offload SELECT-heavy reporting queries to reduce load on the primary.",
        "You can promote a Read Replica to a standalone DB — useful for blue/green deployments or DR failover.",
        "Cross-region Read Replica adds DR capability (RTO ~minutes) at the cost of replication lag.",
        "RDS Proxy: sits between Lambda/application and RDS to pool connections and reduce 'too many connections' errors — critical for Lambda-heavy architectures.",
    ]))
    s.append(spacer(8))

    s.append(Paragraph("Exam Scenario", S["h3"]))
    s.append(warn_box("❌  Wrong Feature — Read Replica for HA",
        ["Problem: An architect uses a Read Replica as the HA strategy. The primary fails. The replica is not automatically promoted — the site goes down for 45 minutes while engineers manually promote.",
         "Correct Fix: Enable Multi-AZ for automatic failover. Optionally also create a Read Replica for read scaling. They serve different purposes."]))
    s.append(spacer(6))

    s.append(Paragraph("Key Limits & Constraints", S["h3"]))
    s.append(info_box("RDS Gotchas", [
        "Multi-AZ standby is in the same region but can be in a different AZ — not cross-region.",
        "Automated backups are retained 0-35 days. Setting to 0 disables automated backups AND point-in-time restore.",
        "Storage autoscaling: enabled by default for most engines — set a maximum threshold to prevent runaway costs.",
        "Parameter Group changes: some require a reboot to take effect (static parameters vs. dynamic).",
        "RDS Custom (Oracle, SQL Server): gives OS access for patching/agent installs but removes some managed service benefits.",
        "Maximum Read Replicas: 5 for MySQL/MariaDB, 5 for PostgreSQL, 15 for Aurora.",
    ], bg=GRAY_LIGHT, title_color=GRAY_DARK))
    s.append(spacer(10))

    # DynamoDB
    s.append(Paragraph("3.2  Amazon DynamoDB — On-Demand vs. Provisioned", S["h2"]))
    s.append(hr())
    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers2 = [Paragraph(h, ParagraphStyle("th2", fontSize=8.5, textColor=WHITE,
                fontName="Helvetica-Bold")) for h in ["Capacity Mode", "Billing", "Primary Use Case"]]
    rows2 = [
        ["On-Demand", "Pay per request (RCU/WCU consumed)", "Unpredictable or spiky workloads. New apps without traffic baseline. No capacity planning."],
        ["Provisioned", "Pay for reserved RCU/WCU per hour", "Predictable steady workloads. Enable Auto Scaling to handle variation within limits."],
        ["Provisioned + Reserved Capacity", "1 or 3-year reserved RCU/WCU commitment", "Large, stable production tables. Save up to 76 % vs. On-Demand."],
        ["DynamoDB Accelerator (DAX)", "Cluster of in-memory nodes", "Microsecond read latency for eventually consistent reads. Caching layer in front of DynamoDB."],
        ["Global Tables", "Multi-region active-active replication", "Multi-region low-latency reads/writes. Disaster recovery with RPO ~seconds."],
        ["DynamoDB Streams", "Per-shard data change events", "Event-driven processing: trigger Lambda on item changes, CDC to downstream systems."],
    ]
    rows2 = [[Paragraph(r[0], S["body_bold"]), Paragraph(r[1], S["body"]), Paragraph(r[2], S["body"])] for r in rows2]
    s.append(service_table(headers2, rows2, [48*mm, 45*mm, 82*mm]))
    s.append(spacer(8))

    s.append(Paragraph("Best-Fit Logic & Exam Scenario", S["h3"]))
    s.append(info_box("DynamoDB Mode Selection", [
        "Unknown traffic profile at launch: On-Demand. Switch to Provisioned + Auto Scaling once you observe baseline.",
        "Steady, predictable load > 50,000 RCU/WCU: Provisioned is significantly cheaper.",
        "Exam tip: DynamoDB On-Demand can be twice as expensive as Provisioned at high sustained throughput — always calculate.",
        "Hot partition anti-pattern: a partition key with low cardinality (e.g., status=ACTIVE/INACTIVE) causes uneven distribution and throttling even with high provisioned capacity.",
    ]))
    s.append(spacer(6))
    s.append(warn_box("❌  Hot Partition Causes Throttling",
        ["Problem: A table uses order_status as partition key. 95 % of reads hit the PENDING partition, exhausting its share of provisioned capacity even though total RCU is sufficient.",
         "Correct Fix: Use a high-cardinality key (e.g., order_id). Use GSI with order_status as PK for status-based queries, and enable Auto Scaling on the GSI."]))
    s.append(spacer(6))

    s.append(Paragraph("Key Limits & Constraints", S["h3"]))
    s.append(info_box("DynamoDB Gotchas", [
        "Item size limit: 400 KB. Store large blobs in S3 and reference the key in DynamoDB.",
        "Query requires a partition key. Scan reads the entire table — expensive and slow at scale.",
        "GSI (Global Secondary Index): has its own provisioned capacity; under-provisioning a GSI throttles writes to the base table.",
        "LSI (Local Secondary Index): must be defined at table creation. Cannot be added later.",
        "Transactions (TransactWrite/TransactGet): limited to 100 items or 4 MB per transaction.",
        "TTL deletions are eventual (up to 48 hrs) — do not use for security/access control.",
        "DynamoDB export to S3: point-in-time export; does not consume RCU.",
    ], bg=GRAY_LIGHT, title_color=GRAY_DARK))
    s.append(spacer(10))

    # Aurora
    s.append(Paragraph("3.3  Amazon Aurora — Serverless vs. Provisioned", S["h2"]))
    s.append(hr())
    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers3 = [Paragraph(h, ParagraphStyle("th3", fontSize=8.5, textColor=WHITE,
                fontName="Helvetica-Bold")) for h in ["Aurora Type", "Scaling Model", "Primary Use Case"]]
    rows3 = [
        ["Aurora Provisioned", "Fixed instance sizes (db.r6g, db.r7g etc.)", "Predictable, high-throughput production OLTP. Up to 15 Aurora Replicas for read scaling."],
        ["Aurora Serverless v2", "Fractional ACU scaling (0.5 – 128 ACU), instant scale-up", "Variable workloads, dev/test, SaaS multi-tenant DBs. Scales in under a second. Pay per ACU-second."],
        ["Aurora Global Database", "Primary cluster + up to 5 secondary read clusters", "Cross-region DR (RPO < 1 s, RTO < 1 min). Global low-latency reads from secondary regions."],
        ["Aurora Multi-Master", "All nodes can accept writes", "Continuous write availability within a region. Limited to MySQL-compatible; complex conflict resolution."],
        ["Aurora I/O-Optimised", "Included I/O pricing model", "Workloads with > 25 % of total cost coming from I/O. Predictable pricing for I/O-heavy apps."],
    ]
    rows3 = [[Paragraph(r[0], S["body_bold"]), Paragraph(r[1], S["body"]), Paragraph(r[2], S["body"])] for r in rows3]
    s.append(service_table(headers3, rows3, [48*mm, 50*mm, 77*mm]))
    s.append(spacer(8))

    s.append(Paragraph("Best-Fit Logic & Key Limits", S["h3"]))
    s.append(info_box("Aurora Selection Logic", [
        "Aurora Serverless v2 for dev/test or any workload with intermittent spikes — it scales to zero is NOT supported (min 0.5 ACU keeps it warm).",
        "Aurora Provisioned for consistently high throughput where ACU-second cost would exceed fixed instance cost.",
        "Aurora Global Database is the gold standard for cross-region active-passive DR.",
        "Aurora storage automatically grows in 10 GB increments up to 128 TiB — no pre-provisioning needed.",
        "Aurora shares the cluster volume across all instances — replicas have zero replication lag.",
        "Aurora Serverless v2 minimum is 0.5 ACU — not truly serverless; a small cost always exists.",
        "Backtrack (MySQL only): rewind the DB in-place up to 72 hours — cheaper than restoring from snapshot for accidental deletes.",
    ], bg=GRAY_LIGHT, title_color=GRAY_DARK))
    s.append(spacer(10))

    # ElastiCache
    s.append(Paragraph("3.4  Amazon ElastiCache", S["h2"]))
    s.append(hr())
    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers4 = [Paragraph(h, ParagraphStyle("th4", fontSize=8.5, textColor=WHITE,
                fontName="Helvetica-Bold")) for h in ["Engine / Mode", "Data Model", "Primary Use Case"]]
    rows4 = [
        ["ElastiCache for Redis — Cluster Mode Disabled", "Key-value, sorted sets, pub/sub", "Session store, leaderboards, real-time analytics. Single shard, up to 5 read replicas. Max 3.5 TB per node."],
        ["ElastiCache for Redis — Cluster Mode Enabled", "Sharded key-value (up to 500 shards)", "Horizontal scaling of Redis. Large datasets > single node capacity. Online resharding."],
        ["ElastiCache for Memcached", "Pure in-memory key-value (no persistence)", "Simplest caching. Multi-threaded, no replication, no persistence. Lowest overhead for pure cache."],
        ["ElastiCache Serverless (Redis & Memcached)", "Auto-scales cache capacity", "Unpredictable caching workloads. No cluster management. Pay per ECU and data stored."],
    ]
    rows4 = [[Paragraph(r[0], S["body_bold"]), Paragraph(r[1], S["body"]), Paragraph(r[2], S["body"])] for r in rows4]
    s.append(service_table(headers4, rows4, [52*mm, 40*mm, 83*mm]))
    s.append(spacer(8))

    s.append(Paragraph("Best-Fit Logic & Key Limits", S["h3"]))
    s.append(info_box("ElastiCache Engine Choice", [
        "Need persistence, pub/sub, Lua scripting, or complex data structures (sorted sets, streams)? Redis.",
        "Pure caching, multi-threaded, simplest operations, no HA requirement? Memcached.",
        "Redis Cluster Mode Enabled required if dataset > single node RAM or if you need > 500 connections per shard.",
        "ElastiCache is VPC-only — no public endpoint. Applications must be in the same VPC or connected via VPC peering/TGW.",
        "Redis AUTH and in-transit encryption (TLS) must be explicitly enabled — off by default.",
        "Memcached does not support persistence — all data is lost on node failure or restart.",
    ], bg=GRAY_LIGHT, title_color=GRAY_DARK))

    s.append(PageBreak())
    return s

# ═══════════════════════════════════════════════════════════════════════════
# DOMAIN 4 – NETWORKING
# ═══════════════════════════════════════════════════════════════════════════
def domain_networking():
    s = []
    s.append(section_header("04", "Networking"))
    s.append(spacer(8))

    # VPC
    s.append(Paragraph("4.1  VPC — Public vs. Private Subnets", S["h2"]))
    s.append(hr())
    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers = [Paragraph(h, ParagraphStyle("th", fontSize=8.5, textColor=WHITE,
               fontName="Helvetica-Bold")) for h in ["Subnet Type", "Internet Access Path", "Typical Resources"]]
    rows = [
        ["Public Subnet", "Internet Gateway (IGW) attached to VPC; route 0.0.0.0/0 → IGW", "ALB, NAT Gateway, Bastion Host, public-facing web servers."],
        ["Private Subnet", "No direct internet route; outbound via NAT Gateway (IPv4) or Egress-Only IGW (IPv6)", "App servers, databases, Lambda in VPC, internal microservices."],
        ["Isolated / DB Subnet", "No route to internet at all (not even via NAT)", "RDS, ElastiCache, internal data stores with no outbound internet need."],
        ["VPC Endpoints — Gateway", "No NAT required; private route to S3 & DynamoDB", "EC2 in private subnet accessing S3/DynamoDB without internet traffic."],
        ["VPC Endpoints — Interface (PrivateLink)", "Private ENI in subnet; route to AWS services over AWS backbone", "Access any AWS service or SaaS privately. Avoids internet traversal."],
    ]
    rows = [[Paragraph(r[0], S["body_bold"]), Paragraph(r[1], S["body"]), Paragraph(r[2], S["body"])] for r in rows]
    s.append(service_table(headers, rows, [45*mm, 60*mm, 70*mm]))
    s.append(spacer(8))

    s.append(Paragraph("Best-Fit Logic", S["h3"]))
    s.append(info_box("VPC Subnet Design Rules", [
        "Internet-facing load balancers go in public subnets; backend instances in private subnets.",
        "Databases should be in isolated subnets with no route to the internet whatsoever.",
        "NAT Gateway is AZ-scoped — deploy one per AZ for HA. Single NAT Gateway is a single point of failure.",
        "Security Groups are stateful (return traffic auto-allowed). NACLs are stateless — must allow inbound AND outbound explicitly.",
        "VPC CIDR cannot be changed after creation — plan generously (minimum /20) for future expansion.",
    ]))
    s.append(spacer(8))

    s.append(Paragraph("Exam Scenario", S["h3"]))
    s.append(warn_box("❌  Missing NAT Gateway — Private EC2 Cannot Update",
        ["Problem: EC2 instances in a private subnet need to pull OS updates and call external APIs. No NAT Gateway exists. All outbound traffic fails.",
         "Correct Fix: Create a NAT Gateway in the public subnet of each AZ. Update the private subnet route table: 0.0.0.0/0 → NAT GW. Ensure the NAT GW has an Elastic IP."]))
    s.append(spacer(6))

    s.append(Paragraph("Key Limits & Constraints", S["h3"]))
    s.append(info_box("VPC Gotchas", [
        "VPC Peering is non-transitive — A↔B and B↔C does not allow A↔C. Use Transit Gateway for hub-and-spoke.",
        "Default VPC: exists in every region; subnets are public by default. Do not use for production.",
        "Security Group rule limit: 60 inbound + 60 outbound per SG (soft limit). 5 SGs per ENI.",
        "VPC Flow Logs: capture accepted/rejected traffic at VPC, subnet, or ENI level. Stored in CloudWatch Logs or S3. No real-time — delay of minutes.",
        "Overlapping CIDR blocks between peered VPCs: peering will fail. Plan IP space carefully.",
        "IPv6 in VPC: dual-stack supported; IPv6 addresses are always public (no NAT concept for IPv6 — use Egress-Only IGW).",
    ], bg=GRAY_LIGHT, title_color=GRAY_DARK))
    s.append(spacer(10))

    # Route 53
    s.append(Paragraph("4.2  Amazon Route 53 Routing Policies", S["h2"]))
    s.append(hr())
    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers2 = [Paragraph(h, ParagraphStyle("th2", fontSize=8.5, textColor=WHITE,
                fontName="Helvetica-Bold")) for h in ["Routing Policy", "Logic", "Primary Use Case"]]
    rows2 = [
        ["Simple", "Returns one or all records; no health checks", "Single resource. Static websites, single server."],
        ["Failover", "Primary → Secondary on health check failure", "Active-passive DR. Primary serves traffic; secondary is cold standby."],
        ["Weighted", "Distributes traffic by weight (0-255)", "Blue/green deployments, A/B testing, gradual traffic shifting."],
        ["Latency-based", "Routes to region with lowest network latency", "Global apps with multi-region deployments wanting best user experience."],
        ["Geolocation", "Routes based on user's geographic location", "Content localisation, legal data residency, language-specific endpoints."],
        ["Geoproximity", "Routes by distance with optional bias", "Fine-grained geographic control; shift traffic radius with + or - bias."],
        ["Multi-Value Answer", "Returns up to 8 healthy records randomly", "Simple load distribution with health checks. Not a true LB replacement."],
        ["IP-based", "Routes based on client IP CIDR", "Route ISP or corporate network traffic to specific endpoints."],
    ]
    rows2 = [[Paragraph(r[0], S["body_bold"]), Paragraph(r[1], S["body"]), Paragraph(r[2], S["body"])] for r in rows2]
    s.append(service_table(headers2, rows2, [42*mm, 55*mm, 78*mm]))
    s.append(spacer(8))

    s.append(Paragraph("Key Limits & Exam Scenario", S["h3"]))
    s.append(info_box("Route 53 Rules", [
        "Health checks are required for Failover routing — without them, R53 never knows the primary is down.",
        "Alias records (A/AAAA) are free; standard CNAME queries are charged. Always use Alias for AWS resources (ALB, CloudFront, S3 website).",
        "TTL is your recovery time for DNS-based failover — set low (60 s) for DR records.",
        "Private Hosted Zones: must be associated with a VPC. VPC DNS resolution and hostnames must be enabled.",
        "Route 53 Resolver: forward/reverse DNS between on-premises and VPC — requires Resolver Endpoints in VPC.",
    ]))
    s.append(spacer(6))
    s.append(warn_box("❌  Geolocation vs. Latency Confusion",
        ["Problem: A team wants to route US users to US-East and EU users to EU-West for lowest latency. They choose Geolocation. A US user with a VPN in Germany gets routed to EU-West causing high latency.",
         "Correct Fix: Use Latency-based routing — it measures actual network latency, not geographic location, giving true best-performance routing regardless of VPN/proxy."]))
    s.append(spacer(10))

    # Transit Gateway & PrivateLink
    s.append(Paragraph("4.3  Transit Gateway and AWS PrivateLink", S["h2"]))
    s.append(hr())
    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers3 = [Paragraph(h, ParagraphStyle("th3", fontSize=8.5, textColor=WHITE,
                fontName="Helvetica-Bold")) for h in ["Service", "Connectivity Model", "Primary Use Case"]]
    rows3 = [
        ["Transit Gateway (TGW)", "Hub-and-spoke. Attach VPCs, VPNs, Direct Connect GWs to a central TGW.", "Connect 100s of VPCs and on-prem networks. Transitive routing. Single point of network policy."],
        ["TGW Route Tables", "Multiple route tables for traffic segmentation", "Shared-services VPC pattern, DMZ isolation, dev/prod separation."],
        ["VPC Peering", "Direct 1:1 encrypted peering, non-transitive", "Low-latency, simple 2-VPC connectivity. No TGW cost for small deployments."],
        ["AWS PrivateLink (VPC Endpoint Services)", "Consumer VPC → Provider ENI (no VPC peering needed)", "Expose SaaS or shared services privately. No overlapping CIDR concerns. Consumer can't reach provider VPC."],
        ["Direct Connect", "Dedicated private network link (1, 10, 100 Gbps)", "On-premises to AWS with consistent latency and bandwidth. Bypasses internet."],
        ["Site-to-Site VPN", "IPSec over internet; up to 1.25 Gbps per tunnel", "Cost-effective on-prem connectivity. Backup for Direct Connect."],
    ]
    rows3 = [[Paragraph(r[0], S["body_bold"]), Paragraph(r[1], S["body"]), Paragraph(r[2], S["body"])] for r in rows3]
    s.append(service_table(headers3, rows3, [45*mm, 55*mm, 75*mm]))
    s.append(spacer(8))

    s.append(Paragraph("Key Limits & Constraints", S["h3"]))
    s.append(info_box("TGW & PrivateLink Gotchas", [
        "TGW max attachments: 5,000 VPCs per TGW (soft limit). Bandwidth: 50 Gbps per VPC attachment.",
        "TGW is regional — cross-region requires TGW peering (not the same as VPC peering).",
        "PrivateLink (Interface Endpoint) requires a Network Load Balancer on the provider side.",
        "PrivateLink does not support UDP; TCP only.",
        "Direct Connect failover: always pair with a VPN or second DX connection. Single DX has no SLA guarantee.",
        "VPC Peering cannot be used if CIDRs overlap — plan your IP scheme before peering.",
        "TGW Network Manager: provides global network visibility and route analysis across all TGW attachments.",
    ], bg=GRAY_LIGHT, title_color=GRAY_DARK))

    s.append(PageBreak())
    return s

# ═══════════════════════════════════════════════════════════════════════════
# DOMAIN 5 – IDENTITY
# ═══════════════════════════════════════════════════════════════════════════
def domain_identity():
    s = []
    s.append(section_header("05", "Identity & Access Management"))
    s.append(spacer(8))

    # IAM
    s.append(Paragraph("5.1  IAM — Roles, Groups, and Policies", S["h2"]))
    s.append(hr())
    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers = [Paragraph(h, ParagraphStyle("th", fontSize=8.5, textColor=WHITE,
               fontName="Helvetica-Bold")) for h in ["IAM Construct", "Description", "Primary Use Case"]]
    rows = [
        ["User", "Long-term credentials (password + access keys) for a specific human or legacy service", "Human console access, legacy programmatic access. Prefer IAM Identity Center for humans."],
        ["Group", "Collection of users sharing a common set of policies", "Organise permissions by job function (Developers, Ops, ReadOnly). Policies attach to group, not users directly."],
        ["Role", "Temporary credentials assumed by a principal (user, service, account, IdP)", "EC2 instance role, Lambda execution role, cross-account access, federated SSO, ECS task role."],
        ["Policy — AWS Managed", "Pre-built policies maintained by AWS", "Quick start. Broad permissions. Not recommended for least privilege — too permissive."],
        ["Policy — Customer Managed", "Custom JSON policies you create and manage", "Least-privilege production policies. Version controlled, reusable across roles/groups."],
        ["Policy — Inline", "Policy embedded directly into a single identity", "Strict 1:1 relationship (e.g., emergency break-glass access). Deleted with the identity."],
        ["Permission Boundary", "Maximum permission ceiling for an identity", "Allow devs to create roles without granting them the ability to escalate privileges."],
    ]
    rows = [[Paragraph(r[0], S["body_bold"]), Paragraph(r[1], S["body"]), Paragraph(r[2], S["body"])] for r in rows]
    s.append(service_table(headers, rows, [45*mm, 55*mm, 75*mm]))
    s.append(spacer(8))

    # Resource-based vs Identity-based
    s.append(Paragraph("5.2  Resource-Based vs. Identity-Based Policies", S["h2"]))
    s.append(hr())
    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers2 = [Paragraph(h, ParagraphStyle("th2", fontSize=8.5, textColor=WHITE,
                fontName="Helvetica-Bold")) for h in ["Policy Type", "Attached To", "Cross-Account?"]]
    rows2 = [
        ["Identity-based Policy", "IAM User / Role / Group", "No — grants permissions to the identity to act on resources."],
        ["Resource-based Policy", "The resource itself (S3 bucket, SQS, SNS, Lambda, KMS key, etc.)", "Yes — specifies who (Principal) can perform actions on the resource. Enables cross-account without assuming a role."],
        ["VPC Endpoint Policy", "VPC Endpoint", "Restricts which principals/resources can be accessed through the endpoint."],
        ["Service Control Policy (SCP)", "AWS Organizations OU or Account", "Sets maximum permission boundary for entire accounts. Does not grant permissions."],
        ["Session Policy", "Assumed role session (via AssumeRole API)", "Further restrict permissions for a specific session without modifying the role itself."],
    ]
    rows2 = [[Paragraph(r[0], S["body_bold"]), Paragraph(r[1], S["body"]), Paragraph(r[2], S["body"])] for r in rows2]
    s.append(service_table(headers2, rows2, [50*mm, 65*mm, 60*mm]))
    s.append(spacer(8))

    s.append(Paragraph("Best-Fit Logic", S["h3"]))
    s.append(info_box("IAM Policy Evaluation Logic", [
        "Explicit DENY always wins — regardless of any allow statements anywhere in the chain.",
        "IAM evaluation order: SCP → Resource policy → Identity policy → Permission Boundary → Session policy. All must allow.",
        "Cross-account access: identity in Account A needs both a role in Account B (or resource policy) AND an identity policy allowing sts:AssumeRole.",
        "Resource-based policies (S3 bucket policy, KMS key policy) can grant access without requiring a role assumption — useful for cross-account S3 access.",
        "IAM Access Analyzer: identifies resources shared outside your account or org — essential audit tool.",
    ]))
    s.append(spacer(8))

    s.append(Paragraph("Exam Scenario", S["h3"]))
    s.append(warn_box("❌  Missing Trust Policy — Role Won't Be Assumed",
        ["Problem: A developer creates an IAM Role with S3FullAccess. The EC2 instance cannot access S3. The role's trust policy only lists the IAM user, not ec2.amazonaws.com as a trusted service.",
         "Correct Fix: Edit the trust policy (sts:AssumeRole Principal) to include 'Service': 'ec2.amazonaws.com'. Attach the role as an instance profile. Both the permission policy AND trust policy must be correct."]))
    s.append(spacer(10))

    # AWS Organizations / SCPs
    s.append(Paragraph("5.3  AWS Organizations and SCPs", S["h2"]))
    s.append(hr())
    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers3 = [Paragraph(h, ParagraphStyle("th3", fontSize=8.5, textColor=WHITE,
                fontName="Helvetica-Bold")) for h in ["Construct", "Scope", "Primary Use Case"]]
    rows3 = [
        ["Management Account", "Root of the organisation; cannot be restricted by SCPs", "Billing consolidation, AWS Control Tower, account vending."],
        ["Organisational Unit (OU)", "Logical grouping of accounts (e.g., Prod, Dev, Sandbox)", "Apply SCPs to a subset of accounts without affecting others."],
        ["Service Control Policy (SCP)", "Max permission boundary for accounts in OU/org", "Prevent specific AWS services (e.g., deny EC2 in non-approved regions, enforce S3 encryption)."],
        ["Delegated Administrator", "A member account given org-level admin for specific services", "Centralise Security Hub, GuardDuty, or Config without using the management account for operations."],
        ["AWS Control Tower", "Orchestration layer on top of Organizations", "Landing zone automation: guardrails (preventive/detective SCPs), account factory, compliance dashboard."],
        ["Tag Policies", "Enforce consistent tagging across org", "Cost allocation, automated compliance checks, resource grouping."],
    ]
    rows3 = [[Paragraph(r[0], S["body_bold"]), Paragraph(r[1], S["body"]), Paragraph(r[2], S["body"])] for r in rows3]
    s.append(service_table(headers3, rows3, [45*mm, 50*mm, 80*mm]))
    s.append(spacer(8))

    s.append(Paragraph("Key Limits & Constraints", S["h3"]))
    s.append(info_box("IAM / Organizations Gotchas", [
        "SCPs do NOT grant permissions — they only restrict. An account with a full-allow SCP still needs IAM policies.",
        "SCPs do NOT apply to the management account — it is always unrestricted.",
        "IAM role session duration: default 1 hour, max 12 hours (configurable on the role). AWS Console sessions max 12 hours.",
        "IAM user limit: 5,000 per account (hard limit). Use IAM Identity Center (SSO) for large organisations.",
        "Access Key rotation: AWS recommends rotation every 90 days. Use IAM credential report to audit.",
        "Condition keys in policies: aws:RequestedRegion, aws:PrincipalOrgID, aws:SourceVpc are powerful for least-privilege guardrails.",
        "SCP max size: 5,120 characters. Attach multiple SCPs if needed (max 5 per account or OU).",
    ], bg=GRAY_LIGHT, title_color=GRAY_DARK))

    s.append(PageBreak())
    return s

# ═══════════════════════════════════════════════════════════════════════════
# DOMAIN 6 – MONITORING
# ═══════════════════════════════════════════════════════════════════════════
def domain_monitoring():
    s = []
    s.append(section_header("06", "Monitoring, Logging & Governance"))
    s.append(spacer(8))

    # CloudWatch
    s.append(Paragraph("6.1  Amazon CloudWatch", S["h2"]))
    s.append(hr())
    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers = [Paragraph(h, ParagraphStyle("th", fontSize=8.5, textColor=WHITE,
               fontName="Helvetica-Bold")) for h in ["CloudWatch Feature", "What It Does", "Primary Use Case"]]
    rows = [
        ["Metrics", "Time-series numerical data points from AWS services and custom sources", "CPU utilisation, request count, error rate. 1-second granularity with High-Resolution metrics."],
        ["Custom Metrics", "PutMetricData API from application code or CW Agent", "App-level metrics: queue depth, business KPIs, memory/disk (not available by default on EC2)."],
        ["Alarms", "Threshold-based or anomaly-detection triggers on metrics", "Auto Scaling triggers, SNS notifications, EC2 recovery actions. States: OK, ALARM, INSUFFICIENT_DATA."],
        ["Composite Alarms", "Logical combination (AND/OR) of multiple alarms", "Reduce alert noise. Only page on-call if both CPU AND memory exceed thresholds simultaneously."],
        ["Logs — Log Groups/Streams", "Collect, store, and query log data", "Application logs, Lambda logs, VPC Flow Logs, API Gateway access logs."],
        ["Logs Insights", "Interactive query language for log analysis", "Ad-hoc log analysis, troubleshooting, build dashboards from log data."],
        ["Metric Filters", "Extract metric data from log patterns", "Count ERROR occurrences in logs and create an alarm — bridges logs to metrics."],
        ["Container Insights", "ECS/EKS cluster, service, task metrics", "CPU, memory, network per container. Requires CloudWatch Agent as DaemonSet on EKS."],
        ["Evidently", "Feature flags and A/B experimentation", "Controlled feature rollouts, measure business impact of code changes."],
        ["Synthetics", "Canary scripts simulating user transactions", "Proactively detect endpoint failures before real users are affected."],
    ]
    rows = [[Paragraph(r[0], S["body_bold"]), Paragraph(r[1], S["body"]), Paragraph(r[2], S["body"])] for r in rows]
    s.append(service_table(headers, rows, [45*mm, 55*mm, 75*mm]))
    s.append(spacer(8))

    s.append(Paragraph("Best-Fit Logic", S["h3"]))
    s.append(info_box("CloudWatch Design Principles", [
        "EC2 memory and disk utilisation are NOT published by default — install the CloudWatch Agent to collect them.",
        "Standard metric resolution: 1 minute (free). High-resolution: 1 second ($0.30/metric/month extra).",
        "Alarm evaluation period: number of data points × evaluation period must fit your response SLA.",
        "Use Metric Math to combine metrics (e.g., error rate = errors / requests × 100) without code changes.",
        "Log retention defaults to 'Never Expire' — set a retention period (e.g., 90 days) to control costs.",
        "Cross-account observability: share metrics/logs/traces across accounts via CloudWatch cross-account sinks.",
    ]))
    s.append(spacer(8))

    s.append(Paragraph("Exam Scenario", S["h3"]))
    s.append(warn_box("❌  Missing CW Agent — Memory Alarm Never Fires",
        ["Problem: An Auto Scaling policy should scale out when EC2 memory exceeds 80 %. The team creates a CloudWatch Alarm on 'MemoryUtilization' but the metric never appears. The alarm stays in INSUFFICIENT_DATA forever.",
         "Correct Fix: Install the CloudWatch Agent on the EC2 instances (via SSM or userdata). Configure it to publish mem_used_percent as a custom metric. Then create the alarm against that custom namespace."]))
    s.append(spacer(10))

    # CloudTrail
    s.append(Paragraph("6.2  AWS CloudTrail — Management vs. Data Events", S["h2"]))
    s.append(hr())
    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers2 = [Paragraph(h, ParagraphStyle("th2", fontSize=8.5, textColor=WHITE,
                fontName="Helvetica-Bold")) for h in ["Event Type", "What Is Logged", "Primary Use Case"]]
    rows2 = [
        ["Management Events (Control Plane)", "API calls that manage AWS resources: CreateBucket, RunInstances, CreateRole, AttachPolicy", "Security auditing, compliance, who changed what configuration and when. Enabled by default."],
        ["Data Events (Data Plane)", "Object-level operations: S3 GetObject/PutObject, Lambda Invoke, DynamoDB PutItem/GetItem", "Security forensics (who read sensitive data?), Lambda invocation auditing. NOT enabled by default — extra cost."],
        ["Insights Events", "Detects unusual API call volume or error rate spikes using ML", "Automatically alerts on anomalous API behaviour (e.g., sudden surge in TerminateInstances calls)."],
        ["Network Activity Events", "VPC network traffic at the API level (new in 2024)", "Monitor PrivateLink endpoint usage and VPC traffic patterns."],
        ["CloudTrail Lake", "Managed data lake for querying trail events with SQL", "Long-term (up to 7 years) retention with fast SQL querying. No S3/Athena setup required."],
    ]
    rows2 = [[Paragraph(r[0], S["body_bold"]), Paragraph(r[1], S["body"]), Paragraph(r[2], S["body"])] for r in rows2]
    s.append(service_table(headers2, rows2, [45*mm, 60*mm, 70*mm]))
    s.append(spacer(8))

    s.append(Paragraph("Best-Fit Logic", S["h3"]))
    s.append(info_box("CloudTrail Configuration Best Practices", [
        "Create a multi-region Trail in the management account — a single-region Trail misses global service events (IAM, STS, Route 53).",
        "Enable Log File Validation — uses SHA-256 hashes to prove log integrity for compliance.",
        "Send trail logs to a centralised S3 bucket in a dedicated security/log-archive account with an S3 bucket policy blocking deletion.",
        "Data Events are voluminous — enable selectively (e.g., only specific S3 buckets containing PII).",
        "CloudTrail logs are delivered within ~15 minutes of API call — not real-time. Use EventBridge for near-real-time rule-based triggers.",
    ]))
    s.append(spacer(8))

    s.append(Paragraph("Key Limits & Constraints", S["h3"]))
    s.append(info_box("CloudTrail Gotchas", [
        "CloudTrail is not a real-time stream. Use CloudWatch Events / EventBridge for immediate automated response.",
        "Default management event retention in the console: 90 days. For longer retention, configure an S3-backed Trail.",
        "CloudTrail does NOT log read-only console actions by default for all services — Data Events must be explicitly enabled.",
        "You can have up to 5 Trails per region.",
        "Encrypted trails use KMS — ensure CloudTrail has kms:GenerateDataKey permission on the CMK.",
    ], bg=GRAY_LIGHT, title_color=GRAY_DARK))
    s.append(spacer(10))

    # AWS Config
    s.append(Paragraph("6.3  AWS Config", S["h2"]))
    s.append(hr())
    s.append(Paragraph("Service Taxonomy", S["h3"]))
    headers3 = [Paragraph(h, ParagraphStyle("th3", fontSize=8.5, textColor=WHITE,
                fontName="Helvetica-Bold")) for h in ["Config Feature", "What It Does", "Primary Use Case"]]
    rows3 = [
        ["Configuration Recorder", "Continuously records configuration changes of supported AWS resources", "Configuration history, compliance auditing, drift detection."],
        ["Config Rules — AWS Managed", "Pre-built rules (200+): s3-bucket-public-read-prohibited, encrypted-volumes, etc.", "Quick compliance checks against AWS best practices and CIS Benchmarks."],
        ["Config Rules — Custom (Lambda)", "Custom Lambda function evaluates resource configuration", "Organisation-specific compliance checks not covered by managed rules."],
        ["Conformance Packs", "Collection of Config rules + remediation actions deployed as a unit", "Deploy PCI-DSS, HIPAA, or CIS benchmark compliance packs across an org."],
        ["Remediation Actions", "SSM Automation document triggered on non-compliant resource", "Auto-remediate: enable versioning on non-versioned S3 bucket, add missing tags."],
        ["Config Aggregator", "Collects Config data from multiple accounts/regions", "Org-wide compliance dashboard. Requires Delegated Administrator account."],
    ]
    rows3 = [[Paragraph(r[0], S["body_bold"]), Paragraph(r[1], S["body"]), Paragraph(r[2], S["body"])] for r in rows3]
    s.append(service_table(headers3, rows3, [45*mm, 60*mm, 70*mm]))
    s.append(spacer(8))

    s.append(Paragraph("CloudTrail vs. Config — The Classic Distinction", S["h3"]))
    s.append(info_box("CloudTrail vs. AWS Config", [
        "CloudTrail answers: WHO did WHAT action, and WHEN? (API call audit log)",
        "AWS Config answers: WHAT does my resource look like NOW and HOW did it change over time? (configuration state history)",
        "Example: S3 bucket policy changed to allow public access — CloudTrail shows the PutBucketPolicy API call by user X at time T. AWS Config shows the before/after configuration state of the bucket and flags it as non-compliant.",
        "Both are complementary — use CloudTrail for accountability, AWS Config for continuous compliance.",
    ]))
    s.append(spacer(6))

    s.append(Paragraph("Key Limits & Constraints", S["h3"]))
    s.append(info_box("AWS Config Gotchas", [
        "AWS Config is a regional service — enable it in every region (use CloudFormation StackSets or Config Aggregator for org-wide coverage).",
        "Config recording cost: $0.003 per configuration item recorded. High-change environments (frequent Auto Scaling) can accumulate costs.",
        "Config does NOT prevent changes — it detects and reports them. Use SCPs or AWS Config Remediation to react.",
        "Custom Config rules require a Lambda function in each region where the rule is deployed.",
        "Config Aggregator shows compliance status but does not aggregate CloudTrail logs — use Security Lake or a SIEM for that.",
        "Retention period for configuration history: 7 years default when delivered to S3.",
    ], bg=GRAY_LIGHT, title_color=GRAY_DARK))
    s.append(spacer(10))

    # Summary comparison table
    s.append(Paragraph("Monitoring Service Comparison Summary", S["h2"]))
    s.append(hr())
    comp_headers = [Paragraph(h, ParagraphStyle("ch", fontSize=8.5, textColor=WHITE,
                   fontName="Helvetica-Bold")) for h in ["Service", "Answers", "Real-Time?", "Best For"]]
    comp_rows = [
        ["CloudWatch Metrics", "Is my system healthy?", "Near (~1 min)", "Performance, Auto Scaling, Alarms"],
        ["CloudWatch Logs", "What is my application saying?", "Seconds", "App logs, security events, debugging"],
        ["CloudTrail", "Who did what API action?", "~15 min delay", "Security audit, compliance, forensics"],
        ["AWS Config", "What changed in my infrastructure?", "Minutes", "Configuration compliance, drift detection"],
        ["X-Ray", "Where is my request slow?", "Near real-time", "Distributed tracing, latency analysis"],
        ["Security Hub", "Am I following security best practices?", "Minutes", "Aggregated security findings across services"],
        ["GuardDuty", "Is something malicious happening?", "Minutes", "Threat detection, anomaly detection"],
    ]
    comp_rows = [[Paragraph(r[0], S["body_bold"]), Paragraph(r[1], S["body"]),
                  Paragraph(r[2], S["body"]), Paragraph(r[3], S["body"])] for r in comp_rows]
    comp_tbl = Table([comp_headers] + comp_rows, colWidths=[38*mm, 45*mm, 28*mm, 64*mm])
    comp_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0,0), (-1,0),  AWS_ORANGE),
        ("TEXTCOLOR",     (0,0), (-1,0),  WHITE),
        ("FONTNAME",      (0,0), (-1,0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0,0), (-1,0),  8.5),
        ("FONTNAME",      (0,1), (-1,-1), "Helvetica"),
        ("FONTSIZE",      (0,1), (-1,-1), 8),
        ("TEXTCOLOR",     (0,1), (-1,-1), GRAY_DARK),
        ("ROWBACKGROUNDS",(0,1),(-1,-1),  [WHITE, GRAY_LIGHT]),
        ("GRID",          (0,0), (-1,-1), 0.4, HexColor("#BDC3C7")),
        ("TOPPADDING",    (0,0), (-1,-1), 5),
        ("BOTTOMPADDING", (0,0), (-1,-1), 5),
        ("LEFTPADDING",   (0,0), (-1,-1), 6),
        ("VALIGN",        (0,0), (-1,-1), "TOP"),
    ]))
    s.append(comp_tbl)

    return s

# ═══════════════════════════════════════════════════════════════════════════
# BUILD PDF
# ═══════════════════════════════════════════════════════════════════════════
def build_pdf(path):
    doc = SimpleDocTemplate(
        path,
        pagesize=A4,
        leftMargin=20*mm,
        rightMargin=20*mm,
        topMargin=22*mm,
        bottomMargin=28*mm,
        title="AWS Certification Technical Manual",
        author="AWS Certification Lead",
        subject="Six-Domain AWS Study Guide",
    )

    story = []
    story += cover_page()
    story += domain_compute()
    story += domain_storage()
    story += domain_database()
    story += domain_networking()
    story += domain_identity()
    story += domain_monitoring()

    doc.build(story,
              onFirstPage=on_first_page,
              onLaterPages=on_later_pages)
    print(f"PDF written to {path}")

build_pdf("/mnt/user-data/outputs/AWS_Certification_Technical_Manual.pdf")