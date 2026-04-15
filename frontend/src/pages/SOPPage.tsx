import { useState } from 'react'
import { useParams } from 'react-router-dom'
import {
  Zap, Package, BookOpen, Download, ExternalLink, Copy, Check,
  ChevronDown, Terminal, ShoppingBag, Code, FileText, Sparkles,
  Video, Image as ImageIcon, Mic, Bot, ArrowRight, Play,
  Search as SearchIcon, FileEdit, PenTool, Eye, Award, MessageSquare
} from 'lucide-react'
import clsx from 'clsx'

type Section = 'claude-code' | 'toolkit' | 'guides' | 'advertorial'

interface GuideStep {
  title: string
  content: string
  code?: string
}

const CLAUDE_CODE_STEPS: GuideStep[] = [
  {
    title: '1. Install Claude Code CLI',
    content: 'Install Claude Code globally on your machine. Works on macOS, Linux, and Windows.',
    code: 'npm install -g @anthropic-ai/claude-code',
  },
  {
    title: '2. Install Shopify CLI',
    content: 'You also need the Shopify CLI to manage your store from the terminal.',
    code: 'npm install -g @shopify/cli @shopify/theme',
  },
  {
    title: '3. Connect to your Shopify store',
    content: 'Authenticate with your Shopify store to start making changes.',
    code: 'shopify auth login --store your-store.myshopify.com',
  },
  {
    title: '4. Pull your theme',
    content: 'Download your current theme files to edit locally.',
    code: 'shopify theme pull --store your-store.myshopify.com',
  },
  {
    title: '5. Launch Claude Code in your theme folder',
    content: 'Open Claude Code in the theme directory. It will understand your Liquid templates, CSS, and JS.',
    code: 'cd your-theme-folder && claude',
  },
  {
    title: '6. Ask Claude to make changes',
    content: 'Now you can ask Claude Code to modify your store in natural language. Examples:',
    code: `# Examples of what you can ask:
"Add a countdown timer to the product page"
"Create a sticky add-to-cart bar"
"Optimize the homepage hero section for mobile"
"Add a size guide modal to all product pages"
"Create a custom collection page with filters"
"Add trust badges below the add-to-cart button"`,
  },
  {
    title: '7. Preview & Push changes',
    content: 'Preview your changes locally, then push to your live store.',
    code: `# Preview locally
shopify theme dev

# Push to your store
shopify theme push`,
  },
]

const TOOLKIT_ITEMS = [
  {
    name: 'CreativeGen Prompt Pack',
    desc: '500+ tested prompts for product photography, ad creatives, and social media.',
    format: 'PDF',
    size: '2.4 MB',
    icon: FileText,
    color: 'text-brand-400',
  },
  {
    name: 'Shopify Theme Snippets',
    desc: 'Copy-paste Liquid snippets for countdown timers, trust badges, upsells, and more.',
    format: 'ZIP',
    size: '850 KB',
    icon: Code,
    color: 'text-green-400',
  },
  {
    name: 'Ad Creative Templates (PSD/Figma)',
    desc: 'Editable templates for Instagram, Facebook, TikTok ads — all formats included.',
    format: 'ZIP',
    size: '48 MB',
    icon: ImageIcon,
    color: 'text-purple-400',
  },
  {
    name: 'Video Ad Scripts',
    desc: '30 UGC-style video scripts optimized for ecommerce — hooks, CTAs, and transitions.',
    format: 'PDF',
    size: '1.1 MB',
    icon: Video,
    color: 'text-blue-400',
  },
  {
    name: 'Voice Over Scripts Pack',
    desc: '50 voiceover scripts for product demos, ads, and stories. Multi-language.',
    format: 'PDF',
    size: '980 KB',
    icon: Mic,
    color: 'text-pink-400',
  },
  {
    name: 'Claude Code Cheat Sheet',
    desc: 'Quick reference for all Claude Code commands, shortcuts, and Shopify integration tips.',
    format: 'PDF',
    size: '520 KB',
    icon: Terminal,
    color: 'text-cyan-400',
  },
]

