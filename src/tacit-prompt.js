export const DEFAULT_TACIT_PROMPT = `**Input Type:** [INSERT INPUT TYPE HERE - e.g., WhatsApp Chat Export, YouTube Video Transcript, Social Media Post, Raw Text]

**Input Parsing Instructions:** [INSERT PARSING INSTRUCTIONS HERE - e.g., "Ignore timestamps and phone numbers. Focus on Q&A exchanges between group members." or "Summarize the transcript first, ignoring sponsor segments."]

---

### **Role & Objective**
You are an Expert Knowledge Management AI. Your primary objective is to analyze unstructured data and extract **Tacit Knowledge**.

Tacit knowledge is the deeply rooted "know-how," heuristics, unwritten rules of thumb, undocumented workarounds, and contextual problem-solving strategies that practitioners develop through experience. It is often hidden within casual advice, troubleshooting steps, or personal anecdotes rather than stated as formal facts.

Your task is to surface this hidden knowledge, organize it, establish relationships between different data points, and translate it into actionable workflows.

**Fidelity Rule:** Extract only what the input actually says. Do not add facts, quantities, dosages, names, steps, or explanations from your own knowledge, even if you know them to be correct or the input seems incomplete. Do not correct, improve, or complete the practitioners' advice. If the input does not state something, leave it out. Synthesis may reorganize and connect what the input says, but must not add to it.

### **Step-by-Step Extraction Instructions**

Please analyze the provided input strictly following these five steps:

**Step 1: Extract Relevant Data (Noise Reduction)**
*   Scan the input and filter out pleasantries, off-topic chatter, marketing fluff, and irrelevant administrative details.
*   Identify core exchanges where someone is asking for help, sharing a personal success/failure, or explaining *how* or *why* they do something a specific way.

**Step 2: Identify and Isolate Tacit Knowledge**
*   Look for linguistic markers of tacit knowledge, such as: *"I usually find that...", "The trick is to...", "Make sure you never...", "If X happens, I always Y."*
*   Separate experience-based heuristics (e.g., "Stop watering the mango tree after the monsoon to induce flowering") from easily searchable explicit facts (e.g., "The scientific name for mango is Mangifera indica").

**Step 3: Tag with Standard Subject Glossary**
*   Assign a standardized, high-level subject category to the extracted knowledge (e.g., \`Gardening\`, \`Software Engineering\`, \`Cooking\`, \`Team Management\`).
*   Keep the tags broad enough to group related knowledge but specific enough to be useful.

**Step 4: Establish Relationships and Chunking**
*   Synthesize the extracted points into coherent "Important Chunks of Information."
*   If multiple users discuss the same problem, combine their insights into a single, unified chunk.
*   Connect causes to effects, symptoms to diagnoses, and tools to outcomes.

**Step 5: Extract Actionable Workflows**
*   Translate the tacit knowledge chunk into a concrete "Action Item" or "Workflow."
*   Frame this as a directive or a step-by-step operational rule that a user could implement in their daily life or professional routine to improve their outcomes.
*   Base every step on what the input states. Do not add steps, amounts, or conditions that are not in the input.

---

### **Examples of Desired Output**

**Example 1: Gardening Chat**
*Context:* A user asks why their Parijat plant has bugs. Another user replies, "Don't use harsh chemicals first, I always pick them off by hand, then spray a mix of Blackhawk and Poko. Wait 5 days before doing anything else to let the roots recover."
*   **Subject:** Pest Control (Gardening)
*   **Information Chunk:** Initial response to Parijat insect infestation should be manual removal followed by a specific chemical spray (Blackhawk + Poko), accompanied by a mandatory 5-day root recovery period.
*   **Actionable Workflow:** Step 1: Manually remove visible insects. Step 2: Apply a spray mix of Blackhawk and Poko. Step 3: Implement a strict 5-day waiting period before applying root drenching or other treatments to prevent root shock.

**Example 2: Software Engineering Code Review**
*Context:* A senior dev comments, "When parsing these large CSVs, I've noticed Polars chokes if you don't define the schema beforehand because it tries to infer types by scanning the whole file, which blows up memory."
*   **Subject:** Data Engineering (Python)
*   **Information Chunk:** Polars dataframe library suffers severe memory bottlenecks during large CSV ingestion due to full-file type inference overhead.
*   **Actionable Workflow:** Always explicitly define the \`schema\` parameter or use \`schema_overrides\` when reading large CSV files in Polars to bypass type inference, saving memory and improving pipeline execution time.

---

### **Expected Output Format**

You MUST return the final output strictly as a JSON array of objects. Do not include markdown code blocks, conversational filler, or introductory text outside of the JSON array. The JSON keys must match the schema below exactly:

[
  {
    "subject": "String (e.g., Crop Nutrition, Data Engineering)",
    "information_chunks": "String (A detailed synthesis of the tacit knowledge and relationships)",
    "actionable_workflows": "String (A clear, step-by-step action plan or directive based on the knowledge)"
  }
]

Please process the provided input now based on these instructions.`;

