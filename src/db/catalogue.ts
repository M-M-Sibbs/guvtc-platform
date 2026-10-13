// Initial course catalogue supplied by GUVTC. Descriptions are proposed copy and must be
// aligned with the approved syllabus before publication. Durations and fees are intentionally
// left empty: GUVTC's short courses run from 2 weeks to 6 months, and each course's own verified
// duration should be entered by staff (Staff → Courses) rather than assumed.

export type SeedCourse = {
  name: string;
  summary: string;
  description: string;
  outcomes: string[];
  modes: string[];
  equipment?: string;
  featured?: boolean;
};

export type SeedCategory = { name: string; slug: string; description: string; isAI?: boolean; courses: SeedCourse[] };

const IP = ["IN_PERSON"];
const AI_MODES = ["IN_PERSON", "ONLINE_LIVE", "BLENDED"];

export const CATALOGUE: SeedCategory[] = [
  {
    name: "Fashion, textiles & home design",
    slug: "fashion-textiles",
    description: "Cut, sew, dye and decorate — skills you can sell from your first finished piece.",
    courses: [
      {
        name: "Home Decor",
        summary: "Make curtains, cushions, bedding and decorative pieces that transform a room.",
        description: "Plan colour schemes, measure windows and furniture, and sew soft furnishings to a finish customers will pay for. You will build a small portfolio of pieces for your own home or first clients.",
        outcomes: ["Measure and estimate fabric for curtains and covers", "Sew cushions, bedding and table linen", "Plan a room colour and fabric scheme", "Price home decor work for clients"],
        modes: IP,
        equipment: "Sewing machine access is provided in the workshop.",
      },
      {
        name: "Dress Making",
        summary: "Take measurements, cut and sew garments that fit — from simple skirts to dresses.",
        description: "Learn to take body measurements, prepare fabric, cut accurately and assemble garments on domestic and industrial machines. Finishing, fitting and alterations are practised throughout.",
        outcomes: ["Take and record body measurements", "Cut and assemble skirts, blouses and dresses", "Insert zips, facings, collars and hems", "Fit garments and carry out alterations"],
        modes: IP,
        equipment: "Sewing kit list issued at registration.",
        featured: true,
      },
      {
        name: "Pattern Making",
        summary: "Draft and grade your own patterns so every design fits your customer.",
        description: "Draft basic blocks from measurements, adapt them into new styles and grade patterns across sizes. A strong next step for dressmakers who want to design rather than copy.",
        outcomes: ["Draft bodice, skirt and sleeve blocks", "Adapt blocks into new styles", "Grade patterns between sizes", "Prepare patterns for cutting"],
        modes: IP,
      },
      {
        name: "Tie and Dyeing",
        summary: "Create patterned fabric with folding, binding and dyeing techniques.",
        description: "Practise traditional and modern resist-dye techniques, mix dyes safely and produce saleable fabric, scarves and garments.",
        outcomes: ["Prepare fabric and mix dyes safely", "Use folding, binding and stitch-resist techniques", "Fix colour for washable results", "Produce saleable dyed pieces"],
        modes: IP,
      },
    ],
  },
  {
    name: "Beauty & personal care",
    slug: "beauty-personal-care",
    description: "Hands-on salon skills taught to professional hygiene standards.",
    courses: [
      { name: "Manicure", summary: "Professional hand and nail care, shaping and polish application.", description: "Work through hygiene, nail shaping, cuticle care, hand massage and polish application on live clients in a supervised salon setting.", outcomes: ["Follow salon hygiene and sterilisation routines", "Shape and care for natural nails", "Apply polish to a professional finish", "Advise clients on aftercare"], modes: IP },
      { name: "Pedicure", summary: "Foot care, nail treatment and relaxing pedicure routines.", description: "Learn safe foot soaking, exfoliation, nail care and massage, and how to recognise conditions that need referral rather than treatment.", outcomes: ["Carry out a full pedicure routine", "Recognise conditions that need referral", "Keep tools and stations hygienic", "Build a client treatment record"], modes: IP },
      { name: "Braiding", summary: "Box braids, cornrows and protective styles, neat and long-lasting.", description: "Section, prepare and braid natural hair into popular protective styles, with attention to scalp health and client comfort.", outcomes: ["Section hair accurately", "Braid cornrows and box braids", "Protect scalp health and edges", "Time and price braiding work"], modes: IP, featured: true },
      { name: "Weaving", summary: "Sew-in weaves with clean partings and natural-looking finishes.", description: "Prepare cornrow bases, attach wefts securely and blend for a natural finish. Includes removal and aftercare advice.", outcomes: ["Prepare a weave base", "Sew wefts securely and neatly", "Create natural partings and leave-outs", "Remove weaves without damage"], modes: IP },
      { name: "Relaxing", summary: "Chemical relaxing done safely, with strand tests and scalp protection.", description: "Understand hair structure and chemical safety, carry out strand tests, apply relaxers and neutralise correctly to protect the client's hair and scalp.", outcomes: ["Assess hair and scalp before treatment", "Apply and neutralise relaxers safely", "Follow chemical safety procedures", "Recommend treatment and aftercare"], modes: IP },
      { name: "Wig Installation", summary: "Install, customise and style wigs, including lace units.", description: "Prepare the client's hair, customise lace and density, secure units with and without adhesive, and style for a natural look.", outcomes: ["Prepare hair for wig installation", "Customise lace and hairline", "Install units securely", "Style and maintain wigs"], modes: IP },
    ],
  },
  {
    name: "Digital & business skills",
    slug: "digital-business",
    description: "The everyday computer and retail skills employers expect.",
    courses: [
      { name: "Introduction to Computers", summary: "Use a computer confidently: files, typing, documents, email and the internet.", description: "Start from switching on and finish able to type and format documents, build simple spreadsheets, use email safely and find information online.", outcomes: ["Manage files and folders", "Type and format documents", "Build simple spreadsheets", "Use email and the internet safely"], modes: IP, featured: true },
      { name: "Till Operation", summary: "Operate a cash register and point-of-sale system accurately.", description: "Process sales, refunds and card payments, balance a till at the end of a shift and give customers fast, accurate service.", outcomes: ["Process cash, card and mobile payments", "Handle refunds and voids correctly", "Balance a till at end of shift", "Deliver courteous customer service"], modes: IP },
    ],
  },
  {
    name: "Technical & mechanical trades",
    slug: "technical-mechanical",
    description: "Workshop trades with steady demand across the Midlands.",
    courses: [
      { name: "Window Frame Manufacture", summary: "Measure, cut, weld and finish steel window frames.", description: "Read simple drawings, measure and cut steel sections, weld frames square and finish them for installation, following workshop safety rules.", outcomes: ["Read measurements and simple drawings", "Cut and weld steel sections safely", "Assemble square, true frames", "Finish and prepare frames for fitting"], modes: IP, equipment: "Protective clothing and safety boots required in the workshop." },
      { name: "Motor Mechanics", summary: "Service, diagnose and repair light vehicles.", description: "Work on engines, brakes, suspension and electrical systems in the workshop. Learn routine servicing, fault-finding and safe use of tools and lifting equipment.", outcomes: ["Carry out routine vehicle servicing", "Diagnose common engine faults", "Repair brakes and suspension", "Use workshop tools and lifts safely"], modes: IP, equipment: "Overalls and safety boots required.", featured: true },
    ],
  },
  {
    name: "Hospitality & food production",
    slug: "hospitality-food",
    description: "Kitchen skills for home businesses, events and catering jobs.",
    courses: [
      { name: "Cake Making", summary: "Bake, fill and decorate cakes for birthdays, weddings and orders.", description: "Master sponge, fruit and celebration cakes, then fillings, icing and decoration. Costing and pricing for a home baking business are included.", outcomes: ["Bake consistent sponges and fruit cakes", "Prepare fillings and icings", "Decorate celebration cakes", "Cost and price cake orders"], modes: IP, featured: true },
      { name: "Catering", summary: "Plan, prepare and serve food for events and institutions.", description: "Plan menus, prepare food in quantity, follow food safety rules and serve at events. Learn how to cost a function and run a small catering business.", outcomes: ["Plan and cost menus", "Prepare food in quantity", "Apply food safety and hygiene", "Serve and manage events"], modes: IP },
    ],
  },
  {
    name: "Artificial intelligence",
    slug: "artificial-intelligence",
    isAI: true,
    description: "New short courses that put AI tools to work on real digital jobs.",
    courses: [
      { name: "AI for Programming", summary: "AI-assisted coding, debugging, code explanation and programming practice.", description: "Use AI assistants to write, explain and debug code while building the fundamentals yourself. You will practise checking AI output, testing it and knowing when not to trust it.", outcomes: ["Write and explain code with an AI assistant", "Debug programs using AI suggestions", "Test and verify AI-generated code", "Use AI responsibly and securely"], modes: AI_MODES, equipment: "A laptop is helpful; computer lab access is provided.", featured: true },
      { name: "AI for Software Development", summary: "Using AI through requirements analysis, application development, testing and documentation.", description: "Follow a small project from idea to working application, using AI at each stage: clarifying requirements, planning, building, testing and writing documentation.", outcomes: ["Turn ideas into clear requirements", "Plan and build a small application with AI", "Generate and run tests", "Write user and technical documentation"], modes: AI_MODES },
      { name: "AI for Web Development", summary: "Building websites and web applications with AI-assisted development workflows.", description: "Design and build responsive websites with HTML, CSS and JavaScript, using AI tools to speed up layout, content and debugging. Finish with a published site for yourself or a local business.", outcomes: ["Build responsive web pages", "Use AI to generate and refine layouts", "Publish a website online", "Maintain and update a site"], modes: AI_MODES, featured: true },
      { name: "AI for Automation", summary: "Automating repetitive tasks, connecting digital tools and designing useful AI workflows.", description: "Find repetitive work in an office or small business and automate it: spreadsheets, forms, email and messaging, connected with AI steps that save hours each week.", outcomes: ["Identify tasks worth automating", "Connect forms, sheets and email", "Design AI-assisted workflows", "Keep automations reliable and private"], modes: AI_MODES },
      { name: "AI for Video Content Creation", summary: "Creating video concepts, scripts, AI-generated scenes, narration and marketing content.", description: "Plan short videos for social media and business, write scripts, generate scenes and narration with AI, and edit them into finished marketing content.", outcomes: ["Plan and script short videos", "Generate scenes and voice-overs with AI", "Edit and caption videos", "Create marketing content for clients"], modes: AI_MODES },
      { name: "AI for Graphic Design", summary: "Designing posters, adverts, social media graphics and visual content using AI tools.", description: "Combine design basics — layout, colour and type — with AI image tools to make posters, adverts and social media graphics that local businesses can use.", outcomes: ["Apply layout, colour and typography basics", "Generate and edit images with AI", "Design posters and social media adverts", "Prepare files for print and online use"], modes: AI_MODES, featured: true },
      { name: "AI for Document Creation", summary: "Creating reports, proposals, letters, presentations and other professional documents with AI assistance.", description: "Draft, edit and format professional documents with AI help — reports, proposals, CVs, letters and presentations — while checking facts and keeping a professional tone.", outcomes: ["Draft reports, letters and proposals with AI", "Format professional documents and slides", "Check AI output for accuracy", "Protect personal and confidential information"], modes: AI_MODES },
    ],
  },
];