const GUIDES = [
  {
    title: 'How to Generate Product Photos That Convert',
    desc: 'Step-by-step guide to using the Image Generator for ecommerce product photography.',
    duration: '8 min read',
    category: 'Images',
    link: '/generate',
    content: `**Step 1: Upload your reference image**
Upload a clean photo of your product on a white or neutral background. The better the original, the better the AI output. Avoid blurry or low-res images.

**Step 2: Write a strong prompt**
Be specific. Instead of "product on table", write "premium skincare bottle on white marble surface, soft studio lighting, luxury aesthetic, close-up product photography, 8K".

**Step 3: Choose the right model**
- **Flux Dev** — Best for final creatives (higher quality, slower)
- **Flux Schnell** — Great for previewing ideas quickly
- **Flux Realism** — Best for photorealistic product shots
- **Ideogram** — Use when you need text in the image (headlines, CTAs)

**Step 4: Use Multi-Prompt mode**
Add 3-5 different prompts to generate variety. For example:
1. "Product on white marble, studio lighting"
2. "Product in lifestyle setting, kitchen counter, morning light"
3. "Product flat lay with flowers, top-down photography"

**Step 5: Select format**
- **1:1** — Instagram feed, Shopify product images
- **9:16** — Instagram Stories, TikTok, Reels
- Use both formats to cover all platforms at once

**Step 6: Generate & Download**
Set variant count to 10+ for A/B testing. Download the ZIP with all variants and test which performs best in your ads.

**Pro Tips:**
- Always generate at least 10 variants — you can't predict which will perform best
- Use the same prompt with different seeds for subtle variations
- The "count" slider creates variations with different seeds automatically`,
  },
  {
    title: 'Scaling Facebook Ads with AI Creatives',
    desc: 'Strategy for using Ad Genius + bulk generation to test 50+ creatives per week.',
    duration: '12 min read',
    category: 'Ads',
    link: '/ad-genius',
    content: `**The Creative Testing Framework**

Most Facebook ad accounts fail because they don't test enough creatives. The top ecommerce brands test 50-100+ creatives per week. With CreativeGen, you can do this in minutes.

**Step 1: Spy on competitors with Ad Genius**
Go to Ad Genius → Upload a screenshot of a competitor's winning ad → AI breaks down the hook, pain point, emotional trigger, CTA type, and visual style.

**Step 2: Generate ad copy variations**
Click "Generate Variations" → Enter your brand name, product, and target audience → Choose a tone (Aggressive for FOMO, Soft for trust-building) → Get 3 copy variations with headline + body + CTA.

**Step 3: Generate image creatives**
Upload your product image → Use the analysis to inform your prompt. For example, if the competitor uses "urgency + limited stock", your prompt should be: "product photography, urgent promotional feel, limited edition badge, bold colors, sale aesthetic".

**Step 4: Bulk generate**
Use the Image Generator with multi-prompt to create 10+ variants per prompt. With 5 prompts × 10 variants = 50 creatives in one batch.

**Step 5: Launch & test**
Upload all 50 creatives to Facebook Ads Manager → Create a CBO campaign with 1 ad set → Put each creative in its own ad → Let Facebook's algorithm find the winners.

**Scaling rules:**
- Kill ads under 1% CTR after 1,000 impressions
- Scale winners by duplicating into new ad sets at 2x budget
- Refresh creatives every 7-10 days (creative fatigue)
- Use the KPIs table in Meta Ads Library to benchmark your performance by country

**Budget framework:**
- Testing: €10-20/day per ad set
- Scaling: Move winners to €50-100/day
- Always keep 30% of budget on testing new creatives`,
  },
  {
    title: 'UGC Video Ads on TikTok — Complete Workflow',
    desc: 'From AI Avatar to Voice Generator to Video — create UGC-style ads without influencers.',
    duration: '10 min read',
    category: 'Video',
    link: '/avatar',
    content: `**Why UGC-style ads work**
User-generated content (UGC) style ads get 4x higher CTR than polished brand content on TikTok. They feel authentic and native to the platform. With CreativeGen, you can create UGC-style ads without hiring creators.

**Step 1: Create your AI Avatar**
Go to AI Avatar → Choose "Generate from Config" → Set age to "Young (20s)", style to "Casual" or "Influencer", setting to "Home / Lifestyle", interaction to "Talking to Camera".

Upload a product image so the avatar interacts with your product.

**Step 2: Write the script**
Write a 15-30 second script using this framework:
- **Hook (0-3s):** "I can't believe this actually works..." / "POV: you just found the best..."
- **Problem (3-8s):** State the pain point your audience has
- **Solution (8-18s):** Show how your product solves it
- **CTA (18-25s):** "Link in bio" / "Use code X for 20% off"

**Step 3: Generate the voice**
Go to Voice Generator → Paste your script → Choose a natural voice (Ava HD or Andrew HD for English, Thalita HD for Portuguese). Set speed to "Normal" or slightly "Fast" for TikTok energy.

**Step 4: Generate the video**
The AI Avatar will generate a video of your spokesperson. Toggle "Generate video" ON.

**Step 5: Combine & post**
Download the video + audio separately. Combine in CapCut or any video editor. Add captions (TikTok auto-captions work great). Post!

**Best practices for TikTok:**
- Keep it under 30 seconds
- First 3 seconds are everything — use a strong hook
- Vertical 9:16 format only
- Add captions — 80% of TikTok is watched on mute
- Post 3-5 times per day for best reach`,
  },
  {
    title: 'Jewellery Photography Masterclass',
    desc: 'Best practices for ring, necklace, and bracelet photography using the Jewellery Ads tool.',
    duration: '6 min read',
    category: 'Jewellery',
    link: '/jewellery',
    content: `**Jewellery is the hardest product to photograph well.** Reflections, tiny details, and the need to convey luxury make it challenging. The Jewellery Ads tool is designed specifically for this.

**Choosing the right scene:**
- **Studio White** — Best for Shopify product pages, clean ecommerce listings
- **Studio Dark** — Best for luxury brands, creates drama and contrast
- **Marble Surface** — Great for Instagram posts, sophisticated feel
- **Velvet Box** — Perfect for gift-related marketing (Valentine's, Christmas)
- **On Model** — Best for showing scale and how the piece looks when worn

**Choosing the right style:**
- **Luxury** — For high-end pieces, gold/diamond jewellery
- **Minimal** — For modern/delicate pieces, everyday jewellery
- **Editorial** — For brand campaigns, lookbook-style content
- **Lifestyle** — For social media, relatable product shots

**Scenario Creator — campaign photography:**
Use the Scenario Creator tab for seasonal campaigns:
- **Valentine's Day** — Red roses, romantic setting, gift box
- **Christmas** — Gold ornaments, festive lighting, ribbon
- **Beach Sunset** — Summer collection, bohemian vibes
- **Cherry Blossom** — Spring collection, delicate feminine feel

**Cards Creator — social media posts:**
Use the Cards Creator tab to make Instagram-ready posts:
- Upload your product photo as background
- Add promotional cards with headlines like "NEW COLLECTION" or "50% OFF"
- Choose color theme (Gold & Black for luxury, Rose Gold for feminine)
- Download as PNG, ready to post

**Pro tips:**
- Always shoot your original product on a plain white background with good lighting
- Generate at least 8 variants per product — different angles sell differently
- For rings, the "On Model (Hand)" scene converts best on social media
- Use the "Macro" prompt keyword for close-up detail shots`,
  },
  {
    title: 'Setting Up Your Brand Kit',
    desc: 'Configure colors, fonts, and logo once — apply everywhere automatically.',
    duration: '4 min read',
    category: 'Brand',
    link: '/brand-kit',
    content: `**Your Brand Kit is the foundation of consistent branding.** Set it up once and it automatically feeds into Ad Creator, Mockups, and other tools.

**Step 1: Add your logo**
Upload your logo in PNG or SVG format. Transparent backgrounds work best. This appears in your ad creatives and mockups.

**Step 2: Set your brand colors**
- **Primary** — Your main brand color (used for CTAs, highlights)
- **Secondary** — Supporting color (used for backgrounds, accents)
- **Accent** — For text or subtle highlights

Color psychology tips:
- 🔴 Red = urgency, sale, energy
- 🟡 Gold/Yellow = premium, luxury, attention
- 🔵 Blue = trust, reliability, tech
- 🟢 Green = natural, organic, health
- 🟣 Purple = luxury, creativity, premium
- ⚫ Black = elegance, power, luxury

**Step 3: Choose fonts**
- **Heading font** — Playfair Display for luxury, Montserrat for modern, Oswald for bold
- **Body font** — Inter for clean, Lato for friendly, Roboto for neutral

**Step 4: Add your tagline**
A short memorable phrase that captures your brand. Examples:
- "Timeless Elegance" (jewellery)
- "Move Different" (fashion)
- "Pure Performance" (fitness)

**The preview card** at the top shows how your brand looks in real-time as you make changes. Everything auto-saves to localStorage.`,
  },
  {
    title: 'Competitor Research with Meta Ads Library',
    desc: 'How to find winning ads, analyze hooks, and generate better variations.',
    duration: '9 min read',
    category: 'Strategy',
    link: '/ad-library',
    content: `**The Meta Ads Library is the most powerful free spy tool available.** Every active ad on Facebook and Instagram is publicly visible. Here's how to use it strategically.

**Step 1: Search competitors by name**
Type your competitor's brand name in the search bar. Select their country. Click Search. You'll see ALL their active ads.

**Step 2: Identify winning ads**
Look for ads that have been running for 30+ days. If an ad is still active after a month, it's almost certainly profitable. That's a winner worth studying.

**Step 3: Analyze the pattern**
For each winning ad, note:
- **The hook** — What makes you stop scrolling?
- **The visual style** — Product-focused? Lifestyle? UGC?
- **The CTA** — Shop Now? Limited Time? Free Shipping?
- **The copy length** — Short punchy or long-form story?

**Step 4: Use the Keywords**
Our keyword database (organized by country) helps you find competitor stores:
- Search ".fr/products" to find French stores
- Search "Kostenloser Versand" to find German stores offering free shipping
- Search "última oportunidad" to find Spanish urgency-based ads

**Step 5: Check KPIs**
Use the KPI table to benchmark your performance:
- If your CPC in Germany is above €0.51 → your creative needs work
- If your CTR is below 1.5% → your hook isn't strong enough
- If your ROAS is below 3x → check your landing page conversion rate

**Step 6: Generate your own variations**
Take screenshots of winning ads → Go to Ad Genius → Upload → Get AI analysis → Generate copy and image variations adapted to YOUR brand.

**Weekly routine:**
1. Monday: Research 10 competitor ads
2. Tuesday: Analyze top 3 with Ad Genius
3. Wednesday: Generate 30+ creative variations
4. Thursday: Launch testing campaigns
5. Friday: Check results, kill losers, scale winners`,
  },
  {
    title: 'Bulk Collage Generation for Social Media',
    desc: 'Create 50+ collage variations in minutes for A/B testing.',
    duration: '5 min read',
    category: 'Collage',
    link: '/collage',
    content: `**Collages are perfect for showcasing multiple products or angles in a single image.** Instagram carousels, Pinterest pins, and Facebook ads all benefit from collage layouts.

**Step 1: Upload your images**
Upload 3-6 product images. Mix angles — front, side, close-up, lifestyle. The more variety, the better your collages will look.

**Step 2: Set your hero image**
Click the star icon on the image you want featured prominently. The hero image gets the largest position in layouts like "Featured", "Hero Left", and "Hero Top".

**Step 3: Preview layouts**
Switch between layouts to see how your images look in each one:
- **Grid 2×2** — Equal 4-image grid, great for collections
- **Featured** — 1 big + 2 small, highlights a hero product
- **Hero Left** — Large left + stacked right, magazine style
- **Mosaic** — Asymmetric Pinterest-style, modern feel
- **Filmstrip** — Horizontal strip, perfect for carousels

**Step 4: Use Bulk Mode**
Switch to "Bulk" in the top right:
1. Select multiple layouts (5 recommended)
2. Set variants to 3 (each variant shuffles image order)
3. That gives you 15 unique collages in one click
4. Adjust format (1:1 for Instagram, 9:16 for Stories)
5. Click "Generate 15 Collages"

**Step 5: Download and test**
Each collage shows a label on hover (layout + variant number). Download individually or use them in your ad campaigns.

**Best practices:**
- Use consistent lighting across all images in a collage
- 1:1 format for Instagram/Facebook feed
- 9:16 format for Stories/Reels/TikTok
- The "Hero Top" layout converts best for product showcase ads
- Generate with gap=0 for a seamless look, or gap=4-8 for a framed feel`,
  },
  {
    title: 'Voice Cloning for Ad Voiceovers',
    desc: 'Clone your voice or a brand voice to create consistent ad narrations.',
    duration: '7 min read',
    category: 'Voice',
    link: '/voice',
    content: `**Consistent voice branding is as important as visual branding.** With Voice Generator, you can create professional voiceovers for every ad, video, and product demo.

**Free Voices (Edge TTS):**
The free tier includes 37+ voices across 12+ languages. The **HD Multilingual** voices (marked with "HD" badge) sound the most natural:
- **Ava HD** — Warm, friendly female American voice
- **Andrew HD** — Deep, professional male American voice
- **Thalita HD** — Versatile female Brazilian Portuguese voice

These are great for product demos, ad voiceovers, and social media.

**Voice Cloning (Pro — F5-TTS):**
With the Pro plan, you can clone ANY voice:

**Step 1: Record a sample**
Record 10-20 seconds of clear speech. Tips:
- Quiet room, no background noise
- Speak naturally at your normal pace
- Read a paragraph of text (not just a few words)
- Use a decent microphone (even phone mic works if close enough)

**Step 2: Upload**
Go to Voice Generator → Click "Clone" tab → Upload your WAV or MP3 file

**Step 3: Type your script**
Write the text you want the cloned voice to say. The AI will reproduce your voice speaking this new text.

**Step 4: Generate & Download**
Click Generate → Preview → Download MP3

**Use cases:**
- **Brand consistency** — Clone your brand voice for all ads
- **Multi-language** — Record in English, clone to speak Portuguese (the voice characteristics transfer)
- **Scale content** — Record once, generate 100 different scripts
- **A/B test voices** — Try different voices to see which converts best

**Script writing tips for voiceovers:**
- Keep sentences short (8-12 words max)
- Use "..." for natural pauses
- Write how you speak, not how you write
- Front-load the hook — first 3 seconds matter most
- End with a clear CTA: "Shop now at [store].com"`,
  },
]