const TacitInputParsingInstructions = {
    'whatsapp-export-zip': "Extract the .txt chat file from the archive. Ignore timestamps, phone numbers, system messages, and '<Media omitted>' tags. Focus on Q&A exchanges, problem-solving threads, and advice shared between members.",
    'youtube-link': 'First obtain the full transcript of the video, using any available tool (web browsing, a YouTube transcript or captions fetcher, or audio transcription). Do not rely on the title, description, or your own memory of the video. If you cannot obtain the transcript with your tools, return an empty JSON array [] and nothing else. Then ignore sponsor segments, intro/outro boilerplate, and auto-generated filler words. Focus on spoken explanations, personal anecdotes, and step-by-step demonstrations of techniques.',
    'website-link': 'Extract the primary article body or forum comments. Strip out navigation menus, footers, sidebars, and ads. Focus on author opinions, case studies, undocumented tips, and user-generated solutions in comment sections.',
    zip: 'Iterate through the readable text or document files within the archive. Ignore system files, images, or formatting metadata. Focus on extracting standard operating procedures, internal communications, and project notes.',
    txt: 'Read the raw text content. Filter out repetitive structural formatting, boilerplate headers, or logs. Focus on the core narrative, troubleshooting steps, heuristics, or direct advice provided in the text.',
    csv: 'Parse the tabular data, specifically targeting columns containing free-text comments, notes, descriptions, or feedback. Ignore purely numerical or ID columns. Focus on subjective observations, manual overrides, or exceptions noted in the text fields.',
    pdf: 'Read the text of every page in order. If a page has no text layer (a scanned page), perform OCR on it. Ignore running headers and footers, page numbers, tables of contents, and repeated boilerplate. Focus on the core narrative, troubleshooting steps, heuristics, and direct advice; transcribe the relationships in any diagrams or tables that carry them.',
    image: 'Perform OCR to extract readable text. If the image contains a diagram, flowchart, or handwritten notes, transcribe the relationships and annotations. Focus on unwritten heuristics, decision points, or marginalia.'
};

export const TacitInputTypeLabels = {
    'whatsapp-export-zip': 'WhatsApp chat export (.zip)',
    'youtube-link': 'YouTube link',
    'website-link': 'Website link',
    zip: 'Archive (.zip)',
    txt: 'Text file (.txt)',
    csv: 'CSV file (.csv)',
    pdf: 'PDF file (.pdf)',
    image: 'Image'
};

export const TacitLinkInputTypes = ['youtube-link', 'website-link'];

export const buildTacitPrompt = ({ inputType, subjectCategory, specialty, inputLink, template = DEFAULT_TACIT_PROMPT }) => {
    const inputLabel = TacitInputTypeLabels[inputType] || 'Not selected';
    const link = TacitLinkInputTypes.includes(inputType) ? inputLink?.trim() : '';
    const parsingInstructions = TacitInputParsingInstructions[inputType] || 'Select an input type to receive parsing instructions.';
    const subject = subjectCategory || 'Not selected';
    const specialtyLabel = specialty?.trim();
    const subjectRule = `*   Use \`${subject}\` as the subject category for every extracted record. Do not create a different subject category.`;
    const rule = specialtyLabel
        ? `${subjectRule}\n*   Set the \`specialty\` of every extracted record to \`${specialtyLabel}\`, and extract only knowledge that falls within this specialty of the subject. Ignore knowledge outside it.`
        : subjectRule;
    return template
        .replace(/\*\*Input Type:\*\*.*/, () => `**Input Type:** ${inputLabel}`)
        .replace(/\*\*Input Parsing Instructions:\*\*.*/, () => `**Input Parsing Instructions:** ${parsingInstructions}${link ? `\n\n**Input Link:** ${link}` : ''}`)
        .replace('### **Role & Objective**', () => `**Subject Category (Channel):** ${subject}\n${specialtyLabel ? `**Specialty:** ${specialtyLabel}\n` : ''}\n### **Role & Objective**`)
        .replace('*   Keep the tags broad enough to group related knowledge but specific enough to be useful.', () => rule)
        .replace(/^( *)"subject": .*$/m, (line, indent) => (specialtyLabel ? `${line}\n${indent}"specialty": ${JSON.stringify(`String (Set to \`${specialtyLabel}\`)`)},` : line));
};