interface AdvertorialStep {
  step: number
  title: string
  icon: any
  color: string
  description: string
  prompts: { label: string; text: string; action?: string }[]
}

const ADVERTORIAL_STEPS: AdvertorialStep[] = [
  {
    step: 1,
    title: 'Research',
    icon: SearchIcon,
    color: 'text-blue-400',
    description: 'Deep-dive into your product, market, and competitors. Use ChatGPT 5.4 for this step to leverage deep research capabilities.',
    prompts: [
      {
        label: 'Prompt #1 — Analyze Sales Page',
        text: `You are my expert copywriter and you specialize in writing highly persuasive direct response style copy for my ecommerce brand that sells [EXPLAIN WHAT YOU'RE SELLING AND TO WHO]. I'm going to send you a PDF screenshot of my current sales page, and I want you to analyze it and please let me know your thoughts.`,
        action: 'Upload PDF of your sales page after sending this prompt.',
      },
      {
        label: 'Prompt #2 — Learn Research Methods',
        text: `Great work! I'm going to send you two documents that teach how to do deep research for your product in order to effectively write highly persuasive copy. Please analyze them and let me know your thoughts:`,
        action: 'Upload the two research methodology documents.',
      },
      {
        label: 'Prompt #3 — Generate Deep Research Prompt',
        text: `Great, now that you properly understand how to conduct research, I want you to create a full prompt for Open AI's new tool called deep research to actually conduct this research for the [ENTER THE PRODUCT YOU'RE SELLING]. Please be as specific as possible here in order to get the best quality research. Please include that you want deep research to compile all of the research found into a doc as well, and it should be a minimum of 6 pages worth of research.`,
      },
      {
        label: 'Prompt #4 — Execute Deep Research',
        text: `Great!\n\n[SEND FULL PROMPT THAT GPT JUST CREATED BACK INTO GPT]\n[ANSWER ANY CLARIFYING QUESTIONS IN THE NEXT MESSAGE]\n[COPY AND PASTE ALL THAT RESEARCH INTO ITS OWN DOC, AND DOWNLOAD IT. THIS IS ONE OF YOUR FOUNDATIONAL DOCS]`,
      },
    ],
  },
  {
    step: 2,
    title: 'Foundational Docs',
    icon: FileText,
    color: 'text-green-400',
    description: 'Build the 4 essential documents: Avatar Sheet, Offer Brief, Research Doc, and Necessary Beliefs. These form the foundation of your advertorial.',
    prompts: [
      {
        label: 'Prompt #1 — Avatar Sheet',
        text: `Amazing work! Now that you have properly completed the research portion, I want you to please complete this Avatar sheet template:`,
        action: 'Attach the Avatar Sheet template. Copy output into its own doc and download.',
      },
      {
        label: 'Prompt #2 — Offer Brief',
        text: `Great work! Now that you've finished that, I want you to complete this offer brief document template for this product:`,
        action: 'Attach the Offer Brief template. Copy output into its own doc and download.',
      },
      {
        label: 'Prompt #3 — Copywriting Philosophy (Transcript)',
        text: `Great work! Now, please analyze this transcript and let me know your thoughts:\n\nPlease analyze this full video transcript and let me know your thoughts: [PASTE THE FULL TRANSCRIPT ABOUT THE AGORA COPYWRITING METHOD — "MAGNIFICENT ARGUMENTS OVER MAGNIFICENT WORDS"]`,
        action: 'This teaches the AI the Agora approach: craft compelling arguments, not just compelling words. Structure > word choice.',
      },
      {
        label: 'Prompt #4 — Necessary Beliefs',
        text: `Great work! Now that you understand that marketing at its core is simply about changing the existing beliefs of a customer into the beliefs that align with them empowering them to purchase our product, I want you to please analyze the following documents about my prospect and write out the few absolutely necessary beliefs that a prospect must have before purchasing my product. It should be no more than 6 beliefs. I also want you to structure these as "I believe that…" statements. Go ahead.`,
        action: 'Attach Avatar Sheet, Offer Brief, and Research docs. Copy output into its own doc.',
      },
      {
        label: 'Prompt #5 — Final Summary Review',
        text: `Great work! Now I feel that at this level, you have a phenomenal understanding of our prospect, the market, the offer, and the necessary beliefs. One last time, I'm going to have you do a brief summary of each of these documents to jog your memory about everything we've learned so far. Please analyze each doc attached and let me know your thoughts.`,
        action: 'Attach all 4 foundational docs: Avatar Sheet, Offer Brief, Research Doc, Necessary Beliefs Doc.',
      },
    ],
  },
  {
    step: 3,
    title: 'Swipe',
    icon: Eye,
    color: 'text-purple-400',
    description: 'Switch to Claude (Sonnet 4.6 or Opus). Upload all foundational docs to build context, then analyze a winning competitor advertorial as your swipe file.',
    prompts: [
      {
        label: 'Prompt #1 — Upload Foundational Docs to Claude',
        text: `Hey, Claude, I want you to please analyze the four documents that I've attached to this message. I've done a significant amount of research of a product that I'm going to be selling, and it's your role as my direct response copywriter to understand this research, the avatar document, the offer brief, and the necessary beliefs document to an extremely high degree. So please familiarize yourself with these documents before we proceed with writing anything.`,
        action: 'Attach all 4 foundational docs. This is where you switch from ChatGPT to Claude.',
      },
      {
        label: 'Prompt #2 — Analyze Swipe Advertorial',
        text: `Excellent work. Now we're going to be writing an advertorial, which is a type of pre-sales page designed to nurture customers before they actually see the main product offer page. I'm going to send you an indirect competitor with a very successful advertorial, and I want you to please analyze this advertorial and let me know your thoughts:`,
        action: 'Attach PDF version of swipe advertorial from your swipe file.',
      },
    ],
  },
  {
    step: 4,
    title: 'Write',
    icon: PenTool,
    color: 'text-amber-400',
    description: 'Write the actual advertorial in two halves. The AI will use all the research and swipe analysis to craft a persuasive pre-sales page.',
    prompts: [
      {
        label: 'Prompt #1 — Write First Half',
        text: `Great, now I want you to please rewrite this advertorial but using all of the information around the [INSERT PRODUCT YOU'RE SELLING HERE]. I want you to specifically focus on [INSERT MAIN ANGLE YOU WANT THE ADVERTORIAL TO BE ON HERE]. For now, just write the first half of the advertorial, I'll approve it, then I will tell you to write the second half. Go ahead.`,
      },
      {
        label: 'Prompt #2 — Write Second Half',
        text: `Great work!! Let's continue onto the second half.`,
      },
    ],
  },
  {
    step: 5,
    title: 'Chief',
    icon: Award,
    color: 'text-red-400',
    description: 'Review and critique the completed advertorial against all the research to ensure alignment with avatar, beliefs, objections, and competitive positioning.',
    prompts: [
      {
        label: 'Prompt #1 — Final Review',
        text: `Amazing! I'm going to send you the full advertorial that I just completed. I want you to please analyze it and let me know your thoughts. I would specifically analyze how in line all of the copy is in relation to all the research amongst the avatar, the competitors, the research, necessary beliefs, levels of consciousness, the objections, etc., that you did earlier.`,
      },
    ],
  },
]

const BONUS_PROMPTS = [
  {
    label: 'Bonus #1 — New Angle Advertorial (First Half)',
    text: `Amazing work!! Now I want you to write an entirely separate advertorial for this same product and market, but instead [TALK SPECIFICALLY ABOUT THE ALTERNATE ANGLES THAT'LL APPEAL TO DIFFERENT AVATARS HERE, AND GO INTO AS MUCH DETAIL AS YOU POSSIBLY CAN.] Let's follow the same process as last time, just write the first half first, then the second half after I approve the first half.`,
  },
  {
    label: 'Bonus #2 — New Angle Advertorial (Second Half)',
    text: `Amazing work! You can go ahead and write the second half now.`,
  },
]

export default function SOPPage() {
  const { section } = useParams<{ section: string }>()
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null)
  const [expandedGuide, setExpandedGuide] = useState<number | null>(null)
  const [expandedStep, setExpandedStep] = useState<number | null>(0)

  const activeSection = (section || 'claude-code') as Section

  const copyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code)
    setCopiedIdx(idx)
    setTimeout(() => setCopiedIdx(null), 2000)
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      {/* ── Claude Code + Shopify ── */}
      {activeSection === 'claude-code' && (
        <>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">Claude Code + Shopify</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-400 rounded-full">SOP</span>
            </div>
            <p className="text-gray-400 text-sm">Use AI to build and customize your Shopify store from the terminal. No coding experience needed.</p>
          </div>

          {/* What you can do */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Edit theme', icon: Code, desc: 'Modify Liquid templates' },
              { label: 'Add features', icon: Sparkles, desc: 'Countdown, upsells, etc' },
              { label: 'Fix bugs', icon: Zap, desc: 'Debug & troubleshoot' },
              { label: 'Optimize', icon: ShoppingBag, desc: 'Speed & conversion' },
            ].map(item => (
              <div key={item.label} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
                <item.icon size={20} className="mx-auto text-cyan-400 mb-2" />
                <p className="text-xs font-semibold text-white">{item.label}</p>
                <p className="text-[10px] text-gray-500 mt-0.5">{item.desc}</p>
              </div>
            ))}
          </div>

          {/* Steps */}
          <div className="space-y-4">
            {CLAUDE_CODE_STEPS.map((step, i) => (
              <div key={i} className="rounded-xl border border-white/[0.06] overflow-hidden">
                <div className="px-5 py-4">
                  <h3 className="text-sm font-bold text-white mb-1">{step.title}</h3>
                  <p className="text-xs text-gray-400 leading-relaxed">{step.content}</p>
                </div>
                {step.code && (
                  <div className="relative bg-[#0a0a12] border-t border-white/[0.04] px-5 py-3">
                    <pre className="text-xs text-cyan-300 font-mono whitespace-pre-wrap leading-relaxed overflow-x-auto">{step.code}</pre>
                    <button
                      onClick={() => copyCode(step.code!, i)}
                      className="absolute top-2 right-3 p-1.5 rounded-md bg-white/[0.05] text-gray-500 hover:text-white transition-colors"
                    >
                      {copiedIdx === i ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/15">
            <Bot size={20} className="text-cyan-400 flex-shrink-0" />
            <p className="text-xs text-gray-300 leading-relaxed">
              <strong className="text-white">Pro tip:</strong> Claude Code understands your entire codebase. You can ask complex questions like
              "Why is my cart page loading slowly?" and it will analyze your theme files and suggest fixes.
            </p>
          </div>
        </>
      )}

      {/* ── AI Advertorial SOP ── */}
      {activeSection === 'advertorial' && (
        <>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">Full AI Advertorial Process</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 rounded-full">SOP</span>
            </div>
            <p className="text-gray-400 text-sm">
              A 5-step process to create high-converting advertorials using AI. Start with ChatGPT for research, then switch to Claude for writing.
            </p>
          </div>

          {/* Required documents downloads */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden">
            <div className="px-5 py-3 border-b border-white/[0.04] bg-white/[0.02]">
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <Download size={13} className="text-amber-400" /> Required Templates & Documents
              </h3>
              <p className="text-[10px] text-gray-500 mt-0.5">Download these before starting the process. You'll need them at various steps.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 divide-y sm:divide-y-0 sm:divide-x divide-white/[0.04]">
              {[
                {
                  name: 'Research Doc #1',
                  desc: 'How to conduct deep product research for persuasive copy',
                  step: 'Step 1, Prompt #2',
                  color: 'text-blue-400',
                  bg: 'bg-blue-500/10',
                  url: 'https://docs.google.com/document/d/1KRen0cDmKKMuhQwqJGbGP3VYFJmPUPJQa-m0HBfVXJE/edit?tab=t.0',
                },
                {
                  name: 'Research Doc #2',
                  desc: 'Advanced research techniques for direct response copywriting',
                  step: 'Step 1, Prompt #2',
                  color: 'text-blue-400',
                  bg: 'bg-blue-500/10',
                  url: 'https://docs.google.com/document/d/1vYrddGKjRu2FBNQ-BZwUE4Fl2Nv2C6hsf2v2M0jwFiE/edit?tab=t.0',
                },
                {
                  name: 'Avatar Sheet Template',
                  desc: 'Customer persona template — demographics, pain points, desires',
                  step: 'Step 2, Prompt #1',
                  color: 'text-green-400',
                  bg: 'bg-green-500/10',
                  url: 'https://docs.google.com/document/d/1QoJgND9R-HEdro-QL5VkuoUqVgVhQ7tUz4cqJFpgxeY/edit?tab=t.0',
                },
                {
                  name: 'Offer Brief Template',
                  desc: 'Product offer breakdown — features, benefits, unique mechanism',
                  step: 'Step 2, Prompt #2',
                  color: 'text-green-400',
                  bg: 'bg-green-500/10',
                  url: 'https://docs.google.com/document/d/1Bs7GEhNDh2AKdPY5Kzts0FJlkm5xvOKYm0uDXpXJN8M/edit?tab=t.0',
                },
                {
                  name: 'Advertorial Swipe File',
                  desc: 'Collection of winning advertorials to use as swipe references',
                  step: 'Step 3, Prompt #2',
                  color: 'text-purple-400',
                  bg: 'bg-purple-500/10',
                  url: 'https://www.gethookd.co/advertorial-swipe-file',
                },
                {
                  name: 'Video Walkthrough',
                  desc: 'Full video tutorial of this entire advertorial process',
                  step: 'All Steps',
                  color: 'text-red-400',
                  bg: 'bg-red-500/10',
                  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                },
              ].map((doc, i) => (
                <a
                  key={i}
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 px-4 py-3.5 hover:bg-white/[0.03] transition-colors group"
                >
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', doc.bg)}>
                    <Download size={14} className={doc.color} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-white group-hover:text-amber-300 transition-colors">{doc.name}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{doc.desc}</p>
                    <span className="text-[9px] text-gray-600 mt-1 inline-block">Used in: {doc.step}</span>
                  </div>
                  <ExternalLink size={12} className="text-gray-600 group-hover:text-gray-400 transition-colors mt-1 flex-shrink-0" />
                </a>
              ))}
            </div>
          </div>

          {/* Process overview */}
          <div className="flex items-center gap-1 overflow-x-auto pb-2">
            {ADVERTORIAL_STEPS.map((s, i) => (
              <button
                key={s.step}
                onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                className={clsx(
                  'flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all flex-shrink-0',
                  expandedStep === i
                    ? 'bg-white/[0.06] border-white/[0.12] shadow-lg'
                    : 'bg-white/[0.02] border-white/[0.06] hover:border-white/[0.1]',
                )}
              >
                <div className={clsx('w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-bold', expandedStep === i ? 'bg-white/[0.1]' : 'bg-white/[0.04]')}>
                  <s.icon size={13} className={s.color} />
                </div>
                <span className="text-xs font-medium text-white whitespace-nowrap">{s.step}. {s.title}</span>
              </button>
            ))}
          </div>

          {/* Tool switch notice */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-purple-500/5 border border-purple-500/15">
            <MessageSquare size={16} className="text-purple-400 flex-shrink-0" />
            <p className="text-[11px] text-gray-300 leading-relaxed">
              <strong className="text-white">Steps 1-2:</strong> Use ChatGPT 5.4 for research & foundational docs.{' '}
              <strong className="text-white">Steps 3-5:</strong> Switch to Claude (Sonnet 4.6 or Opus) for swipe analysis, writing & review.
            </p>
          </div>

          {/* Expanded step */}
          {expandedStep !== null && ADVERTORIAL_STEPS[expandedStep] && (() => {
            const step = ADVERTORIAL_STEPS[expandedStep]
            return (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center bg-white/[0.04]')}>
                    <step.icon size={20} className={step.color} />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Step {step.step}: {step.title}</h2>
                    <p className="text-xs text-gray-400">{step.description}</p>
                  </div>
                </div>

                {step.prompts.map((prompt, pi) => (
                  <div key={pi} className="rounded-xl border border-white/[0.06] overflow-hidden">
                    <div className="px-5 py-3 bg-white/[0.02] border-b border-white/[0.04] flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">{prompt.label}</span>
                      <button
                        onClick={() => copyCode(prompt.text, expandedStep * 100 + pi)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white text-[11px] transition-colors"
                      >
                        {copiedIdx === expandedStep * 100 + pi
                          ? <><Check size={11} className="text-green-400" /> Copied</>
                          : <><Copy size={11} /> Copy</>
                        }
                      </button>
                    </div>
                    <div className="px-5 py-4 bg-[#0a0a12]">
                      <pre className="text-xs text-amber-200/80 font-mono whitespace-pre-wrap leading-relaxed">{prompt.text}</pre>
                    </div>
                    {prompt.action && (
                      <div className="px-5 py-2.5 bg-amber-500/[0.03] border-t border-amber-500/10">
                        <p className="text-[11px] text-amber-400/80 flex items-center gap-1.5">
                          <ArrowRight size={10} /> {prompt.action}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })()}

          {/* Key concept callout */}
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/15 space-y-2">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <Sparkles size={13} className="text-blue-400" /> Key Concept: Arguments Over Words
            </h3>
            <p className="text-[11px] text-gray-400 leading-relaxed">
              The Agora copywriting philosophy at the core of this process: <strong className="text-gray-200">stop writing copy and start crafting arguments.</strong> It's
              not about power words like "astonishing" or "steroid-like." It's about presenting a rock-solid logical and emotional argument
              that leads the prospect to one conclusion — that your product is the unique, proprietary solution they need. Every sentence should lead them
              one step closer to the belief they need before seeing your offer.
            </p>
          </div>

          {/* Necessary beliefs explanation */}
          <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/15 space-y-2">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <FileText size={13} className="text-green-400" /> The 4 Foundational Documents
            </h3>
            <ul className="space-y-1.5 ml-1">
              {[
                { name: 'Research Doc', desc: 'Deep research on your product, market, competitors (6+ pages)' },
                { name: 'Avatar Sheet', desc: 'Detailed customer persona — demographics, pain points, desires, objections' },
                { name: 'Offer Brief', desc: 'Your product offer breakdown — features, benefits, unique mechanism, pricing' },
                { name: 'Necessary Beliefs', desc: '3-6 "I believe that..." statements the prospect must hold before purchasing' },
              ].map(doc => (
                <li key={doc.name} className="text-[11px] text-gray-400 flex items-start gap-2">
                  <span className="text-green-400 mt-0.5 font-bold">•</span>
                  <span><strong className="text-gray-200">{doc.name}:</strong> {doc.desc}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Bonus section */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Award size={15} className="text-amber-400" /> Bonus: Create Advertorials with New Angles
            </h3>
            <p className="text-xs text-gray-400">
              Once your first advertorial is done, create additional versions targeting different angles and avatars.
            </p>
            {BONUS_PROMPTS.map((prompt, pi) => (
              <div key={pi} className="rounded-xl border border-white/[0.06] overflow-hidden">
                <div className="px-5 py-3 bg-white/[0.02] border-b border-white/[0.04] flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">{prompt.label}</span>
                  <button
                    onClick={() => copyCode(prompt.text, 900 + pi)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white text-[11px] transition-colors"
                  >
                    {copiedIdx === 900 + pi
                      ? <><Check size={11} className="text-green-400" /> Copied</>
                      : <><Copy size={11} /> Copy</>
                    }
                  </button>
                </div>
                <div className="px-5 py-4 bg-[#0a0a12]">
                  <pre className="text-xs text-amber-200/80 font-mono whitespace-pre-wrap leading-relaxed">{prompt.text}</pre>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Toolkit Download ── */}
      {activeSection === 'toolkit' && (
        <>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">Toolkit Download</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-green-500/20 text-green-400 rounded-full">Free</span>
            </div>
            <p className="text-gray-400 text-sm">Templates, prompts, scripts, and snippets to supercharge your ecommerce creatives.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {TOOLKIT_ITEMS.map((item, i) => (
              <div key={i} className="flex items-start gap-4 p-4 rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] transition-all group">
                <div className={clsx('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-white/[0.04]')}>
                  <item.icon size={18} className={item.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white">{item.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05] text-gray-500">{item.format}</span>
                    <span className="text-[10px] text-gray-600">{item.size}</span>
                  </div>
                </div>
                <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/[0.05] text-gray-400 hover:text-white hover:bg-white/[0.1] text-xs transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0">
                  <Download size={13} /> Download
                </button>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-brand-500/5 border border-brand-500/15 text-center">
            <p className="text-xs text-gray-400">
              All toolkit items are <span className="text-brand-400 font-semibold">free for all plans</span>. New resources added monthly.
            </p>
          </div>
        </>
      )}

      {/* ── How-to Guides ── */}
      {activeSection === 'guides' && (
        <>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold">How-to Guides</h1>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-purple-500/20 text-purple-400 rounded-full">Learn</span>
            </div>
            <p className="text-gray-400 text-sm">Step-by-step tutorials for every tool in CreativeGen.</p>
          </div>

          <div className="space-y-2">
            {GUIDES.map((guide, i) => (
              <button
                key={i}
                onClick={() => setExpandedGuide(expandedGuide === i ? null : i)}
                className="w-full text-left rounded-xl border border-white/[0.06] bg-white/[0.02] hover:border-white/[0.1] transition-all overflow-hidden"
              >
                <div className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-white">{guide.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{guide.desc}</p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/[0.05] text-gray-500">{guide.category}</span>
                    <span className="text-[10px] text-gray-600">{guide.duration}</span>
                    <ChevronDown size={14} className={clsx('text-gray-600 transition-transform', expandedGuide === i && 'rotate-180')} />
                  </div>
                </div>
                {expandedGuide === i && guide.content && (
                  <div className="px-5 pb-5 border-t border-white/[0.04] pt-4 space-y-3">
                    {guide.content.split('\n\n').map((block, j) => {
                      if (block.startsWith('**') && block.endsWith('**')) {
                        return <h4 key={j} className="text-xs font-bold text-white mt-2">{block.replace(/\*\*/g, '')}</h4>
                      }
                      if (block.startsWith('**')) {
                        const parts = block.split('**')
                        return (
                          <div key={j}>
                            {parts.map((p, k) =>
                              k % 2 === 1
                                ? <span key={k} className="text-xs font-bold text-white">{p}</span>
                                : <span key={k} className="text-xs text-gray-400 leading-relaxed">{p}</span>
                            )}
                          </div>
                        )
                      }
                      if (block.startsWith('- ')) {
                        return (
                          <ul key={j} className="space-y-1 ml-2">
                            {block.split('\n').map((line, k) => (
                              <li key={k} className="text-xs text-gray-400 leading-relaxed flex items-start gap-1.5">
                                <span className="text-brand-400 mt-0.5">•</span>
                                {line.replace(/^- /, '').split('**').map((p, l) =>
                                  l % 2 === 1
                                    ? <span key={l} className="font-semibold text-gray-200">{p}</span>
                                    : <span key={l}>{p}</span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )
                      }
                      if (block.match(/^\d\./)) {
                        return (
                          <ol key={j} className="space-y-1 ml-2">
                            {block.split('\n').map((line, k) => (
                              <li key={k} className="text-xs text-gray-400 leading-relaxed flex items-start gap-1.5">
                                <span className="text-brand-400 font-bold mt-0.5">{line.match(/^\d/)?.[0]}.</span>
                                <span>{line.replace(/^\d+\.\s*/, '').split('**').map((p, l) =>
                                  l % 2 === 1
                                    ? <span key={l} className="font-semibold text-gray-200">{p}</span>
                                    : <span key={l}>{p}</span>
                                )}</span>
                              </li>
                            ))}
                          </ol>
                        )
                      }
                      return <p key={j} className="text-xs text-gray-400 leading-relaxed">{block}</p>
                    })}
                    {guide.link && (
                      <a href={guide.link} className="inline-flex items-center gap-1.5 mt-2 text-[11px] text-brand-400 hover:text-brand-300 font-medium transition-colors">
                        <ArrowRight size={11} /> Open {guide.category} tool
                      </a>
                    )}
                  </div>
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
